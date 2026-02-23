import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "react-i18next";
import { usePoliticas, type Politica } from "@/hooks/usePoliticas";
import { useContentTranslation } from "@/hooks/useContentTranslation";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, FileText, Edit, Trash2, Download } from "lucide-react";
import { DocumentUploadWithAI } from "@/components/shared/DocumentUploadWithAI";

const estadoColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_revisao: "bg-yellow-500/20 text-yellow-700",
  aprovada: "bg-green-500/20 text-green-700",
  arquivada: "bg-destructive/20 text-destructive",
};

export default function Politicas() {
  const { t, i18n } = useTranslation();
  const { politicas, isLoading, createPolitica, updatePolitica, deletePolitica, uploadFile, downloadFile } = usePoliticas();
  const { translate, needsTranslation } = useContentTranslation();
  const { enabled: disableDocTranslation } = useFeatureFlag('DISABLE_AI_TRANSLATION_FOR_DOCUMENTS');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPolitica, setSelectedPolitica] = useState<Politica | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [translatedContent, setTranslatedContent] = useState<Record<string, { titulo: string; descricao: string }>>({});

  const [formData, setFormData] = useState<{
    titulo: string;
    descricao: string;
    conteudo: string;
    estado: "rascunho" | "em_revisao" | "aprovada" | "arquivada";
    departamento: string;
  }>({
    titulo: "",
    descricao: "",
    conteudo: "",
    estado: "rascunho",
    departamento: "",
  });

  // Stable reference to translate function
  const translateRef = useRef(translate);
  translateRef.current = translate;

  // Translate policy content when language is English (disabled via feature flag)
  useEffect(() => {
    // Feature flag: disable AI translation for documents
    if (disableDocTranslation) {
      if (needsTranslation) {
        console.debug('AI translation for documents disabled via feature flag');
      }
      setTranslatedContent({});
      return;
    }

    if (!needsTranslation || !politicas.length) {
      setTranslatedContent({});
      return;
    }

    let cancelled = false;

    const translatePolicies = async () => {
      try {
        const textsToTranslate = politicas.flatMap(p => [p.titulo, p.descricao || '']);
        const translated = await translateRef.current(textsToTranslate, 'corporate policies');
        
        if (cancelled) return;
        
        const newTranslated: Record<string, { titulo: string; descricao: string }> = {};
        politicas.forEach((p, i) => {
          newTranslated[p.id] = {
            titulo: translated[i * 2] || p.titulo,
            descricao: translated[i * 2 + 1] || p.descricao || '',
          };
        });
        setTranslatedContent(newTranslated);
      } catch {
        // Silently ignore aborted translations
      }
    };

    translatePolicies();
    
    return () => { cancelled = true; };
  }, [disableDocTranslation, needsTranslation, politicas]);

  const getContent = (politica: Politica) => {
    // When translation is disabled via flag, always return original
    if (disableDocTranslation) {
      return { titulo: politica.titulo, descricao: politica.descricao || '' };
    }
    if (needsTranslation && translatedContent[politica.id]) {
      return translatedContent[politica.id];
    }
    return { titulo: politica.titulo, descricao: politica.descricao || '' };
  };

  // Show indicator when viewing in non-PT language with translation disabled
  const showOriginalLanguageNotice = disableDocTranslation && i18n.language !== 'pt';

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      rascunho: t('policies.status.draft'),
      em_revisao: t('policies.status.inReview'),
      aprovada: t('policies.status.approved'),
      arquivada: t('policies.status.archived'),
    };
    return labels[estado] || estado;
  };

  const filteredPoliticas = politicas.filter((p) => {
    const matchesSearch = p.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === "all" || p.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let fileData = {};
      
      if (pendingFile) {
        const uploadResult = await uploadFile(pendingFile);
        if (uploadResult) {
          fileData = {
            arquivo_url: uploadResult.path,
            arquivo_nome: pendingFile.name,
            arquivo_mime_type: pendingFile.type,
          };
        }
      }
      
      if (selectedPolitica) {
        await updatePolitica.mutateAsync({ id: selectedPolitica.id, ...formData, ...fileData });
      } else {
        await createPolitica.mutateAsync({ ...formData, ...fileData });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      conteudo: "",
      estado: "rascunho",
      departamento: "",
    });
    setSelectedPolitica(null);
    setPendingFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('policies.confirmDelete'))) return;
    await deletePolitica.mutateAsync(id);
  };

  const handleEdit = (politica: Politica) => {
    setSelectedPolitica(politica);
    setFormData({
      titulo: politica.titulo,
      descricao: politica.descricao || "",
      conteudo: politica.conteudo || "",
      estado: politica.estado as "rascunho" | "em_revisao" | "aprovada" | "arquivada",
      departamento: politica.departamento || "",
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedPolitica(null);
    setFormData({
      titulo: "",
      descricao: "",
      conteudo: "",
      estado: "rascunho",
      departamento: "",
    });
    setIsDialogOpen(true);
  };

  // AI analysis is now automatic on document upload - no separate button needed

  const handleDownload = async (politica: Politica) => {
    await downloadFile(politica);
    toast.success(t('common.downloadComplete'));
  };

  return (
    <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('policies.title')}</h1>
          <p className="text-muted-foreground">{t('policies.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('policies.newPolicy')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {selectedPolitica ? t('policies.editPolicy') : t('policies.newPolicy')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">{t('common.title')}</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">{t('common.description')}</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estado">{t('common.status')}</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value) => setFormData({ ...formData, estado: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rascunho">{t('policies.status.draft')}</SelectItem>
                          <SelectItem value="em_revisao">{t('policies.status.inReview')}</SelectItem>
                          <SelectItem value="aprovada">{t('policies.status.approved')}</SelectItem>
                          <SelectItem value="arquivada">{t('policies.status.archived')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departamento">{t('common.department')}</Label>
                      <Select
                        value={formData.departamento}
                        onValueChange={(value) => setFormData({ ...formData, departamento: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="juridico">{t('departments.legal')}</SelectItem>
                          <SelectItem value="rh">{t('departments.hr')}</SelectItem>
                          <SelectItem value="financeiro">{t('departments.financial')}</SelectItem>
                          <SelectItem value="it">{t('departments.it')}</SelectItem>
                          <SelectItem value="operacoes">{t('departments.operations')}</SelectItem>
                          <SelectItem value="comercial">{t('departments.commercial')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conteudo">{t('policies.policyContent')}</Label>
                    <Textarea
                      id="conteudo"
                      value={formData.conteudo}
                      onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                      rows={6}
                      className="max-h-[200px] overflow-y-auto resize-y"
                      placeholder={t('policies.policyContentPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('policies.attachDocument')}</Label>
                    <DocumentUploadWithAI
                      context="politica"
                      compact
                      onAnalysisComplete={(result, file) => {
                        setPendingFile(file);
                        if (result.resumo) {
                          setFormData(prev => ({
                            ...prev,
                            descricao: result.resumo,
                            conteudo: result.pontos_principais?.join('\n\n') || prev.conteudo,
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {selectedPolitica ? t('common.save') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder={t('policies.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('policies.allStatuses')}</SelectItem>
            <SelectItem value="rascunho">{t('policies.status.draft')}</SelectItem>
            <SelectItem value="em_revisao">{t('policies.status.inReview')}</SelectItem>
            <SelectItem value="aprovada">{t('policies.status.approved')}</SelectItem>
            <SelectItem value="arquivada">{t('policies.status.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : filteredPoliticas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('policies.noPolicies')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('policies.noPoliciesDescription')}
            </p>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('policies.createPolicy')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPoliticas.map((politica) => (
            <Card key={politica.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{getContent(politica).titulo}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getContent(politica).descricao}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={estadoColors[politica.estado]}>
                      {getEstadoLabel(politica.estado)}
                    </Badge>
                    <Badge variant="outline">v{politica.versao}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {politica.departamento && (
                      <span>{t('common.department')}: {t(`departments.${
                        ({ juridico: 'legal', rh: 'hr', financeiro: 'financial', ti: 'it', operacoes: 'operations', comercial: 'commercial' } as Record<string, string>)[politica.departamento] || politica.departamento
                      }`)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(politica)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(politica)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(politica.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
