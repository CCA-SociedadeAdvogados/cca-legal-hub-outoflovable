import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "react-i18next";
import { useOrganizations, useOrganizationMembers } from "@/hooks/useOrganizations";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, Users, Edit, Trash2, Mail, Shield, 
  UserCog, Crown, Eye, Pencil, KeyRound, Lock,
  Clock, AlertTriangle, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

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

export default function Utilizadores() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { currentOrganization } = useOrganizations();
  const { 
    members = [], 
    isLoading: isLoadingMembers, 
    inviteMember, 
    updateMemberRole, 
    removeMember,
  } = useOrganizationMembers(currentOrganization?.id);
  
  const currentMember = members.find(m => m.user_id === user?.id);
  const userRole = currentMember?.role;
  const { isPlatformAdmin } = usePlatformAdmin();
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterAuthMethod, setFilterAuthMethod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [inviteData, setInviteData] = useState({
    email: "",
    role: "viewer" as AppRole,
  });

  // Apenas Platform Admins podem gerir utilizadores
  const canManageUsers = isPlatformAdmin;

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      owner: t('users.roles.owner'),
      admin: t('users.roles.admin'),
      editor: t('users.roles.editor'),
      viewer: t('users.roles.viewer'),
    };
    return labels[role] || role;
  };

  const getRoleDescription = (role: AppRole) => {
    const descriptions: Record<AppRole, string> = {
      owner: t('users.roleDescriptions.owner'),
      admin: t('users.roleDescriptions.admin'),
      editor: t('users.roleDescriptions.editor'),
      viewer: t('users.roleDescriptions.viewer'),
    };
    return descriptions[role] || role;
  };

  const getAuthMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      local: "E-mail/Password",
      sso_cca: "SSO CCA",
    };
    return labels[method] || method;
  };

  const isUserLocked = (member: any) => {
    const lockedUntil = (member.profiles as any)?.locked_until;
    if (!lockedUntil) return false;
    return new Date(lockedUntil) > new Date();
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      m.profiles?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || m.role === filterRole;
    const profileAny = m.profiles as any;
    const matchesAuthMethod = filterAuthMethod === "all" || 
      (profileAny?.auth_method || 'local') === filterAuthMethod;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "locked" ? isUserLocked(m) : !isUserLocked(m));
    return matchesSearch && matchesRole && matchesAuthMethod && matchesStatus;
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMember.mutateAsync({
        email: inviteData.email,
        role: inviteData.role as "admin" | "editor" | "viewer",
      });
      setIsInviteDialogOpen(false);
      setInviteData({ email: "", role: "viewer" });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEditRole = (member: any) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = async (newRole: AppRole) => {
    if (!selectedMember) return;
    try {
      await updateMemberRole.mutateAsync({
        memberId: selectedMember.id,
        role: newRole as "admin" | "editor" | "viewer",
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t('users.confirmRemove'))) return;
    try {
      await removeMember.mutateAsync(memberId);
    } catch (error) {
      // Error handled in hook
    }
  };

  // Calculate stats including auth methods
  const stats = {
    total: members.length,
    admins: members.filter((m) => m.role === "admin" || m.role === "owner").length,
    editors: members.filter((m) => m.role === "editor").length,
    viewers: members.filter((m) => m.role === "viewer").length,
    ssoUsers: members.filter((m) => (m.profiles as any)?.auth_method === "sso_cca").length,
    localUsers: members.filter((m) => !(m.profiles as any)?.auth_method || (m.profiles as any)?.auth_method === "local").length,
    lockedUsers: members.filter((m) => isUserLocked(m)).length,
  };

  return (
    <AppLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
          <p className="text-muted-foreground">
            {t('users.subtitle')}
          </p>
        </div>
        {canManageUsers && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('users.inviteUser')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('users.inviteNewUser')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('common.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder={t('users.emailPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('users.role')}</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value) => setInviteData({ ...inviteData, role: value as AppRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userRole === "owner" && (
                        <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                      )}
                      <SelectItem value="editor">{t('users.roles.editor')}</SelectItem>
                      <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {getRoleDescription(inviteData.role)}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? t('users.sending') : t('users.sendInvite')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('users.roles.admin')}</p>
                <p className="text-2xl font-bold text-primary">{stats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('users.roles.editor')}</p>
                <p className="text-2xl font-bold text-primary">{stats.editors}</p>
              </div>
              <Pencil className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('users.roles.viewer')}</p>
                <p className="text-2xl font-bold">{stats.viewers}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('users.stats.sso')}</p>
                <p className="text-2xl font-bold text-risk-low">{stats.ssoUsers}</p>
              </div>
              <KeyRound className="h-8 w-8 text-risk-low" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('users.stats.emailPassword')}</p>
                <p className="text-2xl font-bold text-primary">{stats.localUsers}</p>
              </div>
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('users.stats.lockedUsers')}</p>
                <p className="text-2xl font-bold text-destructive">{stats.lockedUsers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('users.permissionLevels')}</CardTitle>
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
                  <p className="text-xs text-muted-foreground">{getRoleDescription(role)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder={t('users.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('users.role')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allRoles')}</SelectItem>
            <SelectItem value="owner">{t('users.roles.owner')}</SelectItem>
            <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
            <SelectItem value="editor">{t('users.roles.editor')}</SelectItem>
            <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAuthMethod} onValueChange={setFilterAuthMethod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('users.allAuthMethods')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allAuthMethods')}</SelectItem>
            <SelectItem value="local">{t('users.authMethods.email')}</SelectItem>
            <SelectItem value="sso_cca">{t('users.authMethods.sso')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('users.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('users.status.active')}</SelectItem>
            <SelectItem value="locked">{t('users.status.locked')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.changeRole')}</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedMember.profiles?.avatar_url} />
                  <AvatarFallback>
                    {selectedMember.profiles?.nome_completo?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedMember.profiles?.nome_completo || t('users.noName')}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.profiles?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('users.newRole')}</Label>
                <div className="grid gap-2">
                  {(["admin", "editor", "viewer"] as AppRole[]).map((role) => (
                    <Button
                      key={role}
                      variant={selectedMember.role === role ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => handleUpdateRole(role)}
                      disabled={
                        selectedMember.role === "owner" ||
                        (role === "admin" && userRole !== "owner") ||
                        updateMemberRole.isPending
                      }
                    >
                      {roleIcons[role]}
                      <span className="ml-2">{getRoleLabel(role)}</span>
                      {selectedMember.role === role && (
                        <Badge variant="secondary" className="ml-auto">{t('users.current')}</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Members List */}
      {isLoadingMembers ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('users.noUsers')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('users.noUsersDescription')}
            </p>
            {canManageUsers && (
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('users.inviteUser')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map((member) => {
            const profileAny = member.profiles as any;
            const authMethod = profileAny?.auth_method || 'local';
            const isLocked = isUserLocked(member);
            const lastLogin = profileAny?.last_login_at;
            const loginAttempts = profileAny?.login_attempts || 0;
            
            return (
              <Card key={member.id} className={isLocked ? "border-destructive/50" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {member.profiles?.nome_completo?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.profiles?.nome_completo || t('users.noName')}</p>
                          {isLocked && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {t('users.blocked')}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t('users.lockedUntil', { date: format(new Date(profileAny?.locked_until), "dd/MM/yyyy HH:mm", { locale: pt }) })}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.profiles?.email}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {lastLogin && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('users.lastLogin')}: {format(new Date(lastLogin), "dd/MM/yyyy HH:mm", { locale: pt })}
                            </span>
                          )}
                          {loginAttempts > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              {t('users.failedAttempts', { count: loginAttempts })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Auth Method Badge */}
                      <Badge className={authMethodColors[authMethod]} variant="secondary">
                        {authMethodIcons[authMethod]}
                        <span className="ml-1">{getAuthMethodLabel(authMethod)}</span>
                      </Badge>
                      
                      {/* Role Badge */}
                      <Badge className={roleColors[member.role as AppRole]}>
                        {roleIcons[member.role as AppRole]}
                        <span className="ml-1">{getRoleLabel(member.role as AppRole)}</span>
                      </Badge>
                      
                      {canManageUsers && member.role !== "owner" && member.user_id !== profile?.id && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditRole(member)}>
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </AppLayout>
  );
}
