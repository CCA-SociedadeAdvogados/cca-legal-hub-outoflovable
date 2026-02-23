import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "react-i18next";
import { useRequisitos, type Requisito } from "@/hooks/useRequisitos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Scale, Edit, Trash2, Link2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const estadoColors: Record<string, string> = {
  pendente: "bg-risk-medium/20 text-risk-medium",
  em_curso: "bg-primary/20 text-primary",
  cumprido: "bg-risk-low/20 text-risk-low",
  nao_aplicavel: "bg-muted text-muted-foreground",
};

const criticidadeColors: Record<string, string> = {
  baixo: "bg-risk-low/20 text-risk-low",
  medio: "bg-risk-medium/20 text-risk-medium",
  alto: "bg-risk-medium/30 text-risk-medium",
  critico: "bg-destructive/20 text-destructive",
};

export default function Requisitos() {
  const { t } = useTranslation();
  const { requisitos, isLoading, createRequisito, updateRequisito, deleteRequisito } = useRequisitos();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequisito, setSelectedRequisito] = useState<Requisito | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterCriticidade, setFilterCriticidade] = useState<string>("all");

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    fonte_legal: "",
    area_direito: "outro",
    prazo_cumprimento: "",
    estado: "pendente",
    nivel_criticidade: "medio",
  });

  const areaDireitoOptions = [
    { value: "laboral", label: t("areaOfLaw.labor") },
    { value: "fiscal", label: t("areaOfLaw.fiscal") },
    { value: "comercial", label: t("areaOfLaw.commercial") },
    { value: "protecao_dados", label: t("areaOfLaw.dataProtection") },
    { value: "ambiente", label: t("areaOfLaw.environment") },
    { value: "seguranca_trabalho", label: t("areaOfLaw.workplaceSafety") },
    { value: "societario", label: t("areaOfLaw.corporate") },
    { value: "outro", label: t("areaOfLaw.other") },
  ];

  const filteredRequisitos = requisitos.filter((r) => {
    const matchesSearch = r.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === "all" || r.estado === filterEstado;
    const matchesCriticidade = filterCriticidade === "all" || r.nivel_criticidade === filterCriticidade;
    return matchesSearch && matchesEstado && matchesCriticidade;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRequisito) {
        await updateRequisito.mutateAsync({ id: selectedRequisito.id, ...formData });
      } else {
        await createRequisito.mutateAsync(formData);
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
      fonte_legal: "",
      area_direito: "outro",
      prazo_cumprimento: "",
      estado: "pendente",
      nivel_criticidade: "medio",
    });
    setSelectedRequisito(null);
  };

  const handleEdit = (requisito: Requisito) => {
    setSelectedRequisito(requisito);
    setFormData({
      titulo: requisito.titulo,
      descricao: requisito.descricao || "",
      fonte_legal: requisito.fonte_legal || "",
      area_direito: requisito.area_direito,
      prazo_cumprimento: requisito.prazo_cumprimento || "",
      estado: requisito.estado,
      nivel_criticidade: requisito.nivel_criticidade,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("requirements.confirmDelete"))) return;
    await deleteRequisito.mutateAsync(id);
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "cumprido":
        return <CheckCircle className="h-4 w-4" />;
      case "pendente":
      case "em_curso":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      pendente: t("requirements.status.pending"),
      em_curso: t("requirements.status.inProgress"),
      cumprido: t("requirements.status.fulfilled"),
      nao_aplicavel: t("requirements.status.notApplicable"),
    };
    return labels[estado] || estado;
  };

  const getCriticidadeLabel = (criticidade: string) => {
    const labels: Record<string, string> = {
      baixo: t("risk.low"),
      medio: t("risk.medium"),
      alto: t("risk.high"),
      critico: t("requirements.criticality.critical"),
    };
    return labels[criticidade] || criticidade;
  };

  const stats = {
    total: requisitos.length,
    pendentes: requisitos.filter((r) => r.estado === "pendente").length,
    criticos: requisitos.filter((r) => r.nivel_criticidade === "critico").length,
    cumpridos: requisitos.filter((r) => r.estado === "cumprido").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("requirements.title")}</h1>
            <p className="text-muted-foreground">{t("requirements.subtitle")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t("requirements.newRequirement")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedRequisito ? t("requirements.editRequirement") : t("requirements.newRequirement")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">{t("common.title")}</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">{t("common.description")}</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fonte_legal">{t("requirements.legalSource")}</Label>
                    <Input
                      id="fonte_legal"
                      value={formData.fonte_legal}
                      onChange={(e) => setFormData({ ...formData, fonte_legal: e.target.value })}
                      placeholder={t("requirements.legalSourcePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area_direito">{t("requirements.areaOfLaw")}</Label>
                    <Select
                      value={formData.area_direito}
                      onValueChange={(value) => setFormData({ ...formData, area_direito: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {areaDireitoOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prazo_cumprimento">{t("requirements.deadline")}</Label>
                    <Input
                      id="prazo_cumprimento"
                      type="date"
                      value={formData.prazo_cumprimento}
                      onChange={(e) => setFormData({ ...formData, prazo_cumprimento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">{t("common.status")}</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value) => setFormData({ ...formData, estado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">{t("requirements.status.pending")}</SelectItem>
                        <SelectItem value="em_curso">{t("requirements.status.inProgress")}</SelectItem>
                        <SelectItem value="cumprido">{t("requirements.status.fulfilled")}</SelectItem>
                        <SelectItem value="nao_aplicavel">{t("requirements.status.notApplicable")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel_criticidade">{t("requirements.criticality.label")}</Label>
                    <Select
                      value={formData.nivel_criticidade}
                      onValueChange={(value) => setFormData({ ...formData, nivel_criticidade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixo">{t("risk.low")}</SelectItem>
                        <SelectItem value="medio">{t("risk.medium")}</SelectItem>
                        <SelectItem value="alto">{t("risk.high")}</SelectItem>
                        <SelectItem value="critico">{t("requirements.criticality.critical")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={createRequisito.isPending || updateRequisito.isPending}>
                    {selectedRequisito ? t("common.save") : t("common.create")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("common.total")}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Scale className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-sm text-muted-foreground">{t("requirements.status.pending")}</p>
                  <p className="text-2xl font-bold text-risk-medium">{stats.pendentes}</p>
                </div>
                <Clock className="h-8 w-8 text-risk-medium" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("requirements.criticality.critical")}</p>
                  <p className="text-2xl font-bold text-destructive">{stats.criticos}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-sm text-muted-foreground">{t("requirements.status.fulfilled")}</p>
                  <p className="text-2xl font-bold text-risk-low">{stats.cumpridos}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-risk-low" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder={t("requirements.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="pendente">{t("requirements.status.pending")}</SelectItem>
              <SelectItem value="em_curso">{t("requirements.status.inProgress")}</SelectItem>
              <SelectItem value="cumprido">{t("requirements.status.fulfilled")}</SelectItem>
              <SelectItem value="nao_aplicavel">{t("requirements.status.notApplicable")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCriticidade} onValueChange={setFilterCriticidade}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("requirements.criticality.label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="baixo">{t("risk.low")}</SelectItem>
              <SelectItem value="medio">{t("risk.medium")}</SelectItem>
              <SelectItem value="alto">{t("risk.high")}</SelectItem>
              <SelectItem value="critico">{t("requirements.criticality.critical")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
        ) : filteredRequisitos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("requirements.noRequirements")}</h3>
              <p className="text-muted-foreground mb-4">{t("requirements.noRequirementsDescription")}</p>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t("requirements.createRequirement")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequisitos.map((requisito) => (
              <Card key={requisito.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${criticidadeColors[requisito.nivel_criticidade]}`}>
                        {requisito.nivel_criticidade === "critico" ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <Scale className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{requisito.titulo}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{requisito.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={estadoColors[requisito.estado]}>
                        {getEstadoIcon(requisito.estado)}
                        <span className="ml-1">{getEstadoLabel(requisito.estado)}</span>
                      </Badge>
                      <Badge className={criticidadeColors[requisito.nivel_criticidade]}>
                        {getCriticidadeLabel(requisito.nivel_criticidade)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {requisito.fonte_legal && (
                        <span className="flex items-center gap-1">
                          <Link2 className="h-4 w-4" />
                          {requisito.fonte_legal}
                        </span>
                      )}
                      {requisito.prazo_cumprimento && (
                        <span>
                          {t("requirements.deadlineLabel")}:{" "}
                          {new Date(requisito.prazo_cumprimento).toLocaleDateString("pt-PT")}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(requisito)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(requisito.id)}>
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
