import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEventosLegislativos, EventoLegislativo } from '@/hooks/useEventosLegislativos';
import { 
  Scale, 
  Plus, 
  Search, 
  Calendar,
  ExternalLink,
  Loader2,
  Edit,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt, enGB } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventImpactAnalyzer } from '@/components/compliance/EventImpactAnalyzer';
import { DocumentUploadWithAI, DocumentAnalysisResult } from '@/components/shared/DocumentUploadWithAI';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Eventos() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'pt' ? pt : enGB;
  
  const AREA_DIREITO_LABELS: Record<string, string> = {
    laboral: t('areaOfLaw.labor'),
    fiscal: t('areaOfLaw.tax'),
    comercial: t('areaOfLaw.commercial'),
    protecao_dados: t('areaOfLaw.dataProtection'),
    ambiente: t('areaOfLaw.environment'),
    seguranca_trabalho: t('areaOfLaw.workSafety'),
    societario: t('areaOfLaw.corporate'),
    outro: t('areaOfLaw.other'),
  };

  const ESTADO_LABELS: Record<string, string> = {
    rascunho: t('status.draft'),
    activo: t('status.active'),
    arquivado: t('status.archived'),
  };

  const JURISDICAO_LABELS: Record<string, string> = {
    nacional: t('jurisdiction.national'),
    europeia: t('jurisdiction.european'),
    internacional: t('jurisdiction.international'),
  };

  const { eventos, isLoading, createEvento, updateEvento, deleteEvento } = useEventosLegislativos();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoLegislativo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [impactDialogOpen, setImpactDialogOpen] = useState(false);
  const [selectedEventoForImpact, setSelectedEventoForImpact] = useState<EventoLegislativo | null>(null);

  type AreaDireito = 'laboral' | 'fiscal' | 'comercial' | 'protecao_dados' | 'ambiente' | 'seguranca_trabalho' | 'societario' | 'outro';
  type Jurisdicao = 'nacional' | 'europeia' | 'internacional';
  type EstadoEvento = 'rascunho' | 'activo' | 'arquivado';

  const [formData, setFormData] = useState<{
    titulo: string;
    referencia_legal: string;
    descricao_resumo: string;
    area_direito: AreaDireito;
    jurisdicao: Jurisdicao;
    estado: EstadoEvento;
    data_publicacao: string;
    data_entrada_vigor: string;
    link_oficial: string;
  }>({
    titulo: '',
    referencia_legal: '',
    descricao_resumo: '',
    area_direito: 'outro',
    jurisdicao: 'nacional',
    estado: 'rascunho',
    data_publicacao: '',
    data_entrada_vigor: '',
    link_oficial: '',
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      referencia_legal: '',
      descricao_resumo: '',
      area_direito: 'outro',
      jurisdicao: 'nacional',
      estado: 'rascunho',
      data_publicacao: '',
      data_entrada_vigor: '',
      link_oficial: '',
    });
    setEditingEvento(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (evento: EventoLegislativo) => {
    setEditingEvento(evento);
    setFormData({
      titulo: evento.titulo,
      referencia_legal: evento.referencia_legal || '',
      descricao_resumo: evento.descricao_resumo || '',
      area_direito: evento.area_direito as AreaDireito,
      jurisdicao: evento.jurisdicao as Jurisdicao,
      estado: evento.estado as EstadoEvento,
      data_publicacao: evento.data_publicacao || '',
      data_entrada_vigor: evento.data_entrada_vigor || '',
      link_oficial: evento.link_oficial || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      data_publicacao: formData.data_publicacao || null,
      data_entrada_vigor: formData.data_entrada_vigor || null,
    };

    if (editingEvento) {
      await updateEvento.mutateAsync({ id: editingEvento.id, ...payload });
    } else {
      await createEvento.mutateAsync(payload);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEvento.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const filteredEventos = eventos?.filter(evento =>
    evento.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evento.referencia_legal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evento.descricao_resumo?.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">{t('events.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('events.subtitle')}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('events.newEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvento ? t('events.editEvent') : t('events.newEvent')}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload IA</TabsTrigger>
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-4">
                  <DocumentUploadWithAI
                    context="evento_legislativo"
                    compact
                    onAnalysisComplete={(result) => {
                      const dados = result.dados_extraidos || {};
                      setFormData(prev => ({
                        ...prev,
                        titulo: dados.titulo_lei || prev.titulo,
                        referencia_legal: dados.referencia_legal || prev.referencia_legal,
                        descricao_resumo: result.resumo || prev.descricao_resumo,
                        area_direito: dados.area_direito || prev.area_direito,
                        jurisdicao: dados.jurisdicao || prev.jurisdicao,
                        data_publicacao: dados.data_publicacao || prev.data_publicacao,
                        data_entrada_vigor: dados.data_entrada_vigor || prev.data_entrada_vigor,
                      }));
                    }}
                  />
                </TabsContent>
                <TabsContent value="manual" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="titulo">{t('events.eventTitle')} *</Label>
                      <Input
                        id="titulo"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="referencia_legal">{t('events.legalReference')}</Label>
                      <Input
                        id="referencia_legal"
                        value={formData.referencia_legal}
                        onChange={(e) => setFormData({ ...formData, referencia_legal: e.target.value })}
                        placeholder="Ex: Lei n.º 83/2021"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="link_oficial">{t('events.officialLink')}</Label>
                      <Input
                        id="link_oficial"
                        type="url"
                        value={formData.link_oficial}
                        onChange={(e) => setFormData({ ...formData, link_oficial: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="area_direito">{t('events.areaOfLaw')}</Label>
                      <Select
                        value={formData.area_direito}
                        onValueChange={(value: AreaDireito) => 
                          setFormData({ ...formData, area_direito: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AREA_DIREITO_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="jurisdicao">{t('events.jurisdiction')}</Label>
                      <Select
                        value={formData.jurisdicao}
                        onValueChange={(value: Jurisdicao) => 
                          setFormData({ ...formData, jurisdicao: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(JURISDICAO_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="estado">{t('events.status')}</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value: EstadoEvento) => 
                          setFormData({ ...formData, estado: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ESTADO_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="data_publicacao">{t('events.publicationDate')}</Label>
                      <Input
                        id="data_publicacao"
                        type="date"
                        value={formData.data_publicacao}
                        onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="data_entrada_vigor">{t('events.effectiveDate')}</Label>
                      <Input
                        id="data_entrada_vigor"
                        type="date"
                        value={formData.data_entrada_vigor}
                        onChange={(e) => setFormData({ ...formData, data_entrada_vigor: e.target.value })}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="descricao_resumo">{t('events.description')}</Label>
                      <Textarea
                        id="descricao_resumo"
                        value={formData.descricao_resumo}
                        onChange={(e) => setFormData({ ...formData, descricao_resumo: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <form onSubmit={handleSubmit}>
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createEvento.isPending || updateEvento.isPending}>
                    {(createEvento.isPending || updateEvento.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingEvento ? t('common.save') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('events.searchEvents')}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredEventos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchTerm ? t('events.noEvents') : t('events.noEventsRegistered')}
              </CardContent>
            </Card>
          ) : (
            filteredEventos.map((evento) => (
              <Card key={evento.id} className="hover:bg-muted/30 transition-colors group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Scale className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge 
                            variant={
                              evento.estado === 'activo' ? 'active' : 
                              evento.estado === 'rascunho' ? 'subtle' : 'secondary'
                            }
                          >
                            {ESTADO_LABELS[evento.estado]}
                          </Badge>
                          <Badge variant="outline">
                            {AREA_DIREITO_LABELS[evento.area_direito]}
                          </Badge>
                          <Badge variant="outline">
                            {JURISDICAO_LABELS[evento.jurisdicao]}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {evento.titulo}
                        </h3>
                        {evento.referencia_legal && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {evento.referencia_legal}
                          </p>
                        )}
                        {evento.descricao_resumo && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {evento.descricao_resumo}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                          {evento.data_publicacao && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {t('common.publication')}: {format(new Date(evento.data_publicacao), "d MMM yyyy", { locale: dateLocale })}
                            </div>
                          )}
                          {evento.data_entrada_vigor && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {t('common.effectiveDate')}: {format(new Date(evento.data_entrada_vigor), "d MMM yyyy", { locale: dateLocale })}
                            </div>
                          )}
                          {evento.link_oficial && (
                            <a 
                              href={evento.link_oficial} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-accent hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t('common.officialLink')}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title={t('events.analyzeImpact')}
                        onClick={() => {
                          setSelectedEventoForImpact(evento);
                          setImpactDialogOpen(true);
                        }}
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenEdit(evento)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteId(evento.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.language === 'pt' 
                ? 'Tem a certeza que pretende eliminar este evento legislativo? Esta ação não pode ser revertida.'
                : 'Are you sure you want to delete this legislative event? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={impactDialogOpen} onOpenChange={setImpactDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('events.analyzeImpact')}</DialogTitle>
          </DialogHeader>
          {selectedEventoForImpact && (
            <EventImpactAnalyzer
              eventoId={selectedEventoForImpact.id}
              eventoTitulo={selectedEventoForImpact.titulo}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}