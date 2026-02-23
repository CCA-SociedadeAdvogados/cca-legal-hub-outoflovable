import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Shield,
  Crown,
  Pencil,
  Eye,
  KeyRound,
  Lock,
  AlertTriangle,
  Search,
  Building2,
  Trash2,
  UserCog,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { AdminUserMetrics, UserMetricsData } from "./AdminUserMetrics";
import { useDepartments } from "@/hooks/useDepartments";
import type { DepartmentRef } from "@/hooks/useAllUsersMetrics";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface MemberProfile {
  id: string | null;
  email: string | null;
  nome_completo: string | null;
  avatar_url: string | null;
  auth_method: string | null;
  last_login_at: string | null;
  locked_until: string | null;
  login_attempts: number | null;
}

interface AllMembersEntry {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
  profiles: MemberProfile | null;
  organization: { name: string } | null;
  departments: DepartmentRef[];
}

interface AdminUsersTabProps {
  organizations: Organization[] | undefined;
  isLoadingOrgs: boolean;
  allMembers: AllMembersEntry[] | undefined;
  isLoadingMembers: boolean;
  userMetrics: UserMetricsData | null | undefined;
  isLoadingMetrics: boolean;
  selectedOrgId: string | null;
  onOrgChange: (orgId: string | null) => void;
  onViewOrgMembers: (org: { id: string; name: string }) => void;
  onDeleteUser?: (member: AllMembersEntry) => void;
  onImpersonateUser?: (member: AllMembersEntry) => void;
  isDeletingUser?: boolean;
  currentUserId?: string;
}

