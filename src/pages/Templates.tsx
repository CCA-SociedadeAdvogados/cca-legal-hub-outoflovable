import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "react-i18next";
import { useTemplates, type Template } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, FileCode, Edit, Trash2, Copy, Eye, Sparkles } from "lucide-react";
import { DocumentUploadWithAI } from "@/components/shared/DocumentUploadWithAI";

const tipoColors: Record<string, string> = {
  contrato: "bg-primary/20 text-primary",
  adenda: "bg-primary/15 text-primary",
  politica: "bg-risk-low/20 text-risk-low",
  comunicacao: "bg-risk-medium/20 text-risk-medium",
  outro: "bg-muted text-muted-foreground",
};

const defaultPlaceholders = [
  "{{NOME_EMPRESA}}",
  "{{NIF}}",
  "{{MORADA}}",
  "{{DATA}}",
  "{{VALOR}}",
  "{{OBJETO}}",
  "{{PRAZO}}",
  "{{REPRESENTANTE}}",
];

export default function Templates() {
  const { t } = useTranslation();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipo: "contrato",
    conteudo: "",
  });

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      contrato: t('templates.types.contract'),
      adenda: t('templates.types.amendment'),
      politica: t('templates.types.policy'),
      comunicacao: t('templates.types.communication'),
      outro: t('templates.types.other'),
    };
    return labels[tipo] || tipo;
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "all" || t.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const placeholders = extractPlaceholders(formData.conteudo);
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({ id: selectedTemplate.id, ...formData, placeholders });
      } else {
        await createTemplate.mutateAsync({ ...formData, placeholders });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const extractPlaceholders = (content: string): string[] => {
    const regex = /\{\{[A-Z_]+\}\}/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches)];
  };

  const resetForm = () => {
    setFormData({ nome: "", descricao: "", tipo: "contrato", conteudo: "" });
    setSelectedTemplate(null);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      nome: template.nome,
      descricao: template.descricao || "",
      tipo: template.tipo,
      conteudo: template.conteudo,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('templates.confirmDelete'))) return;
    await deleteTemplate.mutateAsync(id);
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData({ ...formData, conteudo: formData.conteudo + placeholder });
  };

  const handleGenerateWithAI = () => {
    toast.info(t('templates.aiGenerationInDevelopment'));
  };

  return (
    <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('templates.title')}</h1>
          <p className="text-muted-foreground">{t('templates.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateWithAI}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t('templates.generateWithAI')}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('templates.newTemplate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedTemplate ? t('templates.editTemplate') : t('templates.newTemplate')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">{t('templates.templateName')}</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">{t('common.type')}</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contrato">{t('templates.types.contract')}</SelectItem>
                        <SelectItem value="adenda">{t('templates.types.amendment')}</SelectItem>
                        <SelectItem value="politica">{t('templates.types.policy')}</SelectItem>
                        <SelectItem value="comunicacao">{t('templates.types.communication')}</SelectItem>
                        <SelectItem value="outro">{t('templates.types.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="space-y-2">
                  <Label>{t('templates.availablePlaceholders')}</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                    {defaultPlaceholders.map((placeholder) => (
                      <Badge
                        key={placeholder}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => insertPlaceholder(placeholder)}
                      >
                        {placeholder}
                        <Copy className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('templates.placeholderHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conteudo">{t('templates.templateContent')}</Label>
                  <Textarea
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    rows={12}
                    placeholder={t('templates.templateContentPlaceholder')}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                    {selectedTemplate ? t('common.save') : t('common.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DocumentUploadWithAI context="template" />

      <div className="flex gap-4">
        <Input
          placeholder={t('templates.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('common.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('templates.allTypes')}</SelectItem>
            <SelectItem value="contrato">{t('templates.types.contract')}</SelectItem>
            <SelectItem value="adenda">{t('templates.types.amendment')}</SelectItem>
            <SelectItem value="politica">{t('templates.types.policy')}</SelectItem>
            <SelectItem value="comunicacao">{t('templates.types.communication')}</SelectItem>
            <SelectItem value="outro">{t('templates.types.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('templates.noTemplates')}</h3>
            <p className="text-muted-foreground mb-4">{t('templates.noTemplatesDescription')}</p>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('templates.createTemplate')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.nome}</CardTitle>
                    <CardDescription className="mt-1">{template.descricao}</CardDescription>
                  </div>
                  <Badge className={tipoColors[template.tipo]}>{getTipoLabel(template.tipo)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {(template.placeholders || []).slice(0, 4).map((p) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                    {(template.placeholders || []).length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{(template.placeholders || []).length - 4}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      {t('common.view')}
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
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
