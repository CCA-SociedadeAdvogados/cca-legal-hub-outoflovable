import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  RefreshCw, 
  FileText, 
  ExternalLink, 
  Download, 
  Calendar,
  Database,
  Filter
} from 'lucide-react';
import { 
  useLegalSearch, 
  useLegalSources, 
  useTriggerMirror,
  getStorageUrl 
} from '@/hooks/useLegalMirror';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

const sourceColors: Record<string, string> = {
  dre: 'bg-primary/10 text-primary border-primary/20',
  'eur-lex': 'bg-primary/10 text-primary border-primary/20',
  bdp: 'bg-risk-low/10 text-risk-low border-risk-low/20',
  asf: 'bg-primary/10 text-primary border-primary/20',
  cmvm: 'bg-risk-medium/10 text-risk-medium border-risk-medium/20'
};

const docTypeLabels: Record<string, string> = {
  pdf: 'PDF',
  html: 'HTML',
  xml: 'XML',
  doc: 'DOC'
};

export default function Normativos() {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});
  
  const dateLocale = i18n.language === 'pt' ? pt : enUS;
  const { translate, needsTranslation } = useContentTranslation();
  const { enabled: disableDocTranslation } = useFeatureFlag('DISABLE_AI_TRANSLATION_FOR_DOCUMENTS');
  
  const { data: sources, isLoading: sourcesLoading } = useLegalSources();
  const { data: documents, isLoading: docsLoading, refetch } = useLegalSearch(debouncedQuery, selectedSource);
  const { mutate: triggerMirror, isPending: isMirroring } = useTriggerMirror();

  const handleSearch = () => {
    setDebouncedQuery(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const totalDocs = sources?.reduce((acc, s) => acc + (s.document_count || 0), 0) || 0;

  // Stable reference to translate function
  const translateRef = useRef(translate);
  translateRef.current = translate;

  // Translate document titles when language is English (disabled via feature flag)
  useEffect(() => {
    // Feature flag: disable AI translation for documents
    if (disableDocTranslation) {
      if (needsTranslation) {
        console.debug('AI translation for documents disabled via feature flag');
      }
      setTranslatedTitles({});
      return;
    }

    if (!needsTranslation || !documents?.length) {
      setTranslatedTitles({});
      return;
    }

    let cancelled = false;

    const translateTitles = async () => {
      try {
        const titles = documents.map(d => d.title || '');
        const translated = await translateRef.current(titles, 'legal document titles');
        
        if (cancelled) return;
        
        const newTranslated: Record<string, string> = {};
        documents.forEach((d, i) => {
          if (translated[i]) {
            newTranslated[d.id] = translated[i];
          }
        });
        setTranslatedTitles(newTranslated);
      } catch {
        // Silently ignore aborted translations
      }
    };

    translateTitles();
    
    return () => { cancelled = true; };
  }, [disableDocTranslation, needsTranslation, documents]);

  const getTitle = (doc: { id: string; title: string | null; canonical_url: string }) => {
    // When translation is disabled via flag, always return original
    if (disableDocTranslation) {
      return doc.title || doc.canonical_url;
    }
    if (needsTranslation && translatedTitles[doc.id]) {
      return translatedTitles[doc.id];
    }
    return doc.title || doc.canonical_url;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('legislation.title')}</h1>
            <p className="text-muted-foreground">
              {t('legislation.subtitle')}
            </p>
          </div>
          
          <Button 
            onClick={() => triggerMirror()} 
            disabled={isMirroring}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isMirroring ? 'animate-spin' : ''}`} />
            {isMirroring ? t('legislation.updating') : t('legislation.updateNow')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('common.total')}</span>
              </div>
              <p className="text-2xl font-bold">{totalDocs.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          {sourcesLoading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : (
            sources?.map(source => (
              <Card key={source.source_key} className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedSource(
                  selectedSource === source.source_key ? null : source.source_key
                )}
              >
                <CardContent className="pt-4">
                  <Badge variant="outline" className={sourceColors[source.source_key] || ''}>
                    {source.source_key.toUpperCase()}
                  </Badge>
                  <p className="text-2xl font-bold mt-1">{source.document_count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground truncate">{source.name}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('legislation.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              
              <Select 
                value={selectedSource || 'all'} 
                onValueChange={(v) => setSelectedSource(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t('legislation.allSources')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('legislation.allSources')}</SelectItem>
                  {sources?.map(s => (
                    <SelectItem key={s.source_key} value={s.source_key}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                {t('legislation.search')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('legislation.documents')}
              {documents && (
                <Badge variant="secondary">{t('legislation.results', { count: documents.length })}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : documents?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('legislation.noDocuments')}</p>
                <p className="text-sm">{t('legislation.adjustSearch')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents?.map(doc => {
                  const storageUrl = getStorageUrl(doc.storage_path);
                  
                  return (
                    <div 
                      key={doc.id} 
                      className="border rounded-lg p-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={sourceColors[doc.source_key] || ''}>
                              {doc.source_key.toUpperCase()}
                            </Badge>
                            <Badge variant="secondary">
                              {docTypeLabels[doc.doc_type] || doc.doc_type.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <Link 
                            to={`/normativos/${doc.id}`}
                            className="text-lg font-medium hover:text-primary hover:underline line-clamp-2"
                          >
                            {getTitle(doc)}
                          </Link>
                          
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {doc.canonical_url}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {doc.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(doc.published_at), 'dd MMM yyyy', { locale: dateLocale })}
                              </span>
                            )}
                            <span>
                              {t('legislation.indexed')}: {format(new Date(doc.fetched_at), i18n.language === 'pt' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm', { locale: dateLocale })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.canonical_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              {t('legislation.original')}
                            </a>
                          </Button>
                          
                          {storageUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={storageUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-4 w-4 mr-1" />
                                {t('legislation.copy')}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
