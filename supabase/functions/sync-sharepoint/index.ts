import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SharePointConfig {
  id: string;
  organization_id: string;
  site_id: string;
  drive_id: string | null;
  root_folder_path: string;
  last_delta_token: string | null;
  sync_enabled: boolean;
}

interface GraphDriveItem {
  id: string;
  name: string;
  parentReference?: {
    id?: string;
    path?: string;
  };
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  size?: number;
  webUrl?: string;
  "@microsoft.graph.downloadUrl"?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: {
    user?: { displayName?: string };
  };
  lastModifiedBy?: {
    user?: { displayName?: string };
  };
  eTag?: string;
  deleted?: { state: string };
}

// Get Microsoft Graph access token using client credentials flow
async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get the default document library drive ID for a site
async function getDriveId(accessToken: string, siteId: string): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drive: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

// Get site info to validate configuration
async function getSiteInfo(accessToken: string, siteId: string): Promise<{ name: string; webUrl: string }> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Site info error:", error);
    throw new Error(`Failed to get site info: ${response.status}. Verifique se o Site ID está correto.`);
  }

  const data = await response.json();
  return { name: data.displayName || data.name, webUrl: data.webUrl };
}

// Resolve a folder path to its item ID (with retry + children-listing fallback)
async function resolveFolderPathToId(
  accessToken: string,
  driveId: string,
  folderPath: string
): Promise<{ id: string; name: string }> {
  // Encode each path segment individually
  const encodedPath = folderPath
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(segment) : ""))
    .join("/");

  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}`;
  console.log(`Resolving folder path: ${url}`);

  // --- Attempt 1: direct path resolution ---
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`Resolved folder (primary): id=${data.id}, name=${data.name}`);
    return { id: data.id, name: data.name };
  }

  const status1 = response.status;
  const body1 = await response.text();

  // If the error is NOT a 404, throw immediately – no point retrying
  if (status1 !== 404) {
    console.error("Resolve folder error (non-404):", body1);
    throw new Error(`Folder not found at path "${folderPath}": ${status1} - ${body1}`);
  }

  console.warn(`Path resolution returned 404 – retrying once after 1 s …`);

  // --- Attempt 2: retry after 1 s ---
  await new Promise((r) => setTimeout(r, 1000));

  const response2 = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response2.ok) {
    const data = await response2.json();
    console.log(`Resolved folder (retry): id=${data.id}, name=${data.name}`);
    return { id: data.id, name: data.name };
  }

  const body2 = await response2.text();
  console.warn(`Retry also returned ${response2.status} – falling back to children listing`);

  // --- Attempt 3: fallback – resolve segment by segment via /children ---
  const segments = folderPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`Folder not found at path "${folderPath}": ${status1} - ${body1}`);
  }

  let currentId = "root"; // start from drive root
  let currentName = "root";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const childrenUrl =
      currentId === "root"
        ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`
        : `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${currentId}/children`;

    console.log(`Fallback: listing children of "${currentName}" to find "${segment}" …`);

    const childResp = await fetch(childrenUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!childResp.ok) {
      const childErr = await childResp.text();
      console.error("Fallback children error:", childErr);
      throw new Error(
        `Fallback failed listing children of "${currentName}": ${childResp.status} - ${childErr}`
      );
    }

    const childData = await childResp.json();
    const children: { id: string; name: string; folder?: unknown }[] = childData.value || [];

    const match = children.find(
      (c) => c.name.toLowerCase() === segment.toLowerCase() && c.folder !== undefined
    );

    if (!match) {
      const available = children
        .filter((c) => c.folder !== undefined)
        .map((c) => c.name)
        .join(", ");
      throw new Error(
        `Fallback: folder "${segment}" not found among children of "${currentName}". Available folders: [${available}]`
      );
    }

    currentId = match.id;
    currentName = match.name;
    console.log(`Fallback resolved segment "${segment}" → id=${currentId}`);
  }

  console.log(`Resolved folder (fallback): id=${currentId}, name=${currentName}`);
  return { id: currentId, name: currentName };
}

