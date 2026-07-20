import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  RefreshCw,
  FileText,
  ExternalLink,
  Download,
  Calendar,
  Database,
  Filter,
} from 'lucide-react';
import {
  useLegalSearch,
  useLegalSources,
  useTriggerMirror,
  getStorageUrl,
} from '@/hooks/useLegalMirror';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Eyebrow, GhostButton } from '@/components/cca';

const sourceColors: Record<string, string> = {
  dre: 'bg-brand/10 text-brand border-brand/30',
  'eur-lex': 'bg-brand/10 text-brand border-brand/30',
  bdp: 'bg-risk-low/10 text-risk-low border-risk-low/30',
  asf: 'bg-brand/10 text-brand border-brand/30',
  cmvm: 'bg-risk-medium/10 text-risk-medium border-risk-medium/30',
};

const docTypeLabels: Record<string, string> = {
  pdf: 'PDF',
  html: 'HTML',
  xml: 'XML',
  doc: 'DOC',
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
  const {
    data: documents,
    isLoading: docsLoading,
    refetch: _refetch,
  } = useLegalSearch(debouncedQuery, selectedSource);
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
        const titles = documents.map((d) => d.title || '');
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

    return () => {
      cancelled = true;
    };
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
      <div className="space-y-7 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('nav.normativos')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('legislation.title')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('legislation.subtitle')}
            </p>
          </header>

          <GhostButton onClick={() => triggerMirror()} disabled={isMirroring}>
            <RefreshCw className={`h-4 w-4 ${isMirroring ? 'animate-spin' : ''}`} />
            {isMirroring ? t('legislation.updating') : t('legislation.updateNow')}
          </GhostButton>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-ink-mute" />
                <span className="text-[10.5px] font-medium uppercase tracking-eyebrow text-ink-mute">
                  {t('common.total')}
                </span>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
                {totalDocs.toLocaleString()}
              </p>
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
            sources?.map((source) => (
              <Card
                key={source.source_key}
                className="cursor-pointer rounded-card border-line bg-surface transition-colors hover:border-brand/40 hover:bg-bg-alt"
                onClick={() =>
                  setSelectedSource(selectedSource === source.source_key ? null : source.source_key)
                }
              >
                <CardContent className="pt-4">
                  <Badge variant="outline" className={sourceColors[source.source_key] || ''}>
                    {source.source_key.toUpperCase()}
                  </Badge>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
                    {source.document_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-mute truncate">{source.name}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Search & Filters */}
        <Card className="rounded-card border-line bg-surface">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
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
                  {sources?.map((s) => (
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
        <Card className="rounded-card border-line bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-ink">
              <FileText className="h-5 w-5 text-ink-mute" />
              {t('legislation.documents')}
              {documents && (
                <Badge variant="secondary">
                  {t('legislation.results', { count: documents.length })}
                </Badge>
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
              <div className="text-center py-14">
                <FileText className="h-12 w-12 mx-auto mb-4 text-ink-mute" strokeWidth={1.5} />
                <p className="text-ink">{t('legislation.noDocuments')}</p>
                <p className="text-sm text-ink-soft">{t('legislation.adjustSearch')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents?.map((doc) => {
                  const storageUrl = getStorageUrl(doc.storage_path);

                  return (
                    <div
                      key={doc.id}
                      className="rounded-card border border-line bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-bg-alt"
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
                            className="text-lg font-medium text-ink hover:text-brand hover:underline line-clamp-2"
                          >
                            {getTitle(doc)}
                          </Link>

                          <p className="text-sm text-ink-mute truncate mt-1">{doc.canonical_url}</p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-ink-mute [font-variant-numeric:tabular-nums]">
                            {doc.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(doc.published_at), 'dd MMM yyyy', {
                                  locale: dateLocale,
                                })}
                              </span>
                            )}
                            <span>
                              {t('legislation.indexed')}:{' '}
                              {format(
                                new Date(doc.fetched_at),
                                i18n.language === 'pt' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm',
                                { locale: dateLocale },
                              )}
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
                              <a
                                href={storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
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
