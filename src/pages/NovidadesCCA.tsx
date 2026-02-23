import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCCANews, type CCANews } from "@/hooks/useCCANews";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Newspaper, Edit, Trash2, Eye, Send, Archive, 
  Clock, CheckCircle, FileText, Calendar, Languages
} from "lucide-react";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";

const estadoColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  publicado: "bg-green-500/20 text-green-700",
  arquivado: "bg-orange-500/20 text-orange-700",
};

const estadoIcons: Record<string, React.ReactNode> = {
  rascunho: <Clock className="h-4 w-4" />,
  publicado: <CheckCircle className="h-4 w-4" />,
  arquivado: <Archive className="h-4 w-4" />,
};

export default function NovidadesCCA() {
  const { t, i18n } = useTranslation();
  const { news, isLoading, isPlatformAdmin, createNews, updateNews, deleteNews, publishNews, archiveNews } = useCCANews();
  const { translate, isTranslating, needsTranslation } = useContentTranslation();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<CCANews | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [translatedContent, setTranslatedContent] = useState<Record<string, { titulo: string; resumo: string; conteudo: string }>>({});
  
  const [formData, setFormData] = useState({
    titulo: "",
    resumo: "",
    conteudo: "",
    estado: "rascunho" as "rascunho" | "publicado" | "arquivado",
  });

  const dateLocale = i18n.language === 'pt' ? pt : enUS;

  // Stable reference to translate function
  const translateRef = useRef(translate);
  translateRef.current = translate;

  // Stable key for useEffect dependency
  const newsIds = useMemo(() => 
    news.map(n => n.id).join(','),
    [news]
  );

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
        const textsToTranslate = news.flatMap(n => [n.titulo, n.resumo || '', n.conteudo]);
        const translated = await translateRef.current(textsToTranslate, 'platform news and announcements');
        
        if (cancelled) return;
        
        const newTranslated: Record<string, { titulo: string; resumo: string; conteudo: string }> = {};
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
    
    return () => { cancelled = true; };
  }, [needsTranslation, newsIds]);

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
      titulo: "",
      resumo: "",
      conteudo: "",
      estado: "rascunho",
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
      resumo: item.resumo || "",
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
    const matchesSearch = n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (n.resumo?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEstado = filterEstado === "all" || n.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const stats = {
    total: news.length,
    publicados: news.filter((n) => n.estado === "publicado").length,
    rascunhos: news.filter((n) => n.estado === "rascunho").length,
    arquivados: news.filter((n) => n.estado === "arquivado").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('ccaNews.title')}</h1>
            <p className="text-muted-foreground">
              {isPlatformAdmin 
                ? t('ccaNews.subtitleAdmin')
                : t('ccaNews.subtitle')}
            </p>
          </div>
          {isPlatformAdmin && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('ccaNews.newNews')}
            </Button>
          )}
        </div>

        {/* Stats - apenas para admin */}
        {isPlatformAdmin && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Newspaper className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('ccaNews.published')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.publicados}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('ccaNews.drafts')}</p>
                    <p className="text-2xl font-bold">{stats.rascunhos}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('ccaNews.archived')}</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.arquivados}</p>
                  </div>
                  <Archive className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
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
                  onValueChange={(v) => setFormData({ ...formData, estado: v as "rascunho" | "publicado" | "arquivado" })}
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
                {needsTranslation && (
                  <Languages className="h-4 w-4 text-muted-foreground" />
                )}
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
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedNews.data_publicacao), i18n.language === 'pt' ? "dd 'de' MMMM 'de' yyyy" : "MMMM d, yyyy", { locale: dateLocale })}
                    </span>
                  )}
                </div>
                
                {getContent(selectedNews).resumo && (
                  <p className="text-muted-foreground italic">{getContent(selectedNews).resumo}</p>
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
          <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
        ) : filteredNews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('ccaNews.noNews')}</h3>
              <p className="text-muted-foreground mb-4">
                {isPlatformAdmin 
                  ? t('ccaNews.noNewsDescription')
                  : t('ccaNews.noNewsPublished')}
              </p>
              {isPlatformAdmin && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('ccaNews.newNews')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredNews.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={estadoColors[item.estado]}>
                          {estadoIcons[item.estado]}
                          <span className="ml-1">{getEstadoLabel(item.estado)}</span>
                        </Badge>
                        {item.data_publicacao && item.estado === "publicado" && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.data_publicacao), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getContent(item).titulo}
                        {needsTranslation && isTranslating && (
                          <span className="text-xs text-muted-foreground">...</span>
                        )}
                      </CardTitle>
                      {getContent(item).resumo && (
                        <CardDescription className="mt-1">{getContent(item).resumo}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {getContent(item).conteudo}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t('ccaNews.createdAt')} {format(new Date(item.created_at), i18n.language === 'pt' ? "dd/MM/yyyy 'às' HH:mm" : "MM/dd/yyyy 'at' HH:mm", { locale: dateLocale })}
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
                          {item.estado === "rascunho" && (
                            <Button variant="ghost" size="sm" onClick={() => handlePublish(item.id)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {item.estado === "publicado" && (
                            <Button variant="ghost" size="sm" onClick={() => handleArchive(item.id)}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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