// Fetch children of a folder by ID with pagination
async function fetchFolderChildrenById(
  accessToken: string,
  driveId: string,
  folderId: string
): Promise<GraphDriveItem[]> {
  let url: string = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children`;

  console.log(`Fetching children from: ${url}`);

  const allItems: GraphDriveItem[] = [];

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Children query error:", error);
      throw new Error(`Children query failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    allItems.push(...(data.value || []));

    url = data["@odata.nextLink"] || "";
  }

  console.log(`Found ${allItems.length} children`);
  return allItems;
}

// Recursively fetch all contents of a folder
async function fetchFolderContentsRecursive(
  accessToken: string,
  driveId: string,
  folderPath: string
): Promise<GraphDriveItem[]> {
  console.log(`Starting recursive fetch for path: ${folderPath}`);

  const allItems: GraphDriveItem[] = [];

  // First resolve the folder path to get its ID
  let rootFolderId: string;
  if (folderPath === "/") {
    // For root, use drive root children directly
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
    console.log(`Fetching root children from: ${url}`);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Root children query failed: ${response.status} - ${error}`);
    }
    const data = await response.json();
    const children: GraphDriveItem[] = data.value || [];
    allItems.push(...children);

    const subfolders = children.filter((item) => !!item.folder);
    console.log(`Found ${subfolders.length} subfolders in root`);
    for (const subfolder of subfolders) {
      const subChildren = await fetchFolderChildrenRecursiveById(accessToken, driveId, subfolder.id, subfolder.name);
      allItems.push(...subChildren);
    }
  } else {
    // Resolve path to ID, then use ID-based listing
    const folderInfo = await resolveFolderPathToId(accessToken, driveId, folderPath);
    rootFolderId = folderInfo.id;

    const children = await fetchFolderChildrenById(accessToken, driveId, rootFolderId);
    allItems.push(...children);

    const subfolders = children.filter((item) => !!item.folder);
    console.log(`Found ${subfolders.length} subfolders in ${folderPath}`);
    for (const subfolder of subfolders) {
      const subChildren = await fetchFolderChildrenRecursiveById(accessToken, driveId, subfolder.id, subfolder.name);
      allItems.push(...subChildren);
    }
  }

  console.log(`Total items found recursively: ${allItems.length}`);
  return allItems;
}

// Recursively fetch children by folder ID (for subfolders)
async function fetchFolderChildrenRecursiveById(
  accessToken: string,
  driveId: string,
  folderId: string,
  folderName: string
): Promise<GraphDriveItem[]> {
  const allItems: GraphDriveItem[] = [];
  const children = await fetchFolderChildrenById(accessToken, driveId, folderId);
  allItems.push(...children);

  const subfolders = children.filter((item) => !!item.folder);
  for (const subfolder of subfolders) {
    const subChildren = await fetchFolderChildrenRecursiveById(accessToken, driveId, subfolder.id, subfolder.name);
    allItems.push(...subChildren);
  }

  return allItems;
}

// Get the latest delta token without fetching all items
async function getLatestDeltaToken(accessToken: string, driveId: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/delta?token=latest`;
  console.log(`Getting latest delta token from: ${url}`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Delta token error:", error);
    throw new Error(`Failed to get delta token: ${response.status}`);
  }

  const data = await response.json();
  const deltaLink = data["@odata.deltaLink"] || "";
  console.log(`Got delta token (link length: ${deltaLink.length})`);
  return deltaLink;
}

// Fetch items using delta query (incremental sync)
async function fetchDeltaItems(
  accessToken: string,
  driveId: string,
  deltaToken: string
): Promise<{ items: GraphDriveItem[]; newDeltaToken: string }> {
  let url = deltaToken;

  const allItems: GraphDriveItem[] = [];
  let newDeltaToken = "";

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Delta query error:", error);
      throw new Error(`Delta query failed: ${response.status}`);
    }

    const data = await response.json();
    allItems.push(...(data.value || []));

    if (data["@odata.nextLink"]) {
      url = data["@odata.nextLink"];
    } else {
      url = "";
      newDeltaToken = data["@odata.deltaLink"] || "";
    }
  }

  if (allItems.length > 0) {
    console.log(`Delta first item: id=${allItems[0].id}, name=${allItems[0].name}, parentPath=${allItems[0].parentReference?.path}`);
  }

  return { items: allItems, newDeltaToken };
}

