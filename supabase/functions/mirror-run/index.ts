import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Source {
  source_key: string;
  name: string;
  seeds: string[];
  allowed_hosts: string[];
  allowed_prefixes: string[];
  enabled: boolean;
}

interface QueueItem {
  url: string;
  source_key: string;
  depth: number;
  priority: number;
  fail_count: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "legal-mirror";
const MAX_PER_RUN = 30;
const MAX_DEPTH = 3;
const USER_AGENT = "LegalMirrorBot/1.0 (+https://cca.pt)";

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function isAllowed(url: string, source: Source): boolean {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    
    // Reject static assets early
    if (/\.(css|js|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|map)(\?|$)/i.test(u.href)) return false;
    if (pathname.includes('/css/') || pathname.includes('/js/') || pathname.includes('/assets/')) return false;
    
    // Check host match - allow files subdomain for DRE
    const hostMatch = source.allowed_hosts.some(h => 
      u.hostname === h || u.hostname.endsWith('.' + h) || 
      u.hostname.replace('files.', '') === h ||
      h.replace('files.', '') === u.hostname
    );
    if (!hostMatch) return false;
    
    // If no prefixes defined, allow all paths
    if (!source.allowed_prefixes || source.allowed_prefixes.length === 0) return true;
    
    // Check prefix match - decode URL for comparison
    const decodedPath = decodeURIComponent(u.pathname);
    const prefixMatch = source.allowed_prefixes.some(p => {
      const decodedPrefix = decodeURIComponent(p);
      return decodedPath.startsWith(decodedPrefix) || decodedPath.includes(decodedPrefix);
    });
    return prefixMatch;
  } catch {
    return false;
  }
}

function getDocType(url: string, contentType: string): string {
  const ct = contentType.toLowerCase();
  const u = url.toLowerCase();

  // Skip static assets (CSS/JS/images/fonts)
  if (
    ct.includes('text/css') ||
    ct.includes('javascript') ||
    ct.startsWith('image/') ||
    ct.includes('font/') ||
    u.includes('.css') ||
    u.includes('.js') ||
    u.includes('.png') ||
    u.includes('.jpg') ||
    u.includes('.jpeg') ||
    u.includes('.svg') ||
    u.includes('.gif') ||
    u.includes('.ico') ||
    u.includes('.woff') ||
    u.includes('.woff2') ||
    u.includes('.ttf') ||
    u.includes('.eot')
  ) return 'asset';

  if (ct.includes('pdf')) return 'pdf';
  if (ct.includes('xml')) return 'xml';
  if (ct.includes('html')) return 'html';
  if (u.endsWith('.pdf')) return 'pdf';
  if (u.endsWith('.xml')) return 'xml';
  if (u.endsWith('.doc') || u.endsWith('.docx')) return 'doc';
  return 'html';
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  
  return '';
}

function extractText(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text.slice(0, 500000);
}

function extractLinks(html: string, baseUrl: string, source: Source): string[] {
  const links: string[] = [];
  const linkRegex = /href=["']([^"']+)["']/gi;
  let match;

  const isAssetPath = (pathname: string) =>
    /\.(css|js|map|png|jpe?g|svg|gif|webp|ico|woff2?|ttf|eot)$/i.test(pathname);

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

      const absoluteUrl = new URL(href, baseUrl);
      if (isAssetPath(absoluteUrl.pathname)) continue;

      const normalized = normalizeUrl(absoluteUrl.toString());
      if (isAllowed(normalized, source)) links.push(normalized);
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)];
}

