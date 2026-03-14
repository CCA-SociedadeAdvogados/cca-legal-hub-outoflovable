import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { CreateUserResponse } from '@/hooks/usePlatformAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  UserPlus,
  Upload,
  Download,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEPARTAMENTO_LABELS } from '@/types/contracts';

type AppRole = Database['public']['Enums']['app_role'];
type Departamento = Database['public']['Enums']['departamento'];

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  jvris_id?: string | null;
  client_code?: string | null;
}

interface BulkRow {
  linha: number;
  email: string;
  nome_completo: string;
  role: AppRole;
  departamento?: Departamento;
  /** pode ser jvris_id ou nome parcial da org */
  org_ref: string;
}

interface BulkResult extends BulkRow {
  status: 'pending' | 'running' | 'ok' | 'error' | 'existing';
  erro?: string;
  credentials?: { email: string; password: string };
  org_name?: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
};

const CSV_TEMPLATE =
  'email,nome_completo,role,departamento,jvris_id\n' +
  'joao.silva@empresa.pt,João Silva,editor,juridico,CL0042\n' +
  'maria.santos@empresa.pt,Maria Santos,viewer,financeiro,CL0042\n';

function parseCSV(raw: string): BulkRow[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);

  return lines.slice(1).map((line, i) => {
    // Handle quoted fields with commas inside
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((c) => c.replace(/^"|"$/g, '').trim()) ?? line.split(',').map((c) => c.trim());
    const get = (col: string) => cols[idx(col)] ?? '';

    return {
      linha: i + 2,
      email: get('email').toLowerCase(),
      nome_completo: get('nome_completo') || get('nome') || get('name'),
      role: (['owner', 'admin', 'editor', 'viewer'].includes(get('role'))
        ? get('role')
        : 'viewer') as AppRole,
      departamento: get('departamento') as Departamento | undefined,
      org_ref: get('jvris_id') || get('org_ref') || get('organizacao') || get('organization'),
    };
  }).filter((r) => r.email && r.nome_completo);
}