const roleColors: Record<AppRole, string> = {
  owner: "bg-risk-medium/20 text-risk-medium",
  admin: "bg-primary/20 text-primary",
  editor: "bg-primary/15 text-primary",
  viewer: "bg-muted text-muted-foreground",
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  owner: <Crown className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
  editor: <Pencil className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

const authMethodColors: Record<string, string> = {
  local: "bg-primary/20 text-primary",
  sso_cca: "bg-risk-low/20 text-risk-low",
};

const authMethodIcons: Record<string, React.ReactNode> = {
  local: <Lock className="h-3 w-3" />,
  sso_cca: <KeyRound className="h-3 w-3" />,
};

function DepartmentBadges({ departments }: { departments: DepartmentRef[] }) {
  if (!departments || departments.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const visible = departments.slice(0, 2);
  const extra = departments.length - 2;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((d) => (
        <Badge key={d.id} variant="secondary" className="text-xs py-0">
          {d.name}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge variant="outline" className="text-xs py-0">
          +{extra}
        </Badge>
      )}
    </div>
  );
}

export function AdminUsersTab({
  organizations,
  isLoadingOrgs,
  allMembers,
  isLoadingMembers,
  userMetrics,
  isLoadingMetrics,
  selectedOrgId,
  onOrgChange,
  onViewOrgMembers,
  onDeleteUser,
  onImpersonateUser,
  isDeletingUser,
  currentUserId,
}: AdminUsersTabProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterAuthMethod, setFilterAuthMethod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");

  // Load departments for selected org (for filter)
  const { departments: orgDepartments } = useDepartments(selectedOrgId);

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      owner: t('users.roles.owner', 'Proprietário'),
      admin: t('users.roles.admin', 'Administrador'),
      editor: t('users.roles.editor', 'Editor'),
      viewer: t('users.roles.viewer', 'Visualizador'),
    };
    return labels[role] || role;
  };

  const getAuthMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      local: "E-mail/Password",
      sso_cca: "SSO CCA",
    };
    return labels[method] || method;
  };

  const isUserLocked = (member: AllMembersEntry) => {
    const lockedUntil = member.profiles?.locked_until;
    if (!lockedUntil) return false;
    return new Date(lockedUntil) > new Date();
  };

  const filteredMembers = useMemo(() => {
    if (!allMembers) return [];

    return allMembers.filter((m) => {
      if (selectedOrgId && m.organization_id !== selectedOrgId) return false;

      const matchesSearch =
        m.profiles?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = filterRole === "all" || m.role === filterRole;

      const authMethod = m.profiles?.auth_method || 'local';
      const matchesAuthMethod = filterAuthMethod === "all" || authMethod === filterAuthMethod;

      const isLocked = isUserLocked(m);
      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "locked" ? isLocked : !isLocked);

      const matchesDept = filterDeptId === "all" ||
        m.departments.some((d) => d.id === filterDeptId);

      return matchesSearch && matchesRole && matchesAuthMethod && matchesStatus && matchesDept;
    });
  }, [allMembers, selectedOrgId, searchTerm, filterRole, filterAuthMethod, filterStatus, filterDeptId]);

  const displayMetrics = useMemo((): UserMetricsData => {
    const members = selectedOrgId
      ? allMembers?.filter(m => m.organization_id === selectedOrgId)
      : allMembers;

    if (!members) {
      return { total: 0, admins: 0, editors: 0, viewers: 0, ssoUsers: 0, localUsers: 0, lockedUsers: 0 };
    }

    return {
      total: members.length,
      admins: members.filter((m) => m.role === "admin" || m.role === "owner").length,
      editors: members.filter((m) => m.role === "editor").length,
      viewers: members.filter((m) => m.role === "viewer").length,
      ssoUsers: members.filter((m) => m.profiles?.auth_method === "sso_cca").length,
      localUsers: members.filter((m) => !m.profiles?.auth_method || m.profiles?.auth_method === "local").length,
      lockedUsers: members.filter((m) => isUserLocked(m)).length,
    };
  }, [allMembers, selectedOrgId]);

  return (
    <div className="space-y-6">
      {/* Organization Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('admin.usersTab.scope', 'Âmbito')}
          </CardTitle>
          <CardDescription>
            {t('admin.usersTab.scopeDescription', 'Selecione uma organização para ver os seus utilizadores ou veja todos.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedOrgId || "all"}
            onValueChange={(value) => {
              onOrgChange(value === "all" ? null : value);
              setFilterDeptId("all");
            }}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder={t('admin.usersTab.selectOrg', 'Selecionar organização...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('admin.usersTab.allOrganizations', 'Todas as Organizações')}
                </div>
              </SelectItem>
              {organizations?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {org.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* User Metrics */}
      <AdminUserMetrics
        metrics={selectedOrgId ? displayMetrics : userMetrics}
        isLoading={isLoadingMetrics || isLoadingMembers}
      />

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('users.permissionLevels', 'Níveis de Permissão')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {(["owner", "admin", "editor", "viewer"] as AppRole[]).map((role) => (
              <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-lg ${roleColors[role]}`}>
                  {roleIcons[role]}
                </div>
                <div>
                  <p className="font-medium">{getRoleLabel(role)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`users.roleDescriptions.${role}`, role)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('users.searchPlaceholder', 'Pesquisar utilizador...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('users.role', 'Perfil')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allRoles', 'Todos os perfis')}</SelectItem>
            <SelectItem value="owner">{t('users.roles.owner', 'Proprietário')}</SelectItem>
            <SelectItem value="admin">{t('users.roles.admin', 'Administrador')}</SelectItem>
            <SelectItem value="editor">{t('users.roles.editor', 'Editor')}</SelectItem>
            <SelectItem value="viewer">{t('users.roles.viewer', 'Visualizador')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAuthMethod} onValueChange={setFilterAuthMethod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('users.allAuthMethods', 'Autenticação')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allAuthMethods', 'Todos')}</SelectItem>
            <SelectItem value="local">{t('users.authMethods.email', 'E-mail/Password')}</SelectItem>
            <SelectItem value="sso_cca">{t('users.authMethods.sso', 'SSO CCA')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('users.allStatuses', 'Estado')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allStatuses', 'Todos')}</SelectItem>
            <SelectItem value="active">{t('users.status.active', 'Ativos')}</SelectItem>
            <SelectItem value="locked">{t('users.status.locked', 'Bloqueados')}</SelectItem>
          </SelectContent>
        </Select>
        {/* Department filter — only when an org is selected */}
        {selectedOrgId && orgDepartments && orgDepartments.length > 0 && (
          <Select value={filterDeptId} onValueChange={setFilterDeptId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os departamentos</SelectItem>
              {orgDepartments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('admin.usersTab.usersList', 'Lista de Utilizadores')}
            <Badge variant="secondary" className="ml-2">
              {filteredMembers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.usersTab.noUsers', 'Nenhum utilizador encontrado.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.user', 'Utilizador')}</TableHead>
                    <TableHead>{t('users.role', 'Perfil')}</TableHead>
                    <TableHead>Perfil LegalHub</TableHead>
                    <TableHead>{t('admin.usersTab.authMethod', 'Autenticação')}</TableHead>
                    <TableHead>{t('admin.organization', 'Organização')}</TableHead>
                    <TableHead>Departamentos</TableHead>
                    <TableHead>{t('admin.usersTab.lastLogin', 'Último Login')}</TableHead>
                    <TableHead>{t('common.status', 'Estado')}</TableHead>
                    <TableHead className="w-[100px]">{t('common.actions', 'Ações')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const isLocked = isUserLocked(member);
                    const authMethod = member.profiles?.auth_method || 'local';

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {member.profiles?.nome_completo?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {member.profiles?.nome_completo || t('users.noName', 'Sem nome')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.profiles?.email || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${roleColors[member.role]} flex items-center gap-1 w-fit`}>
                            {roleIcons[member.role]}
                            <span>{getRoleLabel(member.role)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const auth = member.profiles?.auth_method || 'local';
                            const role = member.role;
                            // Derive LegalHub profile label
                            // Note: isPlatformAdmin not available here, so we rely on role=admin+SSO
                            let label = '';
                            let cls = '';
                            if (auth === 'sso_cca') {
                              if (role === 'admin') { label = 'Gestão CCA'; cls = 'bg-primary/20 text-primary'; }
                              else { label = 'Utilizador CCA'; cls = 'bg-primary/10 text-primary'; }
                            } else {
                              if (role === 'viewer') { label = 'Utilizador Org.'; cls = 'bg-muted text-muted-foreground'; }
                              else { label = 'Gestão Org.'; cls = 'bg-risk-medium/20 text-risk-medium'; }
                            }
                            return (
                              <Badge className={`${cls} flex items-center gap-1 w-fit text-xs`}>
                                {label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${authMethodColors[authMethod]} flex items-center gap-1 w-fit`}>
                            {authMethodIcons[authMethod]}
                            <span>{getAuthMethodLabel(authMethod)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {member.organization?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DepartmentBadges departments={member.departments} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {member.profiles?.last_login_at
                              ? format(new Date(member.profiles.last_login_at), "dd/MM/yyyy HH:mm", { locale: pt })
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isLocked ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              {t('users.status.locked', 'Bloqueado')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-risk-low border-risk-low flex items-center gap-1 w-fit">
                              {t('users.status.active', 'Ativo')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {onImpersonateUser && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                onClick={() => onImpersonateUser(member)}
                                disabled={member.user_id === currentUserId}
                                title="Impersonar utilizador"
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onDeleteUser?.(member)}
                              disabled={member.user_id === currentUserId || isDeletingUser}
                              title={member.user_id === currentUserId
                                ? t('users.cannotDeleteSelf', 'Não pode eliminar a sua própria conta')
                                : t('users.deleteUser', 'Eliminar utilizador')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
