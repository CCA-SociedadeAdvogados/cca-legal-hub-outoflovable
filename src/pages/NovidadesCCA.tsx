import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCCANews, type CCANews } from '@/hooks/useCCANews';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Newspaper,
  Edit,
  Trash2,
  Eye,
  Send,
  Archive,
  Clock,
  CheckCircle,
  Calendar,
  Languages,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Eyebrow, KPI, GoldButton } from '@/components/cca';

const estadoColors: Record<string, string> = {
  rascunho: 'bg-bg-alt text-ink-mute border-line',
  publicado: 'bg-positive/10 text-positive border-positive/30',
  arquivado: 'bg-warn/10 text-warn border-warn/30',
};

const estadoIcons: Record<string, React.ReactNode> = {
  rascunho: <Clock className="h-4 w-4" />,
  publicado: <CheckCircle className="h-4 w-4" />,
  arquivado: <Archive className="h-4 w-4" />,
};

export default function NovidadesCCA() {
  const { t, i18n } = useTranslation();
  const {
    news,
    isLoading,
    isPlatformAdmin,
    createNews,
    updateNews,
    deleteNews,
    publishNews,
    archiveNews,
  } = useCCANews();
  const { translate, isTranslating, needsTranslation } = useContentTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<CCANews | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [translatedContent, setTranslatedContent] = useState<
    Record<string, { titulo: string; resumo: string; conteudo: string }>
  >({});

  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    conteudo: '',
    estado: 'rascunho' as 'rascunho' | 'publicado' | 'arquivado',
  });

  const dateLocale = i18n.language === 'pt' ? pt : enUS;

  // Stable reference to translate function
  const translateRef = useRef(translate);
  translateRef.current = translate;

  // Stable key for useEffect dependency
  const newsIds = useMemo(() => news.map((n) => n.id).join(','), [news]);

  // Translate news content when language changes to English
  useEffect(() => {
    if (!news.length) {
      setTranslatedContent({});
      return;
    }

    if (!needsTranslation) {
      setTranslatedContent({});
      return;
    }

    let cancelled = false;

    const translateNews = async () => {
      try {
        const textsToTranslate = news.flatMap((n) => [n.titulo, n.resumo || '', n.conteudo]);
        const translated = await translateRef.current(
          textsToTranslate,
          'platform news and announcements',
        );

        if (cancelled) return;

        const newTranslated: Record<string, { titulo: string; resumo: string; conteudo: string }> =
          {};
        news.forEach((n, i) => {
          newTranslated[n.id] = {
            titulo: translated[i * 3] || n.titulo,
            resumo: translated[i * 3 + 1] || n.resumo || '',
            conteudo: translated[i * 3 + 2] || n.conteudo,
          };
        });
        setTranslatedContent(newTranslated);
      } catch {
        // Silently ignore aborted translations
      }
    };

    translateNews();

    return () => {
      cancelled = true;
    };
  }, [needsTranslation, newsIds, news]);

  // Helper to get translated or original content
  const getContent = (item: CCANews) => {
    if (needsTranslation && translatedContent[item.id]) {
      return translatedContent[item.id];
    }
    return { titulo: item.titulo, resumo: item.resumo || '', conteudo: item.conteudo };
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      rascunho: t('ccaNews.status.draft'),
      publicado: t('ccaNews.status.published'),
      arquivado: t('ccaNews.status.archived'),
    };
    return labels[estado] || estado;
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      resumo: '',
      conteudo: '',
      estado: 'rascunho',
    });
    setSelectedNews(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: CCANews) => {
    setSelectedNews(item);
    setFormData({
      titulo: item.titulo,
      resumo: item.resumo || '',
      conteudo: item.conteudo,
      estado: item.estado,
    });
    setIsDialogOpen(true);
  };

  const handleOpenView = (item: CCANews) => {
    setSelectedNews(item);
    setIsViewDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedNews) {
      await updateNews.mutateAsync({ id: selectedNews.id, ...formData });
    } else {
      await createNews.mutateAsync(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('ccaNews.confirmDelete'))) return;
    await deleteNews.mutateAsync(id);
  };

  const handlePublish = async (id: string) => {
    if (!confirm(t('ccaNews.confirmPublish'))) return;
    await publishNews.mutateAsync(id);
  };

  const handleArchive = async (id: string) => {
    if (!confirm(t('ccaNews.confirmArchive'))) return;
    await archiveNews.mutateAsync(id);
  };

  const filteredNews = news.filter((n) => {
    const matchesSearch =
      n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.resumo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'all' || n.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const stats = {
    total: news.length,
    publicados: news.filter((n) => n.estado === 'publicado').length,
    rascunhos: news.filter((n) => n.estado === 'rascunho').length,
    arquivados: news.filter((n) => n.estado === 'arquivado').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('ccaNews.title')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('ccaNews.title')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {isPlatformAdmin ? t('ccaNews.subtitleAdmin') : t('ccaNews.subtitle')}
            </p>
          </header>
          {isPlatformAdmin && (
            <GoldButton onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              {t('ccaNews.newNews')}
            </GoldButton>
          )}
        </div>

        {/* Stats - apenas para admin */}
        {isPlatformAdmin && (
          <div className="grid gap-4 md:grid-cols-4">
            <KPI label={t('common.total')} value={stats.total} />
            <KPI label={t('ccaNews.published')} value={stats.publicados} />
            <KPI label={t('ccaNews.drafts')} value={stats.rascunhos} />
            <KPI label={t('ccaNews.archived')} value={stats.arquivados} />
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-4">
          <Input
            placeholder={t('ccaNews.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {isPlatformAdmin && (
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ccaNews.all')}</SelectItem>
                <SelectItem value="rascunho">{t('ccaNews.status.draft')}</SelectItem>
                <SelectItem value="publicado">{t('ccaNews.status.published')}</SelectItem>
                <SelectItem value="arquivado">{t('ccaNews.status.archived')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Dialog para criar/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedNews ? t('ccaNews.editNews') : t('ccaNews.newNews')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">{t('ccaNews.titleLabel')} *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder={t('ccaNews.titleLabel')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resumo">{t('ccaNews.summary')}</Label>
                <Input
                  id="resumo"
                  value={formData.resumo}
                  onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
                  placeholder={t('ccaNews.summaryPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conteudo">{t('ccaNews.content')} *</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder={t('ccaNews.contentPlaceholder')}
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">{t('ccaNews.stateLabel')}</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      estado: v as 'rascunho' | 'publicado' | 'arquivado',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">{t('ccaNews.status.draft')}</SelectItem>
                    <SelectItem value="publicado">{t('ccaNews.status.published')}</SelectItem>
                    <SelectItem value="arquivado">{t('ccaNews.status.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createNews.isPending || updateNews.isPending}>
                  {selectedNews ? t('ccaNews.update') : t('common.create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para visualizar */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                {selectedNews && getContent(selectedNews).titulo}
                {needsTranslation && <Languages className="h-4 w-4 text-ink-mute" />}
              </DialogTitle>
            </DialogHeader>
            {selectedNews && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={estadoColors[selectedNews.estado]}>
                    {estadoIcons[selectedNews.estado]}
                    <span className="ml-1">{getEstadoLabel(selectedNews.estado)}</span>
                  </Badge>
                  {selectedNews.data_publicacao && (
                    <span className="text-sm text-ink-soft flex items-center gap-1 [font-variant-numeric:tabular-nums]">
                      <Calendar className="h-4 w-4" />
                      {format(
                        new Date(selectedNews.data_publicacao),
                        i18n.language === 'pt' ? "dd 'de' MMMM 'de' yyyy" : 'MMMM d, yyyy',
                        { locale: dateLocale },
                      )}
                    </span>
                  )}
                </div>

                {getContent(selectedNews).resumo && (
                  <p className="text-ink-soft italic">{getContent(selectedNews).resumo}</p>
                )}

                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{getContent(selectedNews).conteudo}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Lista de novidades */}
        {isLoading ? (
          <div className="text-center py-8 text-ink-mute">{t('common.loading')}</div>
        ) : filteredNews.length === 0 ? (
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Newspaper className="h-12 w-12 text-ink-mute mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-ink mb-2">{t('ccaNews.noNews')}</h3>
              <p className="text-sm text-ink-soft mb-4">
                {isPlatformAdmin ? t('ccaNews.noNewsDescription') : t('ccaNews.noNewsPublished')}
              </p>
              {isPlatformAdmin && (
                <GoldButton onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  {t('ccaNews.newNews')}
                </GoldButton>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredNews.map((item) => (
              <Card
                key={item.id}
                className="rounded-card border-line bg-surface transition-colors hover:border-brand/40"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={estadoColors[item.estado]}>
                          {estadoIcons[item.estado]}
                          <span className="ml-1">{getEstadoLabel(item.estado)}</span>
                        </Badge>
                        {item.data_publicacao && item.estado === 'publicado' && (
                          <span className="text-xs text-ink-mute [font-variant-numeric:tabular-nums]">
                            {format(new Date(item.data_publicacao), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg text-ink flex items-center gap-2">
                        {getContent(item).titulo}
                        {needsTranslation && isTranslating && (
                          <span className="text-xs text-ink-mute">...</span>
                        )}
                      </CardTitle>
                      {getContent(item).resumo && (
                        <CardDescription className="mt-1 text-ink-soft">
                          {getContent(item).resumo}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-ink-soft line-clamp-2 mb-4">
                    {getContent(item).conteudo}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-mute [font-variant-numeric:tabular-nums]">
                      {t('ccaNews.createdAt')}{' '}
                      {format(
                        new Date(item.created_at),
                        i18n.language === 'pt' ? "dd/MM/yyyy 'às' HH:mm" : "MM/dd/yyyy 'at' HH:mm",
                        { locale: dateLocale },
                      )}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenView(item)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isPlatformAdmin && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {item.estado === 'rascunho' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePublish(item.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {item.estado === 'publicado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(item.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
