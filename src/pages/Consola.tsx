import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Eyebrow } from '@/components/cca';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Building2, CalendarPlus, Loader2, Plus, ScrollText } from 'lucide-react';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { useAssuntos } from '@/hooks/useAssuntos';
import {
  HUB_TIPOS_EVENTO,
  PORTAL_ABAS,
  PORTAL_FUNCIONALIDADES,
  hubEstadoEvento,
  useCreateHubEvento,
  useDeleteHubEvento,
  useHubAuditoria,
  useHubEventos,
  useHubGrupoMutations,
  useHubGrupos,
  useHubOrgInfo,
  useHubOrgMembers,
  useHubPortalConfig,
  useHubUserAssuntoMutations,
  useHubUserAssuntos,
  useUpdateHubEvento,
  useUpdateHubPortalConfig,
  useUpdateMemberRole,
  type HubTipoEvento,
} from '@/hooks/useHub';

/**
 * Consola de gestão do hub (Secção 5 do blueprint): por cliente, decide que
 * abas existem no portal, que funcionalidades estão ativas e que conteúdo
 * está publicado. Alterações aos níveis 1–3 exigem perfil de gestão CCA;
 * tudo fica em auditoria.
 */
export default function Consola() {
  const { t } = useTranslation();
  const { isAppAdmin, isCCAManager, isLoading: profileLoading } = useLegalHubProfile();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  const { viewingOrganizationId, cliente } = useCliente();
  const organizationId =
    viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  if (!profileLoading && !isAppAdmin && !isCCAManager) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <Eyebrow>{t('consola.eyebrow', 'Hub')}</Eyebrow>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
            {t('consola.title')}
          </h1>
          <p className="max-w-2xl text-sm text-ink-mute">
            {t('consola.description')}
            {cliente ? ` — ${cliente.nome}` : ''}
          </p>
        </header>

        {!organizationId ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t('consola.selectClient')}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="abas">
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="abas">{t('consola.tabs.abas')}</TabsTrigger>
              <TabsTrigger value="funcionalidades">{t('consola.tabs.funcionalidades')}</TabsTrigger>
              <TabsTrigger value="empresas">{t('consola.tabs.empresas')}</TabsTrigger>
              <TabsTrigger value="assuntos">{t('consola.tabs.assuntos')}</TabsTrigger>
              <TabsTrigger value="eventos">{t('consola.tabs.eventos')}</TabsTrigger>
              <TabsTrigger value="utilizadores">{t('consola.tabs.utilizadores')}</TabsTrigger>
              <TabsTrigger value="auditoria">{t('consola.tabs.auditoria')}</TabsTrigger>
            </TabsList>

            <TabsContent value="abas">
              <AbasTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="funcionalidades">
              <FuncionalidadesTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="empresas">
              <EmpresasTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="assuntos">
              <AssuntosTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="eventos">
              <EventosTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="utilizadores">
              <UtilizadoresTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="auditoria">
              <AuditoriaTab organizationId={organizationId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

// ── 1 · Abas do portal ───────────────────────────────────────
function AbasTab({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const { data: config, isLoading } = useHubPortalConfig(organizationId);
  const update = useUpdateHubPortalConfig(organizationId);

  if (isLoading || !config) return <Skeleton className="h-64 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('consola.abas.title')}</CardTitle>
        <CardDescription>{t('consola.abas.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {PORTAL_ABAS.map((aba) => (
          <div key={aba} className="flex items-center justify-between rounded-md border px-4 py-3">
            <span className="text-sm font-medium">{t(`portal.nav.${ABA_NAV_KEY[aba]}`)}</span>
            <Switch
              checked={config.abas[aba]}
              disabled={update.isPending}
              onCheckedChange={(v) => update.mutate({ abas: { ...config.abas, [aba]: v } })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const ABA_NAV_KEY: Record<string, string> = {
  contratos: 'contracts',
  assuntos: 'matters',
  timelines: 'timelines',
  documentos: 'documents',
  prazos: 'deadlines',
  financeiro: 'financial',
  pedidos: 'requests',
  novidades: 'news',
  politicas: 'policies',
};

// ── 2 · Funcionalidades ──────────────────────────────────────
function FuncionalidadesTab({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const { data: config, isLoading } = useHubPortalConfig(organizationId);
  const update = useUpdateHubPortalConfig(organizationId);

  if (isLoading || !config) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('consola.funcionalidades.title')}</CardTitle>
        <CardDescription>{t('consola.funcionalidades.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PORTAL_FUNCIONALIDADES.map((f) => (
          <div key={f} className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t(`consola.funcionalidades.itens.${f}`)}</p>
              <p className="text-xs text-muted-foreground">
                {t(`consola.funcionalidades.hints.${f}`)}
              </p>
            </div>
            <Switch
              checked={config.funcionalidades[f]}
              disabled={update.isPending}
              onCheckedChange={(v) =>
                update.mutate({ funcionalidades: { ...config.funcionalidades, [f]: v } })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── 3 · Empresas do grupo (F1) ───────────────────────────────
function EmpresasTab({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const { data: orgInfo } = useHubOrgInfo(organizationId);
  const { data: grupos = [], isLoading } = useHubGrupos();
  const { criarGrupo, associarEmpresa, setPortalAtiva } = useHubGrupoMutations();
  const [novoNome, setNovoNome] = useState('');

  const grupo = grupos.find((g) => g.id === orgInfo?.hub_grupo_id) ?? null;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('consola.empresas.title')}</CardTitle>
        <CardDescription>{t('consola.empresas.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64 space-y-1.5">
            <Label>{t('consola.empresas.grupo')}</Label>
            <Select
              value={orgInfo?.hub_grupo_id ?? 'none'}
              onValueChange={(v) =>
                associarEmpresa.mutate({
                  orgId: organizationId,
                  grupoId: v === 'none' ? null : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('consola.empresas.semGrupo')}</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>{t('consola.empresas.novoGrupo')}</Label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="ex.: Grupo Vale Forte"
                className="w-56"
              />
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={!novoNome.trim() || criarGrupo.isPending}
              onClick={async () => {
                const id = await criarGrupo.mutateAsync(novoNome.trim());
                associarEmpresa.mutate({ orgId: organizationId, grupoId: id });
                setNovoNome('');
              }}
            >
              <Plus className="h-4 w-4" />
              {t('consola.empresas.criar')}
            </Button>
          </div>
        </div>

        {grupo ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {t('consola.empresas.doGrupo', { nome: grupo.nome })}
            </p>
            {grupo.organizations.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{o.name}</span>
                  {o.client_code && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {o.client_code}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t('consola.empresas.noPortal')}
                  </span>
                  <Switch
                    checked={o.portal_ativa}
                    onCheckedChange={(v) => setPortalAtiva.mutate({ orgId: o.id, ativa: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('consola.empresas.semGrupoInfo')}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── 4 · Publicação de assuntos (F2, nível 3) ─────────────────
function AssuntosTab({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const { assuntos, isLoading, updateAssunto } = useAssuntos(organizationId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('consola.assuntos.title')}</CardTitle>
        <CardDescription>{t('consola.assuntos.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {assuntos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('consola.assuntos.empty')}
          </p>
        ) : (
          assuntos.map((a) => (
            <div key={a.id} className="space-y-2 rounded-md border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`portal.matters.estados.${a.estado}`)}
                    {a.referencia ? ` · ${a.referencia}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t('hub.publishedInPortal')}
                  </span>
                  <Switch
                    checked={a.publicado}
                    onCheckedChange={(v) => updateAssunto.mutate({ id: a.id, publicado: v })}
                  />
                </div>
              </div>
              <Input
                defaultValue={a.status_cliente ?? ''}
                placeholder={t('hub.statusClientePlaceholder')}
                className="h-8 text-sm"
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v !== (a.status_cliente ?? null))
                    updateAssunto.mutate({ id: a.id, status_cliente: v });
                }}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ── 5 · Linha temporal (curadoria — Secção 4) ────────────────
function EventosTab({ organizationId }: { organizationId: string }) {
  const { t, i18n } = useTranslation();
  const { data: eventos = [], isLoading } = useHubEventos(organizationId);
  const { assuntos } = useAssuntos(organizationId);
  const update = useUpdateHubEvento(organizationId);
  const remove = useDeleteHubEvento(organizationId);
  const create = useCreateHubEvento();

  const [novoOpen, setNovoOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<HubTipoEvento>('marco_manual');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [assuntoId, setAssuntoId] = useState<string>('none');
  const [publicar, setPublicar] = useState(true);

  const rascunhos = eventos.filter((e) => !e.publicado && !e.interno).length;

  const criar = async () => {
    if (!titulo.trim()) return;
    await create.mutateAsync({
      organization_id: organizationId,
      assunto_id: assuntoId === 'none' ? null : assuntoId,
      tipo,
      titulo_cliente: titulo.trim(),
      data_evento: data,
      concluido: data <= new Date().toISOString().slice(0, 10),
      publicado: publicar,
    });
    setTitulo('');
    setNovoOpen(false);
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t('consola.eventos.title')}</CardTitle>
            <CardDescription>
              {t('consola.eventos.description')}
              {rascunhos > 0 && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {t('consola.eventos.rascunhos', { count: rascunhos })}
                </Badge>
              )}
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setNovoOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            {t('consola.eventos.novo')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {eventos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('consola.eventos.empty')}
          </p>
        ) : (
          eventos.map((e) => {
            const estado = hubEstadoEvento(e.data_evento, e.concluido);
            return (
              <div key={e.id} className="space-y-1.5 rounded-md border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(e.data_evento).toLocaleDateString(
                        i18n.language === 'en' ? 'en-GB' : 'pt-PT',
                      )}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {t(`hub.tipos.${e.tipo}`)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        estado === 'vencido'
                          ? 'border-risk-high/40 text-[10px] text-risk-high'
                          : 'text-[10px]'
                      }
                    >
                      {t(`hub.estados.${estado}`)}
                    </Badge>
                    {e.interno && (
                      <Badge variant="outline" className="text-[10px]">
                        {t('consola.eventos.interno')}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t(`consola.eventos.origens.${e.origem}`, e.origem)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {e.origem === 'manual' && !e.publicado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => remove.mutate(e.id)}
                      >
                        {t('common.delete', 'Remover')}
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">{t('hub.publishToggle')}</span>
                    <Switch
                      checked={e.publicado}
                      disabled={e.interno || update.isPending}
                      onCheckedChange={(v) => update.mutate({ id: e.id, publicado: v })}
                    />
                  </div>
                </div>
                {/* Texto a duas camadas: o título do cliente é editável na curadoria */}
                <Input
                  defaultValue={e.titulo_cliente}
                  className="h-8 text-sm"
                  onBlur={(ev) => {
                    const v = ev.target.value.trim();
                    if (v && v !== e.titulo_cliente) update.mutate({ id: e.id, titulo_cliente: v });
                  }}
                />
                {e.titulo_interno && e.titulo_interno !== e.titulo_cliente && (
                  <p className="text-xs text-muted-foreground">
                    {t('consola.eventos.tituloInterno')}: {e.titulo_interno}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('consola.eventos.novoTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('consola.eventos.tituloCliente')}</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('matters.cca.fields.type')}</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as HubTipoEvento)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HUB_TIPOS_EVENTO.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`hub.tipos.${tp}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('consola.eventos.data')}</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('consola.eventos.assunto')}</Label>
              <Select value={assuntoId} onValueChange={setAssuntoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('consola.eventos.semAssunto')}</SelectItem>
                  {assuntos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <span className="text-sm">{t('consola.eventos.publicarCriacao')}</span>
              <Switch checked={publicar} onCheckedChange={setPublicar} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={criar} disabled={!titulo.trim() || create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('consola.eventos.criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── 6 · Utilizadores do cliente (nível 4) ────────────────────
function UtilizadoresTab({ organizationId }: { organizationId: string }) {
  const { t } = useTranslation();
  const { data: members = [], isLoading } = useHubOrgMembers(organizationId);
  const { data: designados = [] } = useHubUserAssuntos(organizationId);
  const { assuntos } = useAssuntos(organizationId);
  const updateRole = useUpdateMemberRole(organizationId);
  const { designar, remover, setAcessoRestrito } = useHubUserAssuntoMutations(organizationId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('consola.utilizadores.title')}</CardTitle>
        <CardDescription>{t('consola.utilizadores.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('consola.utilizadores.empty')}
          </p>
        ) : (
          members.map((m) => {
            const doUser = designados.filter((d) => d.user_id === m.user_id);
            return (
              <div key={m.user_id} className="space-y-2 rounded-md border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.profiles?.nome_completo || m.profiles?.email || m.user_id}
                    </p>
                    {m.profiles?.email && (
                      <p className="text-xs text-muted-foreground">{m.profiles.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        updateRole.mutate({ userId: m.user_id, role: v as typeof m.role })
                      }
                    >
                      <SelectTrigger className="h-8 w-48 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['owner', 'admin', 'editor', 'viewer'] as const).map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`consola.utilizadores.papeis.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {t('consola.utilizadores.restrito')}
                      </span>
                      <Switch
                        checked={m.acesso_restrito}
                        onCheckedChange={(v) =>
                          setAcessoRestrito.mutate({
                            userId: m.user_id,
                            orgId: organizationId,
                            restrito: v,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                {m.acesso_restrito && (
                  <div className="flex flex-wrap gap-1.5 border-t pt-2">
                    <span className="text-xs text-muted-foreground">
                      {t('consola.utilizadores.assuntosDesignados')}:
                    </span>
                    {assuntos.map((a) => {
                      const ativo = doUser.some((d) => d.assunto_id === a.id);
                      return (
                        <Badge
                          key={a.id}
                          variant={ativo ? 'default' : 'outline'}
                          className="cursor-pointer text-[10px]"
                          onClick={() =>
                            ativo
                              ? remover.mutate({ userId: m.user_id, assuntoId: a.id })
                              : designar.mutate({ userId: m.user_id, assuntoId: a.id })
                          }
                        >
                          {a.titulo}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ── 7 · Auditoria ────────────────────────────────────────────
function AuditoriaTab({ organizationId }: { organizationId: string }) {
  const { t, i18n } = useTranslation();
  const { data: entries = [], isLoading } = useHubAuditoria(organizationId);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('consola.auditoria.title')}</CardTitle>
        <CardDescription>{t('consola.auditoria.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ScrollText className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-sm">{t('consola.auditoria.empty')}</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('consola.auditoria.quando')}</TableHead>
                <TableHead>{t('consola.auditoria.quem')}</TableHead>
                <TableHead>{t('consola.auditoria.acao')}</TableHead>
                <TableHead>{t('consola.auditoria.objeto')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {new Date(e.created_at).toLocaleString(
                      i18n.language === 'en' ? 'en-GB' : 'pt-PT',
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{e.user_email ?? '—'}</TableCell>
                  <TableCell className="text-xs">{e.action}</TableCell>
                  <TableCell className="text-xs">
                    {t(`consola.auditoria.tabelas.${e.table_name}`, e.table_name)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
