import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import type { TablesInsert } from "@/integrations/supabase/types";

const BUCKET = "contratos";
const MAX_FILES = 10;
const MAX_CONCURRENCY = 3;
const MAX_FILE_SIZE_MB = 10;

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

type FileUploadStatus = "pending" | "uploading" | "parsing" | "ready" | "saving" | "completed" | "error";

type ExtractedContractData = Record<string, string | number | boolean | null | undefined>;

type FileUploadItem = {
  id: string;
  file: File;
  status: FileUploadStatus;
  progress: number;
  include: boolean;
  storagePath?: string;
  extractedData?: ExtractedContractData;
  draft: {
    titulo_contrato: string;
    parte_a_nome_legal: string;
    parte_b_nome_legal: string;
    data_inicio_vigencia: string;
    data_termo: string;
  };
  error?: string;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function createConcurrencyLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    active--;
    const run = queue.shift();
    if (run) run();
  };

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}

const statusVariants: Record<FileUploadStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  uploading: "outline",
  parsing: "outline",
  ready: "default",
  saving: "outline",
  completed: "default",
  error: "destructive",
};

export default function ContratosUploadMassa() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [items, setItems] = useState<FileUploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getStatusLabel = (status: FileUploadStatus) => {
    const labels: Record<FileUploadStatus, string> = {
      pending: t('bulkUpload.status.pending'),
      uploading: t('bulkUpload.status.uploading'),
      parsing: t('bulkUpload.status.parsing'),
      ready: t('bulkUpload.status.ready'),
      saving: t('bulkUpload.status.saving'),
      completed: t('bulkUpload.status.completed'),
      error: t('bulkUpload.status.error'),
    };
    return labels[status];
  };

  const limiter = useMemo(
    () => createConcurrencyLimiter(Math.max(1, MAX_CONCURRENCY)),
    []
  );

  const totalProgress = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, it) => acc + (it.progress || 0), 0);
    return Math.round(sum / items.length);
  }, [items]);

  const selectedCount = useMemo(
    () => items.filter((x) => x.include && x.status === "ready").length,
    [items]
  );

  const canProcess = useMemo(
    () => items.some((x) => x.status === "pending"),
    [items]
  );

  const canRetry = useMemo(
    () => items.some((x) => x.status === "error"),
    [items]
  );

  const updateItem = useCallback((id: string, patch: Partial<FileUploadItem>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    setItems((prev) => {
      const remaining = Math.max(0, MAX_FILES - prev.length);
      const picked = incoming.slice(0, remaining);

      const mapped: FileUploadItem[] = picked.map((file) => {
        const tooBig = file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
        const invalidMime = file.type && !ACCEPTED_MIME.has(file.type);

        if (tooBig) {
          return {
            id: uid(),
            file,
            status: "error" as const,
            progress: 0,
            include: false,
            draft: { titulo_contrato: file.name, parte_a_nome_legal: "", parte_b_nome_legal: "", data_inicio_vigencia: "", data_termo: "" },
            error: t('bulkUpload.errors.fileTooLarge', { size: MAX_FILE_SIZE_MB }),
          };
        }

        if (invalidMime) {
          return {
            id: uid(),
            file,
            status: "error" as const,
            progress: 0,
            include: false,
            draft: { titulo_contrato: file.name, parte_a_nome_legal: "", parte_b_nome_legal: "", data_inicio_vigencia: "", data_termo: "" },
            error: t('bulkUpload.errors.unsupportedType'),
          };
        }

        return {
          id: uid(),
          file,
          status: "pending" as const,
          progress: 0,
          include: true,
          draft: { titulo_contrato: file.name, parte_a_nome_legal: "", parte_b_nome_legal: "", data_inicio_vigencia: "", data_termo: "" },
        };
      });

      return [...prev, ...mapped];
    });
  }, [t]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const clearAll = () => {
    if (busy) return;
    setItems([]);
    setGlobalError(null);
  };

  async function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadToStorage(file: File, userId: string) {
    const safeName = safeFileName(file.name);
    const path = `${userId}/${Date.now()}_${uid()}_${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) throw error;
    return path;
  }

  async function parseContractFile(file: File) {
    const base64Content = await readFileAsBase64(file);
    
    const { data, error } = await supabase.functions.invoke("parse-contract", {
      body: { 
        fileContent: base64Content, 
        fileName: file.name, 
        mimeType: file.type 
      },
    });
    
    if (error) throw error;
    return data as ExtractedContractData;
  }

  async function processOne(item: FileUploadItem) {
    if (!user?.id) {
      updateItem(item.id, { status: "error", error: t('bulkUpload.errors.notAuthenticated') });
      return false;
    }

    try {
      updateItem(item.id, { status: "uploading", progress: 10, error: undefined });

      const storagePath = await uploadToStorage(item.file, user.id);
      updateItem(item.id, { storagePath, status: "parsing", progress: 40 });

      const extracted = await parseContractFile(item.file);

      const titulo = (extracted?.titulo_contrato as string) || (extracted?.title as string) || item.file.name;
      const parteA = (extracted?.parte_a_nome_legal as string) || (extracted?.parteA as string) || "";
      const parteB = (extracted?.parte_b_nome_legal as string) || (extracted?.contraparte as string) || (extracted?.parteB as string) || "";
      const dataInicio = (extracted?.data_inicio_vigencia as string) || (extracted?.dataInicio as string) || "";
      const dataFim = (extracted?.data_termo as string) || (extracted?.dataFim as string) || "";

      updateItem(item.id, {
        extractedData: extracted,
        status: "ready",
        progress: 100,
        include: true,
        draft: { 
          titulo_contrato: titulo, 
          parte_a_nome_legal: parteA, 
          parte_b_nome_legal: parteB, 
          data_inicio_vigencia: dataInicio, 
          data_termo: dataFim 
        },
      });

      return true;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('bulkUpload.errors.globalError');
      updateItem(item.id, {
        status: "error",
        progress: 0,
        include: false,
        error: errorMessage,
      });
      return false;
    }
  }

  const processPending = async () => {
    setBusy(true);
    setGlobalError(null);
    try {
      const pendings = items.filter((x) => x.status === "pending");
      await Promise.all(pendings.map((it) => limiter(() => processOne(it))));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('bulkUpload.errors.globalError');
      setGlobalError(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const retryFailed = async () => {
    setItems((prev) =>
      prev.map((x) =>
        x.status === "error"
          ? { ...x, status: "pending" as const, include: true, error: undefined, progress: 0 }
          : x
      )
    );
    
    setTimeout(() => processPending(), 100);
  };

  const createSelected = async () => {
    if (!profile?.current_organization_id) {
      setGlobalError(t('bulkUpload.errors.noOrganization'));
      return;
    }

    setBusy(true);
    setGlobalError(null);

    try {
      const toCreate = items.filter((x) => x.include && x.status === "ready");
      if (toCreate.length === 0) {
        setGlobalError(t('bulkUpload.errors.noContractsReady'));
        setBusy(false);
        return;
      }

      toCreate.forEach((it) => {
        updateItem(it.id, { status: "saving", progress: 85 });
      });

      const payload: TablesInsert<"contratos">[] = toCreate.map((item, index) => ({
        id_interno: `BULK-${Date.now()}-${index}`,
        titulo_contrato: item.draft.titulo_contrato || item.file.name,
        parte_a_nome_legal: item.draft.parte_a_nome_legal || "A definir",
        parte_b_nome_legal: item.draft.parte_b_nome_legal || "A definir",
        data_inicio_vigencia: item.draft.data_inicio_vigencia || null,
        data_termo: item.draft.data_termo || null,
        organization_id: profile.current_organization_id,
        created_by_id: user?.id,
        updated_by_id: user?.id,
        tipo_contrato: "outro",
        estado_contrato: "rascunho",
        tipo_duracao: "prazo_determinado",
        tipo_renovacao: "sem_renovacao_automatica",
        arquivo_storage_path: item.storagePath || null,
        arquivo_nome_original: item.file.name,
        arquivo_mime_type: item.file.type || null,
        extraido_json: item.extractedData ? JSON.parse(JSON.stringify(item.extractedData)) : null,
      }));

      const { error } = await supabase.from("contratos").insert(payload);
      if (error) throw error;

      toCreate.forEach((it) => {
        updateItem(it.id, { status: "completed", progress: 100 });
      });

      toast({ title: t('bulkUpload.success.created', { count: toCreate.length }) });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('bulkUpload.errors.createFailed');
      setGlobalError(errorMessage);
      setItems((prev) =>
        prev.map((x) => (x.status === "saving" ? { ...x, status: "ready" as const } : x))
      );
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    if (busy) return;
    if (ev.dataTransfer.files?.length) addFiles(ev.dataTransfer.files);
  };

  const onDragOver = (ev: React.DragEvent) => ev.preventDefault();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-serif">{t('bulkUpload.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('bulkUpload.subtitle', { count: MAX_FILES })}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={() => inputRef.current?.click()} disabled={busy || items.length >= MAX_FILES}>
              <Upload className="mr-2 h-4 w-4" />
              {t('bulkUpload.addFiles')}
            </Button>
            <Button onClick={processPending} disabled={busy || !canProcess} variant="secondary">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('bulkUpload.processPending')}
            </Button>
            <Button onClick={retryFailed} disabled={busy || !canRetry} variant="outline">
              {t('bulkUpload.retry')}
            </Button>
            <Button onClick={createSelected} disabled={busy || selectedCount === 0}>
              {t('bulkUpload.createSelected')} {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
            <Button onClick={clearAll} disabled={busy} variant="ghost">
              {t('bulkUpload.clearAll')}
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Progress value={totalProgress} className="flex-1" />
            <span className="text-sm text-muted-foreground w-12">{totalProgress}%</span>
          </div>

          {globalError && (
            <div className="p-3 mb-4 rounded-md bg-destructive/10 text-destructive text-sm">
              {globalError}
            </div>
          )}

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => !busy && inputRef.current?.click()}
          >
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">{t('bulkUpload.dragDrop')}</p>
            <p className="text-sm text-muted-foreground">{t('bulkUpload.clickToSelect')}</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </Card>

        <div className="space-y-4">
          {items.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              {t('bulkUpload.noFiles')}
            </Card>
          )}

          {items.map((it) => (
            <Card key={it.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {it.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  ) : it.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{it.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{formatBytes(it.file.size)}</span>
                      <Badge variant={statusVariants[it.status]}>{getStatusLabel(it.status)}</Badge>
                    </div>
                    {it.error && <p className="text-sm text-destructive mt-1">{it.error}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={it.include}
                      disabled={it.status !== "ready"}
                      onCheckedChange={(v) => updateItem(it.id, { include: Boolean(v) })}
                    />
                    <span className="text-sm">{t('bulkUpload.select')}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(it.id)}
                    disabled={busy || ["uploading", "parsing", "saving"].includes(it.status)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <Progress value={it.progress} className="h-1" />
              </div>

              {(it.status === "ready" || it.status === "completed") && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t('bulkUpload.titleLabel')}</label>
                      <Input
                        value={it.draft.titulo_contrato}
                        onChange={(e) => updateItem(it.id, { draft: { ...it.draft, titulo_contrato: e.target.value } })}
                        disabled={busy || it.status === "completed"}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('bulkUpload.partyA')}</label>
                      <Input
                        value={it.draft.parte_a_nome_legal}
                        onChange={(e) => updateItem(it.id, { draft: { ...it.draft, parte_a_nome_legal: e.target.value } })}
                        disabled={busy || it.status === "completed"}
                        placeholder={t('bulkUpload.partyAPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('bulkUpload.partyB')}</label>
                      <Input
                        value={it.draft.parte_b_nome_legal}
                        onChange={(e) => updateItem(it.id, { draft: { ...it.draft, parte_b_nome_legal: e.target.value } })}
                        disabled={busy || it.status === "completed"}
                        placeholder={t('bulkUpload.partyBPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('bulkUpload.startDate')}</label>
                      <Input
                        type="date"
                        value={it.draft.data_inicio_vigencia}
                        onChange={(e) => updateItem(it.id, { draft: { ...it.draft, data_inicio_vigencia: e.target.value } })}
                        disabled={busy || it.status === "completed"}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('bulkUpload.endDate')}</label>
                      <Input
                        type="date"
                        value={it.draft.data_termo}
                        onChange={(e) => updateItem(it.id, { draft: { ...it.draft, data_termo: e.target.value } })}
                        disabled={busy || it.status === "completed"}
                      />
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
