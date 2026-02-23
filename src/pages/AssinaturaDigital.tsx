import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "react-i18next";
import { useDocumentosGerados, type DocumentoGerado } from "@/hooks/useDocumentosGerados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, FileText, Trash2, Download, Eye, Upload, 
  PenTool, Clock, CheckCircle, XCircle, Send 
} from "lucide-react";
import { DocumentUploadWithAI } from "@/components/shared/DocumentUploadWithAI";

const estadoAssinaturaColors: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  enviado: "bg-primary/20 text-primary",
  assinado: "bg-risk-low/20 text-risk-low",
  recusado: "bg-destructive/20 text-destructive",
  expirado: "bg-risk-medium/20 text-risk-medium",
};

const estadoAssinaturaIcons: Record<string, React.ReactNode> = {
  pendente: <Clock className="h-4 w-4" />,
  enviado: <Send className="h-4 w-4" />,
  assinado: <CheckCircle className="h-4 w-4" />,
  recusado: <XCircle className="h-4 w-4" />,
  expirado: <Clock className="h-4 w-4" />,
};

export default function Documentos() {
  const { t } = useTranslation();
  // Only show documents from ASSINATURA module (not accounting/archive documents)
  const { documentos, isLoading, createDocumento, deleteDocumento, sendForSignature } = useDocumentosGerados({ modulo: 'ASSINATURA' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoGerado | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");

  const [signatureData, setSignatureData] = useState({
    assinantes: [{ nome: "", email: "" }],
    prazo_dias: 7,
    mensagem: "",
  });

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      contrato: t('documents.types.contract'),
      adenda: t('documents.types.amendment'),
      politica: t('documents.types.policy'),
      comunicacao: t('documents.types.communication'),
      outro: t('documents.types.other'),
    };
    return labels[tipo] || tipo;
  };

  const getEstadoAssinaturaLabel = (estado: string) => {
    const labels: Record<string, string> = {
      pendente: t('documents.signatureStatus.pending'),
      enviado: t('documents.signatureStatus.sent'),
      assinado: t('documents.signatureStatus.signed'),
      recusado: t('documents.signatureStatus.refused'),
      expirado: t('documents.signatureStatus.expired'),
    };
    return labels[estado] || estado;
  };

  const filteredDocumentos = documentos.filter((d) => {
    const matchesSearch = d.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "all" || d.tipo === filterTipo;
    const matchesEstado = filterEstado === "all" || d.estado_assinatura === filterEstado;
    return matchesSearch && matchesTipo && matchesEstado;
  });

  const handleUpload = () => {
    toast.info(t('documents.uploadInDevelopment'));
    setIsDialogOpen(false);
  };

  const handleSendForSignature = (documento: DocumentoGerado) => {
    setSelectedDocumento(documento);
    setSignatureData({
      assinantes: [{ nome: "", email: "" }],
      prazo_dias: 7,
      mensagem: "",
    });
    setIsSignatureDialogOpen(true);
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocumento) return;
    
    try {
      await sendForSignature.mutateAsync({
        id: selectedDocumento.id,
        assinantes: signatureData.assinantes,
        prazo_dias: signatureData.prazo_dias,
      });
      setIsSignatureDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('documents.confirmDelete'))) return;
    await deleteDocumento.mutateAsync(id);
  };

  const addAssinante = () => {
    setSignatureData({
      ...signatureData,
      assinantes: [...signatureData.assinantes, { nome: "", email: "" }],
    });
  };

  const removeAssinante = (index: number) => {
    setSignatureData({
      ...signatureData,
      assinantes: signatureData.assinantes.filter((_, i) => i !== index),
    });
  };

  const updateAssinante = (index: number, field: "nome" | "email", value: string) => {
    const newAssinantes = [...signatureData.assinantes];
    newAssinantes[index][field] = value;
    setSignatureData({ ...signatureData, assinantes: newAssinantes });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stats = {
    total: documentos.length,
    pendentes: documentos.filter((d) => d.estado_assinatura === "pendente").length,
    enviados: documentos.filter((d) => d.estado_assinatura === "enviado").length,
    assinados: documentos.filter((d) => d.estado_assinatura === "assinado").length,
  };

  return (
    <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('documents.title')}</h1>
          <p className="text-muted-foreground">{t('documents.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              {t('documents.uploadDocument')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('documents.uploadDocument')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <DocumentUploadWithAI
                context="documento"
                onAnalysisComplete={(result, file) => {
                  toast.success(t('upload.analysisComplete'));
                  // Here you could create a document record with the analysis
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('documents.signatureStatus.pending')}</p>
                <p className="text-2xl font-bold">{stats.pendentes}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('documents.signatureStatus.sent')}</p>
                <p className="text-2xl font-bold text-primary">{stats.enviados}</p>
              </div>
              <Send className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('documents.signatureStatus.signed')}</p>
                <p className="text-2xl font-bold text-risk-low">{stats.assinados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-risk-low" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder={t('documents.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('common.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="contrato">{t('documents.types.contract')}</SelectItem>
            <SelectItem value="adenda">{t('documents.types.amendment')}</SelectItem>
            <SelectItem value="politica">{t('documents.types.policy')}</SelectItem>
            <SelectItem value="comunicacao">{t('documents.types.communication')}</SelectItem>
            <SelectItem value="outro">{t('documents.types.other')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('documents.signatureStatusLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pendente">{t('documents.signatureStatus.pending')}</SelectItem>
            <SelectItem value="enviado">{t('documents.signatureStatus.sent')}</SelectItem>
            <SelectItem value="assinado">{t('documents.signatureStatus.signed')}</SelectItem>
            <SelectItem value="recusado">{t('documents.signatureStatus.refused')}</SelectItem>
            <SelectItem value="expirado">{t('documents.signatureStatus.expired')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              {t('documents.sendForSignature')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitSignature} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{selectedDocumento?.nome}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(selectedDocumento?.tamanho_bytes || null)}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('documents.signers')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAssinante}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('common.add')}
                </Button>
              </div>
              {signatureData.assinantes.map((assinante, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={t('common.name')}
                    value={assinante.nome}
                    onChange={(e) => updateAssinante(index, "nome", e.target.value)}
                    required
                  />
                  <Input
                    placeholder={t('common.email')}
                    type="email"
                    value={assinante.email}
                    onChange={(e) => updateAssinante(index, "email", e.target.value)}
                    required
                  />
                  {signatureData.assinantes.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAssinante(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo">{t('documents.signatureDeadline')}</Label>
              <Select
                value={signatureData.prazo_dias.toString()}
                onValueChange={(v) => setSignatureData({ ...signatureData, prazo_dias: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t('documents.days', { count: 3 })}</SelectItem>
                  <SelectItem value="7">{t('documents.days', { count: 7 })}</SelectItem>
                  <SelectItem value="14">{t('documents.days', { count: 14 })}</SelectItem>
                  <SelectItem value="30">{t('documents.days', { count: 30 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem">{t('documents.messageOptional')}</Label>
              <Input
                id="mensagem"
                value={signatureData.mensagem}
                onChange={(e) => setSignatureData({ ...signatureData, mensagem: e.target.value })}
                placeholder={t('documents.messagePlaceholder')}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsSignatureDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={sendForSignature.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {t('documents.sendForSignature')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : filteredDocumentos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('documents.noDocuments')}</h3>
            <p className="text-muted-foreground mb-4">{t('documents.noDocumentsDescription')}</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t('documents.uploadDocument')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocumentos.map((documento) => (
            <Card key={documento.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{documento.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getTipoLabel(documento.tipo)} • {formatFileSize(documento.tamanho_bytes)}
                      </p>
                    </div>
                  </div>
                  <Badge className={estadoAssinaturaColors[documento.estado_assinatura]}>
                    {estadoAssinaturaIcons[documento.estado_assinatura]}
                    <span className="ml-1">{getEstadoAssinaturaLabel(documento.estado_assinatura)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {documento.assinantes && documento.assinantes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-2">{t('documents.signers')}:</p>
                    <div className="flex flex-wrap gap-2">
                      {documento.assinantes.map((a, i) => (
                        <Badge key={i} variant={a.assinado ? "default" : "outline"}>
                          {a.assinado ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {a.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('documents.createdOn')} {new Date(documento.created_at).toLocaleDateString("pt-PT")}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    {documento.estado_assinatura === "pendente" && (
                      <Button variant="ghost" size="sm" onClick={() => handleSendForSignature(documento)}>
                        <PenTool className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(documento.id)}>
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