function parseRssFeed(xml: string, source: Source): string[] {
  const links: string[] = [];
  
  // Parse <link> tags
  const linkRegex = /<link>([^<]+)<\/link>/gi;
  let match;
  while ((match = linkRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http')) {
      links.push(normalizeUrl(url));
    }
  }
  
  // Parse <guid> tags that are URLs
  const guidRegex = /<guid[^>]*>([^<]+)<\/guid>/gi;
  while ((match = guidRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http')) {
      links.push(normalizeUrl(url));
    }
  }
  
  // Parse href attributes in atom feeds
  const hrefRegex = /href=["']([^"']+)["']/gi;
  while ((match = hrefRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http')) {
      links.push(normalizeUrl(url));
    }
  }
  
  console.log(`RSS parser found ${links.length} links in feed`);
  
  // Return all unique links - we allow DRE links even from subdomain
  return [...new Set(links)].filter(link => {
    try {
      const u = new URL(link);
      // Allow diariodarepublica.pt links from RSS
      return u.hostname.includes('diariodarepublica.pt') || isAllowed(link, source);
    } catch {
      return false;
    }
  });
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get enabled sources using raw SQL via RPC
    const { data: sources, error: sourcesError } = await supabase
      .rpc('get_legal_sources_for_mirror');
    
    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      // Fallback: use direct query
      const { data: fallbackSources, error: fallbackError } = await supabase
        .from('legal.sources')
        .select('*')
        .eq('enabled', true);
      
      if (fallbackError) throw fallbackError;
    }

    const sourceList = (sources || []) as Source[];
    const sourceMap = new Map<string, Source>();
    
    for (const s of sourceList) {
      sourceMap.set(s.source_key, s);
      
      // Ensure seeds are in the queue
      for (const seed of s.seeds || []) {
        try {
          await supabase.rpc('upsert_legal_fetch_queue', {
            p_url: normalizeUrl(seed),
            p_source_key: s.source_key,
            p_depth: 0,
            p_priority: 100
          });
        } catch (e) {
          console.log('Queue upsert seed error:', e);
        }
      }
    }

    // Get items from queue
    const { data: queueItems, error: queueError } = await supabase
      .rpc('get_legal_queue_items', { p_limit: MAX_PER_RUN });

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      throw queueError;
    }

    console.log(`Processing ${(queueItems as QueueItem[])?.length || 0} URLs from queue`);

    const results = {
      processed: 0,
      documents: 0,
      errors: 0,
      newUrls: 0
    };

    for (const item of (queueItems || []) as QueueItem[]) {
      const source = sourceMap.get(item.source_key);
      if (!source) continue;

      try {
        console.log(`Fetching: ${item.url}`);
        
        // Create fetch client - some sites have invalid SSL certificates
        const fetchOptions: RequestInit & { client?: Deno.HttpClient } = {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7',
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
          },
          redirect: 'follow'
        };
        
        // For sites with SSL issues (like pgdlisboa.pt), use custom client
        const urlHost = new URL(item.url).hostname;
        if (urlHost.includes('pgdlisboa.pt')) {
          const client = Deno.createHttpClient({
            caCerts: [], // Accept any certificate
          });
          (fetchOptions as any).client = client;
        }
        
        const response = await fetch(item.url, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const docType = getDocType(item.url, contentType);
        const finalUrl = response.url;

        // Ignore static assets (CSS/JS/images/fonts)
        if (docType === 'asset') {
          await supabase.rpc('update_legal_queue_success', {
            p_url: item.url,
            p_status: response.status,
          });
          results.processed++;
          continue;
        }

        let title = '';
        let contentText = '';
        let storagePath: string | null = null;
        let checksum: string | null = null;
        let newLinks: string[] = [];

        if (docType === 'pdf' || contentType.includes('pdf')) {
          // Handle PDF
          const buffer = await response.arrayBuffer();
          checksum = await sha256(buffer);
          storagePath = `${item.source_key}/${checksum}.pdf`;
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
              contentType: 'application/pdf',
              upsert: true
            });
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
          }
          
          const urlPath = new URL(item.url).pathname;
          title = decodeURIComponent(urlPath.split('/').pop() || '').replace('.pdf', '');
          
        } else if (docType === 'xml' || contentType.includes('xml') || item.url.includes('.xml')) {
          // Handle RSS/XML - extract links but don't store as document
          const text = await response.text();
          newLinks = parseRssFeed(text, source);
          console.log(`Extracted ${newLinks.length} links from RSS feed: ${item.url}`);
          
          // Skip storing RSS feeds as documents - just extract links
          // Update queue and continue without inserting document
          await supabase.rpc('update_legal_queue_success', {
            p_url: item.url,
            p_status: response.status
          });
          
          // Add new links to queue
          for (const link of newLinks.slice(0, 100)) {
            try {
              await supabase.rpc('upsert_legal_fetch_queue', {
                p_url: link,
                p_source_key: item.source_key,
                p_depth: item.depth + 1,
                p_priority: Math.max(0, 80 - item.depth * 10)
              });
              results.newUrls++;
            } catch {
              // Ignore duplicates
            }
          }
          
          results.processed++;
          continue; // Skip document storage for RSS feeds
          
        } else {
          // Handle HTML
          const html = await response.text();
          title = extractTitle(html);
          contentText = extractText(html);
          
          if (item.depth < MAX_DEPTH) {
            newLinks = extractLinks(html, finalUrl, source);
          }
        }

        // Upsert document
        const { error: docError } = await supabase.rpc('upsert_legal_document', {
          p_source_key: item.source_key,
          p_canonical_url: normalizeUrl(finalUrl),
          p_doc_type: docType,
          p_title: title || null,
          p_content_text: contentText || null,
          p_checksum_sha256: checksum,
          p_storage_path: storagePath,
          p_mime_type: contentType.split(';')[0] || null
        });

        if (docError) {
          console.error('Document upsert error:', docError);
        } else {
          results.documents++;
        }

        // Add new links to queue
        for (const link of newLinks.slice(0, 50)) {
          try {
            await supabase.rpc('upsert_legal_fetch_queue', {
              p_url: link,
              p_source_key: item.source_key,
              p_depth: item.depth + 1,
              p_priority: Math.max(0, 50 - item.depth * 10)
            });
            results.newUrls++;
          } catch {
            // Ignore duplicates
          }
        }

        // Update queue item
        await supabase.rpc('update_legal_queue_success', {
          p_url: item.url,
          p_status: response.status
        });

        results.processed++;
        
        // Polite delay
        await new Promise(r => setTimeout(r, 300));
        
      } catch (error) {
        console.error(`Error processing ${item.url}:`, error);
        results.errors++;
        
        // Update queue with error
        await supabase.rpc('update_legal_queue_error', {
          p_url: item.url,
          p_error: String(error),
          p_fail_count: (item.fail_count || 0) + 1
        });
      }
    }

    console.log('Mirror run complete:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Processed ${results.processed} URLs, ${results.documents} documents saved, ${results.newUrls} new URLs discovered`
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mirror run error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }
});