function downloadCSV(filename: string, rows: string[][]): void {
  const bom = '\uFEFF';
  const content = bom + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Individual onboarding ───────────────────────────────────────────────────

function IndividualOnboarding({ organizations }: { organizations: OrgOption[] }) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<AppRole>('viewer');
  const [departamento, setDepartamento] = useState<Departamento | ''>('');
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<CreateUserResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const filteredOrgs = organizations.filter((o) => {
    const q = orgSearch.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.jvris_id ?? '').toLowerCase().includes(q) ||
      (o.client_code ?? '').toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !nome.trim() || !selectedOrg) {
      toast({ title: 'Campos obrigatórios', description: 'Email, nome e organização são obrigatórios.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim().toLowerCase(),
          nome_completo: nome.trim(),
          organizationId: selectedOrg.id,
          role,
          departamento: departamento || undefined,
          password: password || undefined,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      if (data.existingUser) {
        toast({ title: 'Utilizador adicionado', description: 'O utilizador já existia e foi adicionado à organização.' });
        resetForm();
      } else {
        setCredentials(data as CreateUserResponse);
        resetForm();
      }
    } catch (err) {
      toast({ title: 'Erro ao criar utilizador', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setNome('');
    setRole('viewer');
    setDepartamento('');
    setOrgSearch('');
    setSelectedOrg(null);
    setPassword('');
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Organização */}
        <div className="md:col-span-2 grid gap-2">
          <Label>Organização *</Label>
          {selectedOrg ? (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
              <div className="flex-1">
                <span className="font-medium">{selectedOrg.name}</span>
                {selectedOrg.jvris_id && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    JVRIS: {selectedOrg.jvris_id}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedOrg(null); setOrgSearch(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar por nome, JVRIS ID ou código..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                />
              </div>
              {orgSearch && (
                <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                  {filteredOrgs.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">Nenhuma organização encontrada</p>
                  ) : (
                    filteredOrgs.slice(0, 8).map((o) => (
                      <button
                        key={o.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between"
                        onClick={() => { setSelectedOrg(o); setOrgSearch(''); }}
                      >
                        <span className="font-medium text-sm">{o.name}</span>
                        <div className="flex gap-1">
                          {o.jvris_id && <Badge variant="secondary" className="text-xs">JVRIS: {o.jvris_id}</Badge>}
                          {o.client_code && <Badge variant="outline" className="text-xs">{o.client_code}</Badge>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email */}
        <div className="grid gap-2">
          <Label htmlFor="ob-email">Email corporativo *</Label>
          <Input
            id="ob-email"
            type="email"
            placeholder="utilizador@empresa.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Nome */}
        <div className="grid gap-2">
          <Label htmlFor="ob-nome">Nome completo *</Label>
          <Input
            id="ob-nome"
            placeholder="João Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        {/* Role */}
        <div className="grid gap-2">
          <Label>Papel (Role)</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Departamento */}
        <div className="grid gap-2">
          <Label>Departamento</Label>
          <Select value={departamento} onValueChange={(v) => setDepartamento(v as Departamento)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Nenhum —</SelectItem>
              {(Object.entries(DEPARTAMENTO_LABELS) as [Departamento, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Palavra-passe opcional */}
        <div className="md:col-span-2 grid gap-2">
          <Label htmlFor="ob-password">Palavra-passe (opcional)</Label>
          <Input
            id="ob-password"
            type="password"
            placeholder="Deixar em branco para gerar automaticamente"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Se não preencher, será gerada uma palavra-passe segura e apresentada após a criação.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={loading} className="min-w-[160px]">
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A criar...</>
          ) : (
            <><UserPlus className="mr-2 h-4 w-4" />Criar Utilizador</>
          )}
        </Button>
      </div>

      {/* Credentials Dialog */}
      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Utilizador criado com sucesso
            </DialogTitle>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copie as credenciais e envie ao cliente. A palavra-passe não voltará a ser apresentada.
              </p>
              <div className="space-y-3 p-4 bg-muted/40 rounded-lg">
                <CredentialRow label="Email" value={credentials.credentials?.email ?? credentials.user.email} field="email" copiedField={copiedField} onCopy={handleCopy} />
                {credentials.credentials?.password && (
                  <CredentialRow label="Palavra-passe" value={credentials.credentials.password} field="password" copiedField={copiedField} onCopy={handleCopy} mono />
                )}
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  if (credentials.credentials) {
                    downloadCSV(`credenciais_${credentials.user.email}.csv`, [
                      ['email', 'password'],
                      [credentials.credentials.email, credentials.credentials.password],
                    ]);
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Descarregar credenciais (.csv)
              </Button>
              <Button className="w-full" onClick={() => setCredentials(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Bulk (CSV) onboarding ────────────────────────────────────────────────────

function BulkOnboarding({ organizations }: { organizations: OrgOption[] }) {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<BulkResult[]>([]);
  const [parsed, setParsed] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const orgByJvris = (ref: string): OrgOption | undefined =>
    organizations.find(
      (o) =>
        o.jvris_id?.toLowerCase() === ref.toLowerCase() ||
        o.client_code?.toLowerCase() === ref.toLowerCase() ||
        o.name.toLowerCase().includes(ref.toLowerCase())
    );

  const handleParse = () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      toast({ title: 'CSV inválido', description: 'Nenhuma linha válida encontrada. Verifique o formato.', variant: 'destructive' });
      return;
    }
    setRows(
      parsed.map((r) => ({
        ...r,
        status: 'pending',
        org_name: orgByJvris(r.org_ref)?.name,
      }))
    );
    setParsed(true);
    setDone(false);
  };

  const handleRun = async () => {
    setRunning(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      updated[i] = { ...row, status: 'running' };
      setRows([...updated]);

      try {
        const org = orgByJvris(row.org_ref);
        if (!org) throw new Error(`Organização não encontrada para: "${row.org_ref}"`);

        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: row.email,
            nome_completo: row.nome_completo,
            organizationId: org.id,
            role: row.role,
            departamento: row.departamento || undefined,
          },
        });

        if (error || data?.error) throw new Error(data?.error || error?.message);

        updated[i] = {
          ...row,
          status: data.existingUser ? 'existing' : 'ok',
          org_name: org.name,
          credentials: data.credentials,
        };
      } catch (err) {
        updated[i] = { ...row, status: 'error', erro: err instanceof Error ? err.message : 'Erro desconhecido' };
      }

      setRows([...updated]);
    }

    setRunning(false);
    setDone(true);
    toast({ title: 'Processamento concluído', description: `${updated.filter((r) => r.status === 'ok').length} criados, ${updated.filter((r) => r.status === 'error').length} erros.` });
  };

  const handleDownloadResults = () => {
    const header = ['linha', 'email', 'nome_completo', 'role', 'departamento', 'org_ref', 'org_name', 'estado', 'password_gerada', 'erro'];
    const dataRows = rows.map((r) => [
      String(r.linha),
      r.email,
      r.nome_completo,
      r.role,
      r.departamento ?? '',
      r.org_ref,
      r.org_name ?? '',
      r.status,
      r.credentials?.password ?? '',
      r.erro ?? '',
    ]);
    downloadCSV(`onboarding_resultados_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...dataRows]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) ?? '');
      setParsed(false);
      setRows([]);
    };
    reader.readAsText(file, 'utf-8');
  };

  const reset = () => {
    setCsvText('');
    setRows([]);
    setParsed(false);
    setDone(false);
  };

  const statusInfo: Record<BulkResult['status'], { label: string; className: string }> = {
    pending: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
    running: { label: 'A processar...', className: 'bg-blue-100 text-blue-700' },
    ok: { label: 'Criado', className: 'bg-green-100 text-green-700' },
    existing: { label: 'Já existia', className: 'bg-yellow-100 text-yellow-700' },
    error: { label: 'Erro', className: 'bg-red-100 text-red-700' },
  };

  const okCount = rows.filter((r) => r.status === 'ok').length;
  const errCount = rows.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Template download */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border">
        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Formato do CSV</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Colunas obrigatórias: <code className="bg-muted px-1 rounded">email</code>, <code className="bg-muted px-1 rounded">nome_completo</code>, <code className="bg-muted px-1 rounded">role</code>, <code className="bg-muted px-1 rounded">jvris_id</code>. Opcional: <code className="bg-muted px-1 rounded">departamento</code>.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Roles válidos: <code className="bg-muted px-1 rounded">owner</code> · <code className="bg-muted px-1 rounded">admin</code> · <code className="bg-muted px-1 rounded">editor</code> · <code className="bg-muted px-1 rounded">viewer</code>
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCSV('template_onboarding.csv', [
            ['email', 'nome_completo', 'role', 'departamento', 'jvris_id'],
            ['joao.silva@empresa.pt', 'João Silva', 'editor', 'juridico', 'CL0042'],
            ['maria.santos@empresa.pt', 'Maria Santos', 'viewer', 'financeiro', 'CL0042'],
          ])}
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          Template
        </Button>
      </div>

      {/* Input área */}
      {!parsed && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Carregar ficheiro .csv
            </Button>
            <span className="text-sm text-muted-foreground">ou cole o conteúdo abaixo</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
          </div>
          <textarea
            className="w-full min-h-[160px] rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={CSV_TEMPLATE}
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setRows([]); }}
          />
          <div className="flex justify-end">
            <Button onClick={handleParse} disabled={!csvText.trim()}>
              Pré-visualizar ({parseCSV(csvText).length} linhas detectadas)
            </Button>
          </div>
        </div>
      )}

      {/* Preview / results table */}
      {parsed && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{rows.length} utilizadores</span>
              {done && (
                <>
                  <Badge className="bg-green-100 text-green-700">{okCount} criados</Badge>
                  {errCount > 0 && <Badge className="bg-red-100 text-red-700">{errCount} erros</Badge>}
                </>
              )}
            </div>
            <div className="flex gap-2">
              {done && (
                <Button size="sm" variant="outline" onClick={handleDownloadResults}>
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Exportar resultados
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={reset} disabled={running}>
                <X className="mr-2 h-3.5 w-3.5" />
                Limpar
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Palavra-passe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const si = statusInfo[r.status];
                  const orgFound = orgByJvris(r.org_ref);
                  return (
                    <TableRow key={i} className={cn(r.status === 'error' && 'bg-red-50/40')}>
                      <TableCell className="text-muted-foreground text-xs">{r.linha}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm">{r.nome_completo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{ROLE_LABELS[r.role]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {orgFound ? (
                          <span>{orgFound.name}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Não encontrada: {r.org_ref}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', si.className)}>
                          {r.status === 'running' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          {r.status === 'ok' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {r.status === 'error' && <AlertCircle className="mr-1 h-3 w-3" />}
                          {si.label}
                        </Badge>
                        {r.erro && <p className="text-xs text-destructive mt-1">{r.erro}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.credentials?.password ?? (r.status === 'existing' ? '— já existia —' : '—')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {!done && (
            <div className="flex justify-end">
              <Button onClick={handleRun} disabled={running} className="min-w-[180px]">
                {running ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A processar...</>
                ) : (
                  <><UserPlus className="mr-2 h-4 w-4" />Criar {rows.length} utilizadores</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Credential row helper ────────────────────────────────────────────────────

function CredentialRow({
  label,
  value,
  field,
  copiedField,
  onCopy,
  mono = false,
}: {
  label: string;
  value: string;
  field: string;
  copiedField: string | null;
  onCopy: (v: string, f: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm', mono && 'font-mono')}>{value}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onCopy(value, field)}>
        {copiedField === field ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ClientOnboardingTab({ organizations }: { organizations: OrgOption[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Onboarding de Clientes
        </CardTitle>
        <CardDescription>
          Crie utilizadores externos na plataforma. Os super admins CCA têm sempre visibilidade total sobre todos os dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList>
            <TabsTrigger value="individual">
              <UserPlus className="mr-2 h-4 w-4" />
              Individual
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <Upload className="mr-2 h-4 w-4" />
              Importação em massa (CSV)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-5 mt-0">
            <IndividualOnboarding organizations={organizations} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-0">
            <BulkOnboarding organizations={organizations} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