// Extract folder path from parent reference
function extractFolderPath(item: GraphDriveItem, driveId: string): string {
  const parentPath = item.parentReference?.path || "";
  const rootPrefix = `/drives/${driveId}/root:`;

  if (parentPath.startsWith(rootPrefix)) {
    return parentPath.substring(rootPrefix.length) || "/";
  }

  if (parentPath.endsWith("/root")) {
    return "/";
  }

  return "/";
}

// Get file extension from filename
function getFileExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return null;
  return filename.substring(lastDot + 1).toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action, organization_id, config: configPayload, force_full_sync, folder_path } = body;

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    // ============ SAVE CONFIG ACTION ============
    if (action === "save_config") {
      if (!configPayload?.site_id) {
        throw new Error("site_id is required");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const siteInfo = await getSiteInfo(accessToken, configPayload.site_id);

      // Use explicit drive_id from admin selector if provided, otherwise auto-detect
      let driveId: string;
      if (configPayload.drive_id) {
        driveId = configPayload.drive_id;
        console.log(`[Config] Using explicit drive_id from admin: ${driveId}`);
      } else {
        driveId = await getDriveId(accessToken, configPayload.site_id);
        console.log(`[Config] Auto-detected drive_id: ${driveId}`);
      }

      const { data: existing } = await supabase
        .from("sharepoint_config")
        .select("id, root_folder_path")
        .eq("organization_id", organization_id)
        .maybeSingle();

      const configData: Record<string, unknown> = {
        organization_id,
        site_id: configPayload.site_id,
        site_name: siteInfo.name,
        site_url: siteInfo.webUrl,
        drive_id: driveId,
        sync_enabled: configPayload.sync_enabled ?? true,
        sync_interval_minutes: configPayload.sync_interval_minutes ?? 5,
        root_folder_path: configPayload.root_folder_path ?? "/",
      };

      if (existing) {
        const oldPath = existing.root_folder_path || "/";
        const newPath = (configPayload.root_folder_path as string) || "/";

        if (oldPath !== newPath) {
          console.log(`root_folder_path changed from "${oldPath}" to "${newPath}" - clearing delta token and old documents`);
          configData.last_delta_token = null;

          await supabase
            .from("sharepoint_documents")
            .delete()
            .eq("config_id", existing.id);
        }

        await supabase
          .from("sharepoint_config")
          .update(configData)
          .eq("id", existing.id);
      } else {
        await supabase.from("sharepoint_config").insert(configData);
      }

      return new Response(
        JSON.stringify({ success: true, site_name: siteInfo.name, site_url: siteInfo.webUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ DELETE CONFIG ACTION ============
    if (action === "delete_config") {
      const { data: configToDelete } = await supabase
        .from("sharepoint_config")
        .select("id")
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (configToDelete) {
        await supabase
          .from("sharepoint_documents")
          .delete()
          .eq("config_id", configToDelete.id);

        await supabase
          .from("sharepoint_sync_logs")
          .delete()
          .eq("config_id", configToDelete.id);

        await supabase
          .from("sharepoint_config")
          .delete()
          .eq("id", configToDelete.id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ LIST DRIVES ACTION ============
    if (action === "list_drives") {
      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) throw new Error("SharePoint credentials not configured.");

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const drivesResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${spCfg.site_id}/drives`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!drivesResp.ok) throw new Error(`Drives query failed: ${drivesResp.status}`);
      const drivesData = await drivesResp.json();
      const drives = (drivesData.value || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        webUrl: d.webUrl,
        driveType: d.driveType,
      }));

      return new Response(
        JSON.stringify({ success: true, drives, current_drive_id: spCfg.drive_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ BROWSE FOLDERS ACTION ============
    if (action === "browse_folders") {
      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const browsePath = folder_path || "/";
      const browseDriveId = body.drive_id || spCfg.drive_id;
      let browseUrl: string;

      if (browsePath === "/") {
        browseUrl = `https://graph.microsoft.com/v1.0/drives/${browseDriveId}/root/children`;
      } else {
        const encodedPath = browsePath.split("/").map((s: string) => s ? encodeURIComponent(s) : "").join("/");
        browseUrl = `https://graph.microsoft.com/v1.0/drives/${browseDriveId}/root:${encodedPath}:/children`;
      }

      console.log(`Browse URL: ${browseUrl}`);
      const browseResp = await fetch(browseUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!browseResp.ok) {
        const errText = await browseResp.text();
        throw new Error(`Browse failed: ${browseResp.status} - ${errText}`);
      }
      const browseData = await browseResp.json();
      const folders = (browseData.value || []).map((item: any) => ({
        name: item.name,
        isFolder: !!item.folder,
        childCount: item.folder?.childCount ?? null,
        size: item.size,
        webUrl: item.webUrl,
      }));

      return new Response(
        JSON.stringify({ success: true, path: browsePath, items: folders }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ UPLOAD FILE ACTION ============
    if (action === "upload_file") {
      const { file_base64, file_name, folder_path: uploadFolderPath } = body;
      if (!file_base64 || !file_name) {
        throw new Error("file_base64 and file_name are required");
      }

      const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
      const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
      const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");
      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("SharePoint credentials not configured.");
      }

      const { data: spCfg } = await supabase
        .from("sharepoint_config")
        .select("*")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!spCfg) throw new Error("No SharePoint config found");

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      let driveId = spCfg.drive_id;
      if (!driveId) {
        driveId = await getDriveId(accessToken, spCfg.site_id);
        await supabase.from("sharepoint_config").update({ drive_id: driveId }).eq("id", spCfg.id);
      }

      // Build the full path: root_folder_path + current folder + filename
      const rootPath = spCfg.root_folder_path || "/";
      const currentFolder = uploadFolderPath || "/";
      let fullPath: string;
      if (rootPath === "/") {
        fullPath = currentFolder === "/" ? `/${file_name}` : `${currentFolder}/${file_name}`;
      } else {
        fullPath = currentFolder === "/" ? `${rootPath}/${file_name}` : `${rootPath}${currentFolder}/${file_name}`;
      }

      // Decode base64 to binary
      const binaryString = atob(file_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload via Graph API PUT (up to 4MB)
      const encodedPath = fullPath.split("/").map((s: string) => s ? encodeURIComponent(s) : "").join("/");
      const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodedPath}:/content`;
      console.log(`Uploading file to: ${uploadUrl}`);

      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error("Upload error:", errText);
        throw new Error(`Upload failed: ${uploadResp.status} - ${errText}`);
      }

      const uploadedItem: GraphDriveItem = await uploadResp.json();
      console.log(`File uploaded: id=${uploadedItem.id}, name=${uploadedItem.name}`);

      // Insert record in sharepoint_documents so it appears immediately
      const docData = {
        organization_id: spCfg.organization_id,
        config_id: spCfg.id,
        sharepoint_item_id: uploadedItem.id,
        sharepoint_drive_id: driveId,
        name: uploadedItem.name,
        file_extension: getFileExtension(uploadedItem.name),
        mime_type: uploadedItem.file?.mimeType || null,
        size_bytes: uploadedItem.size || null,
        web_url: uploadedItem.webUrl || null,
        download_url: uploadedItem["@microsoft.graph.downloadUrl"] || null,
        folder_path: currentFolder,
        is_folder: false,
        sharepoint_modified_at: uploadedItem.lastModifiedDateTime || null,
        sharepoint_modified_by: uploadedItem.lastModifiedBy?.user?.displayName || null,
        etag: uploadedItem.eTag || null,
        synced_at: new Date().toISOString(),
        is_deleted: false,
      };

      await supabase.from("sharepoint_documents").upsert(docData, {
        onConflict: "config_id,sharepoint_item_id",
      });

      return new Response(
        JSON.stringify({ success: true, item: { id: uploadedItem.id, name: uploadedItem.name, webUrl: uploadedItem.webUrl } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ SYNC ACTION (default) ============
    const clientId = Deno.env.get("SHAREPOINT_CLIENT_ID");
    const clientSecret = Deno.env.get("SHAREPOINT_CLIENT_SECRET");
    const tenantId = Deno.env.get("SHAREPOINT_TENANT_ID");

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error(
        "SharePoint credentials not configured. Please add SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_TENANT_ID."
      );
    }

    const { data: configs, error: configError } = await supabase
      .from("sharepoint_config")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("sync_enabled", true);

    if (configError) {
      throw new Error(`Failed to fetch config: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No SharePoint configuration found. Please configure SharePoint integration first.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const spConfig: SharePointConfig = configs[0];

    const { data: syncLog } = await supabase
      .from("sharepoint_sync_logs")
      .insert({
        config_id: spConfig.id,
        organization_id: spConfig.organization_id,
        status: "running",
        delta_token_used: force_full_sync ? null : spConfig.last_delta_token,
      })
      .select()
      .single();

    const logId = syncLog?.id;

    try {
      console.log("Getting Microsoft Graph access token...");
      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

      console.log("Validating SharePoint site...");
      const siteInfo = await getSiteInfo(accessToken, spConfig.site_id);

      let driveId = spConfig.drive_id;
      if (!driveId) {
        console.log("Getting document library drive ID...");
        driveId = await getDriveId(accessToken, spConfig.site_id);

        await supabase
          .from("sharepoint_config")
          .update({ drive_id: driveId, site_name: siteInfo.name, site_url: siteInfo.webUrl })
          .eq("id", spConfig.id);
      }

      const rootPath = spConfig.root_folder_path || "/";
      const useRecursiveListing = force_full_sync || !spConfig.last_delta_token;

      let items: GraphDriveItem[];
      let newDeltaToken = "";
      let needsFiltering = false;

      if (useRecursiveListing) {
        // ===== FULL SYNC: Use recursive children listing =====
        console.log(`Full sync: listing contents recursively from path: ${rootPath}`);

        // Clear existing documents for a clean sync
        await supabase
          .from("sharepoint_documents")
          .delete()
          .eq("config_id", spConfig.id);

        items = await fetchFolderContentsRecursive(accessToken, driveId, rootPath);
        needsFiltering = false; // Already scoped to root_folder_path

        // Get a fresh delta token for future incremental syncs
        newDeltaToken = await getLatestDeltaToken(accessToken, driveId);
      } else {
        // ===== INCREMENTAL SYNC: Use delta query =====
        console.log("Incremental sync: using delta query...");
        const deltaResult = await fetchDeltaItems(accessToken, driveId, spConfig.last_delta_token!);
        items = deltaResult.items;
        newDeltaToken = deltaResult.newDeltaToken;
        needsFiltering = true;
      }

      console.log(`Found ${items.length} items to process`);

      let itemsAdded = 0;
      let itemsUpdated = 0;
      let itemsDeleted = 0;

      // Filter items by root_folder_path (only needed for delta/incremental sync)
      let filteredItems = items;
      if (needsFiltering && rootPath !== "/") {
        filteredItems = items.filter((item) => {
          if (item.deleted) return true;
          const parentPath = item.parentReference?.path || "";
          const rootPrefix = `/drives/${driveId}/root:`;
          const fullParentPath = parentPath.startsWith(rootPrefix)
            ? parentPath.substring(rootPrefix.length)
            : parentPath.endsWith("/root") ? "/" : "/";

          if (fullParentPath === rootPath || fullParentPath.startsWith(rootPath + "/")) {
            return true;
          }

          if (item.folder) {
            const itemFullPath = fullParentPath === "/"
              ? "/" + item.name
              : fullParentPath + "/" + item.name;
            if (itemFullPath === rootPath) {
              return true;
            }
          }

          return false;
        });
        console.log(`Filtered to ${filteredItems.length} items within root_folder_path: ${rootPath}`);
      }

      for (const item of filteredItems) {
        if (item.deleted) {
          const { error: deleteError } = await supabase
            .from("sharepoint_documents")
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq("config_id", spConfig.id)
            .eq("sharepoint_item_id", item.id);

          if (!deleteError) itemsDeleted++;
          continue;
        }

        let folderPath = extractFolderPath(item, driveId);
        const isFolder = !!item.folder;

        // Adjust folder_path relative to root_folder_path
        if (rootPath !== "/") {
          if (folderPath.startsWith(rootPath)) {
            folderPath = folderPath.substring(rootPath.length) || "/";
          }
        }

        const documentData = {
          organization_id: spConfig.organization_id,
          config_id: spConfig.id,
          sharepoint_item_id: item.id,
          sharepoint_drive_id: driveId,
          name: item.name,
          file_extension: isFolder ? null : getFileExtension(item.name),
          mime_type: item.file?.mimeType || null,
          size_bytes: item.size || null,
          web_url: item.webUrl || null,
          download_url: item["@microsoft.graph.downloadUrl"] || null,
          folder_path: folderPath,
          is_folder: isFolder,
          sharepoint_modified_at: item.lastModifiedDateTime || null,
          sharepoint_modified_by: item.lastModifiedBy?.user?.displayName || null,
          etag: item.eTag || null,
          synced_at: new Date().toISOString(),
          is_deleted: false,
          deleted_at: null,
        };

        const { data: existing } = await supabase
          .from("sharepoint_documents")
          .select("id")
          .eq("config_id", spConfig.id)
          .eq("sharepoint_item_id", item.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("sharepoint_documents")
            .update(documentData)
            .eq("id", existing.id);
          itemsUpdated++;
        } else {
          await supabase.from("sharepoint_documents").insert(documentData);
          itemsAdded++;
        }
      }

      await supabase
        .from("sharepoint_config")
        .update({
          last_delta_token: newDeltaToken,
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        })
        .eq("id", spConfig.id);

      if (logId) {
        await supabase
          .from("sharepoint_sync_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "success",
            items_found: items.length,
            items_added: itemsAdded,
            items_updated: itemsUpdated,
            items_deleted: itemsDeleted,
            delta_token_new: newDeltaToken,
          })
          .eq("id", logId);
      }

      console.log(`Sync completed: ${itemsAdded} added, ${itemsUpdated} updated, ${itemsDeleted} deleted`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            items_found: items.length,
            items_added: itemsAdded,
            items_updated: itemsUpdated,
            items_deleted: itemsDeleted,
            site_name: siteInfo.name,
            site_url: siteInfo.webUrl,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (syncError: any) {
      console.error("Sync error:", syncError);

      await supabase
        .from("sharepoint_config")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: syncError.message,
        })
        .eq("id", spConfig.id);

      if (logId) {
        await supabase
          .from("sharepoint_sync_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "error",
            error_message: syncError.message,
          })
          .eq("id", logId);
      }

      throw syncError;
    }
  } catch (error: any) {
    console.error("Error in sync-sharepoint function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
