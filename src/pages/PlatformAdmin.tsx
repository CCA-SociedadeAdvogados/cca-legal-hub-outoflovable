import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePlatformAdmin, OrganizationMember, CreateUserPayload, CreateUserResponse } from "@/hooks/usePlatformAdmin";
import { useAllUsersMetrics, AllMembersEntry } from "@/hooks/useAllUsersMetrics";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/utils";
import { IndustrySectorSelect } from "@/components/organizations/IndustrySectorSelect";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { DepartmentsConfig } from "@/components/admin/DepartmentsConfig";
import { OrgSharePointConfig } from "@/components/admin/OrgSharePointConfig";
import { OrgLegalBiConfig } from "@/components/admin/OrgLegalBiConfig";
import {
  Building2,
  FileCheck,
  Users,
  Shield,
  Trash2,
  Plus,
  Search,
  Pencil,
  UserCog,
  Crown,
  Eye,
  Mail,
  Lock,
  KeyRound,
  Clock,
  AlertTriangle,
  UserCheck,
  LogIn,
  History,
  UserPlus,
  Copy,
  Check,
  Briefcase,
  Folders,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = Database["public"]["Enums"]["app_role"];

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  ativo: "bg-risk-low/10 text-risk-low",
  expirado: "bg-destructive/10 text-destructive",
  pendente_assinatura: "bg-risk-medium/10 text-risk-medium",
  em_revisao: "bg-primary/10 text-primary",
  cancelado: "bg-destructive/10 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
};

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

export default function PlatformAdmin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { startImpersonation, startUserImpersonation, isImpersonating } = useImpersonation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "impersonation";
  const [selectedUsersOrgId, setSelectedUsersOrgId] = useState<string | null>(null);
  const [selectedDeptOrgId, setSelectedDeptOrgId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newOrgSectors, setNewOrgSectors] = useState<string[]>([]);
  const [newOrgLegalBiUrl, setNewOrgLegalBiUrl] = useState("");
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<{ id: string; name: string; slug: string; industry_sectors?: string[] | null } | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgSlug, setEditOrgSlug] = useState("");
  const [editOrgSectors, setEditOrgSectors] = useState<string[]>([]);
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<AppRole>("viewer");
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  
  const [pendingMemberAdd, setPendingMemberAdd] = useState<{
    email: string;
    role: AppRole;
    currentOrgName: string;
  } | null>(null);
  const [isConfirmMoveOpen, setIsConfirmMoveOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [createdUserCredentials, setCreatedUserCredentials] = useState<CreateUserResponse | null>(null);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Estado para impersonation de org
  const [impersonationReason, setImpersonationReason] = useState("");
  const [isImpersonationDialogOpen, setIsImpersonationDialogOpen] = useState(false);
  const [selectedOrgForImpersonation, setSelectedOrgForImpersonation] = useState<{ id: string; name: string } | null>(null);
  
  // Estado para impersonation de utilizador individual
  const [isUserImpersonationDialogOpen, setIsUserImpersonationDialogOpen] = useState(false);
  const [selectedUserForImpersonation, setSelectedUserForImpersonation] = useState<AllMembersEntry | null>(null);
  const [userImpersonationReason, setUserImpersonationReason] = useState("");
  
  const [userToDelete, setUserToDelete] = useState<AllMembersEntry | null>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    globalStats,
    isLoadingStats,
    allOrganizations,
    isLoadingOrgs,
    allContracts,
    isLoadingContracts,
    platformAdmins,
    isLoadingAdmins,
    addPlatformAdmin,
    removePlatformAdmin,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    useOrganizationMembers,
    updateMemberRole,
    removeMember,
    addMemberToOrg,
    createUser,
    isPlatformAdmin,
  } = usePlatformAdmin();

  // Query para métricas globais de utilizadores
  const { allMembers, isLoadingMembers: isLoadingAllMembers, userMetrics, isLoadingMetrics } = useAllUsersMetrics(isPlatformAdmin);

  // Query para obter membros da organização selecionada (para sheet de gestão)
  const { data: orgMembers, isLoading: isLoadingOrgMembers } = useOrganizationMembers(selectedOrg?.id || null);

  // Query para histórico de impersonation
  const { data: impersonationHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['impersonation-history'],
    queryFn: async () => {
      // Expire stale sessions before fetching history
      await supabase.rpc('expire_stale_impersonation_sessions');
      
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .select(`
          *,
          organizations:impersonated_organization_id (name)
        `)
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation para eliminar utilizador
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allMembersWithProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["global-stats"] });
      toast({
        title: t("common.success"),
        description: t("admin.userDeletedSuccess", "Utilizador eliminado com sucesso"),
      });
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.userDeleteError", "Erro ao eliminar utilizador"),
        variant: "destructive",
      });
    }
  });

  // Handler para abrir diálogo de eliminar utilizador
  const handleOpenDeleteUserDialog = (member: AllMembersEntry) => {
    setUserToDelete(member);
    setIsDeleteUserDialogOpen(true);
  };

  // Handler para mudar de tab
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Filtra organizações pelo termo de pesquisa
  const filteredOrganizations = allOrganizations?.filter(
    (org) => org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
             org.slug.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      owner: t('users.roles.owner', 'Proprietário'),
      admin: t('users.roles.admin', 'Administrador'),
      editor: t('users.roles.editor', 'Editor'),
      viewer: t('users.roles.viewer', 'Visualizador'),
    };
    return labels[role] || role;
  };

  const isUserLocked = (member: OrganizationMember) => {
    const lockedUntil = member.profiles?.locked_until;
    if (!lockedUntil) return false;
    return new Date(lockedUntil) > new Date();
  };
  
  const handleStartImpersonation = async () => {
    if (!selectedOrgForImpersonation || impersonationReason.trim().length < 5) {
      toast({
        title: t("common.error"),
        description: "Motivo deve ter pelo menos 5 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      await startImpersonation(
        selectedOrgForImpersonation.id,
        selectedOrgForImpersonation.name,
        impersonationReason.trim()
      );
      toast({
        title: t("common.success"),
        description: `A atuar no contexto de ${selectedOrgForImpersonation.name}`,
      });
      setIsImpersonationDialogOpen(false);
      setImpersonationReason("");
      setSelectedOrgForImpersonation(null);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao iniciar impersonation",
        variant: "destructive",
      });
    }
  };
  
  const openImpersonationDialog = (org: { id: string; name: string }) => {
    setSelectedOrgForImpersonation(org);
    setImpersonationReason("");
    setIsImpersonationDialogOpen(true);
  };

  const handleAddAdmin = async () => {
    if (!searchEmail.trim()) return;

    try {
      // Find user by email
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", searchEmail.trim())
        .single();

      if (error || !profile) {
        toast({
          title: t("common.error"),
          description: "Utilizador não encontrado",
          variant: "destructive",
        });
        return;
      }

      await addPlatformAdmin.mutateAsync({
        userId: profile.id,
        notes: `Adicionado via interface - ${profile.email}`,
      });

      toast({
        title: t("common.success"),
        description: "Platform admin adicionado com sucesso",
      });
      setSearchEmail("");
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao adicionar admin",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      await removePlatformAdmin.mutateAsync(adminId);
      toast({
        title: t("common.success"),
        description: "Platform admin removido",
      });
    } catch {
      toast({
        title: t("common.error"),
        description: "Erro ao remover admin",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) {
      toast({
        title: t("common.error"),
        description: "Nome e slug são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      await createOrganization.mutateAsync({
        name: newOrgName.trim(),
        slug: newOrgSlug.trim().toLowerCase().replace(/\s+/g, "-"),
        industrySectors: newOrgSectors,
        legalbiUrl: newOrgLegalBiUrl.trim() || undefined,
      });
      toast({
        title: t("common.success"),
        description: "Organização criada com sucesso",
      });
      setNewOrgName("");
      setNewOrgSlug("");
      setNewOrgSectors([]);
      setNewOrgLegalBiUrl("");
      setIsCreateOrgOpen(false);
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao criar organização",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    try {
      await deleteOrganization.mutateAsync(orgId);
      toast({
        title: t("common.success"),
        description: `Organização "${orgName}" eliminada`,
      });
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao eliminar organização",
        variant: "destructive",
      });
    }
  };

  const handleEditOrganization = (org: { id: string; name: string; slug: string; industry_sectors?: string[] | null }) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
    setEditOrgSlug(org.slug);
    setEditOrgSectors(org.industry_sectors || []);
    setIsEditOrgOpen(true);
  };

  const handleUpdateOrganization = async () => {
    if (!editingOrg || !editOrgName.trim() || !editOrgSlug.trim()) {
      toast({
        title: t("common.error"),
        description: "Nome e slug são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateOrganization.mutateAsync({
        id: editingOrg.id,
        name: editOrgName.trim(),
        slug: editOrgSlug.trim().toLowerCase().replace(/\s+/g, "-"),
        industrySectors: editOrgSectors,
      });
      toast({
        title: t("common.success"),
        description: "Organização atualizada com sucesso",
      });
      setEditingOrg(null);
      setEditOrgName("");
      setEditOrgSlug("");
      setEditOrgSectors([]);
      setIsEditOrgOpen(false);
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao atualizar organização",
        variant: "destructive",
      });
    }
  };

  // Handlers para gestão de membros da organização
  const handleViewOrgMembers = (org: { id: string; name: string }) => {
    setSelectedOrg(org);
    setIsMembersSheetOpen(true);
  };

  const handleAddMemberToOrg = async () => {
    if (!selectedOrg || !newMemberEmail.trim()) {
      toast({
        title: t("common.error"),
        description: "Email é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      await addMemberToOrg.mutateAsync({
        orgId: selectedOrg.id,
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      toast({
        title: t("common.success"),
        description: "Utilizador adicionado à organização",
      });
      setNewMemberEmail("");
      setNewMemberRole("viewer");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('USER_IN_OTHER_ORG:')) {
        const currentOrgName = error.message.split(':')[1];
        setPendingMemberAdd({
          email: newMemberEmail.trim(),
          role: newMemberRole,
          currentOrgName,
        });
        setIsConfirmMoveOpen(true);
      } else {
        toast({
          title: t("common.error"),
          description: error instanceof Error ? error.message : "Erro ao adicionar utilizador",
          variant: "destructive",
        });
      }
    }
  };

  const handleConfirmMoveUser = async () => {
    if (!pendingMemberAdd || !selectedOrg) return;
    
    try {
      await addMemberToOrg.mutateAsync({
        orgId: selectedOrg.id,
        email: pendingMemberAdd.email,
        role: pendingMemberAdd.role,
        forceMove: true,
      });
      toast({
        title: t("common.success"),
        description: "Utilizador movido para esta organização",
      });
      setNewMemberEmail("");
      setNewMemberRole("viewer");
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao mover utilizador",
        variant: "destructive",
      });
    }
    setIsConfirmMoveOpen(false);
    setPendingMemberAdd(null);
  };

  // Handler para criar novo utilizador
  const handleCreateUser = async () => {
    if (!selectedOrg || !newUserEmail.trim() || !newUserName.trim()) {
      toast({
        title: t("common.error"),
        description: "Email e nome são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createUser.mutateAsync({
        email: newUserEmail.trim(),
        nome_completo: newUserName.trim(),
        organizationId: selectedOrg.id,
        role: newUserRole,
        password: newUserPassword || undefined,
      });

      // Check if it's an existing user (no credentials returned)
      if (result.existingUser) {
        toast({
          title: t("common.success"),
          description: "Utilizador existente adicionado à organização. Pode usar as credenciais existentes.",
        });
      } else {
        // Store credentials to show in dialog for new users
        setCreatedUserCredentials(result);
        setIsCredentialsDialogOpen(true);
        
        toast({
          title: t("common.success"),
          description: "Utilizador criado com sucesso!",
        });
      }
      
      setIsCreateUserOpen(false);
      
      // Reset form
      setNewUserEmail("");
      setNewUserName("");
      setNewUserRole("viewer");
      setNewUserPassword("");
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao criar utilizador",
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleEditMember = (member: OrganizationMember) => {
    setEditingMember(member);
    setIsEditMemberOpen(true);
  };

  const handleUpdateMemberRole = async (newRole: AppRole) => {
    if (!editingMember) return;
    try {
      await updateMemberRole.mutateAsync({
        memberId: editingMember.id,
        role: newRole,
      });
      toast({
        title: t("common.success"),
        description: "Papel do utilizador atualizado",
      });
      setIsEditMemberOpen(false);
      setEditingMember(null);
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao atualizar papel",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast({
        title: t("common.success"),
        description: "Utilizador removido da organização",
      });
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Erro ao remover utilizador",
        variant: "destructive",
      });
    }
  };

  const filteredContracts = allContracts?.filter(
    (c) =>
      c.titulo_contrato.toLowerCase().includes(contractSearch.toLowerCase()) ||
      c.id_interno.toLowerCase().includes(contractSearch.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-serif">
            {t("admin.title", "Administração da Plataforma")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.subtitle", "Gestão global de organizações e contratos")}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.organizations", "Organizações")}
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : globalStats?.totalOrganizations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.contracts", "Contratos")}
              </CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : globalStats?.totalContracts}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.users", "Utilizadores")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : globalStats?.totalUsers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.platformAdmins", "Platform Admins")}
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingAdmins ? "..." : platformAdmins?.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} value={searchParams.get("tab") || "impersonation"} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="impersonation">
              <UserCheck className="h-4 w-4 mr-2" />
              Impersonation
            </TabsTrigger>
            <TabsTrigger value="organizations">
              <Building2 className="h-4 w-4 mr-2" />
              {t("admin.organizations", "Organizações")}
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              {t("nav.users", "Utilizadores")}
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileCheck className="h-4 w-4 mr-2" />
              {t("admin.allContracts", "Todos os Contratos")}
            </TabsTrigger>
            <TabsTrigger value="admins">
              <Shield className="h-4 w-4 mr-2" />
              {t("admin.platformAdmins", "Platform Admins")}
            </TabsTrigger>
          </TabsList>

          {/* Impersonation Tab */}
          <TabsContent value="impersonation">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Selecionar Organização */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Entrar no Contexto
                  </CardTitle>
                  <CardDescription>
                    Selecione uma organização para visualizar e configurar como se fosse um utilizador dela.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isImpersonating && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Já está em modo impersonation. Saia primeiro para selecionar outra organização.
                      </p>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar organização..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="pl-9"
                      disabled={isImpersonating}
                    />
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {isLoadingOrgs ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : filteredOrganizations?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma organização encontrada
                      </p>
                    ) : (
                      filteredOrganizations?.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-sm text-muted-foreground">{org.slug}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openImpersonationDialog(org)}
                            disabled={isImpersonating}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Entrar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Histórico de Impersonation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Sessões
                  </CardTitle>
                  <CardDescription>
                    Últimas sessões de impersonation realizadas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : !impersonationHistory || impersonationHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma sessão registada
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {impersonationHistory.map((session) => (
                        <div key={session.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {(session.organizations as { name: string } | null)?.name || 'Organização removida'}
                              </span>
                            </div>
                            <Badge 
                              variant={
                                session.status === 'active' ? 'default' : 
                                session.status === 'expired' ? 'outline' : 
                                'secondary'
                              }
                              className={session.status === 'expired' ? 'border-yellow-500 text-yellow-600' : ''}
                            >
                              {session.status === 'active' ? t('platformAdmin.impersonation.statusActive', 'Ativa') : 
                               session.status === 'expired' ? t('platformAdmin.impersonation.statusExpired', 'Expirada') : 
                               t('platformAdmin.impersonation.statusEnded', 'Terminada')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.reason}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(session.started_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                            </span>
                            {session.ended_at && (
                              <span>
                                → {format(new Date(session.ended_at), "HH:mm", { locale: pt })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("admin.organizations", "Organizações")}</CardTitle>
                  <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Organização
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Nova Organização</DialogTitle>
                        <DialogDescription>
                          Preencha os dados para criar uma nova organização na plataforma.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid gap-2">
                          <Label htmlFor="org-name">{t("common.name", "Nome")}</Label>
                          <Input
                            id="org-name"
                            value={newOrgName}
                            onChange={(e) => {
                              setNewOrgName(e.target.value);
                              setNewOrgSlug(generateSlug(e.target.value));
                            }}
                            placeholder="Nome da organização"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="org-slug">Identificador único</Label>
                          <Input
                            id="org-slug"
                            value={newOrgSlug}
                            onChange={(e) => setNewOrgSlug(e.target.value)}
                            placeholder="identificador-da-organizacao"
                          />
                          <p className="text-xs text-muted-foreground">
                            Gerado automaticamente, mas pode ser personalizado
                          </p>
                        </div>
                        <IndustrySectorSelect
                          selectedSectors={newOrgSectors}
                          onSectorsChange={setNewOrgSectors}
                        />
                        <div className="grid gap-2">
                          <Label htmlFor="org-legalbi-url">URL LegalBI</Label>
                          <Input
                            id="org-legalbi-url"
                            value={newOrgLegalBiUrl}
                            onChange={(e) => setNewOrgLegalBiUrl(e.target.value)}
                            placeholder="https://bi.cca.law/..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Opcional. Pode ser configurado/alterado posteriormente através da edição.
                          </p>
                        </div>
                        {/* SharePoint will be configured after org creation via Edit */}
                        <p className="text-xs text-muted-foreground italic">
                          A configuração SharePoint pode ser adicionada após criar a organização, através da edição.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOrgOpen(false)}>
                          {t("common.cancel", "Cancelar")}
                        </Button>
                        <Button onClick={handleCreateOrganization} disabled={createOrganization.isPending}>
                          {createOrganization.isPending ? "A criar..." : "Criar Organização"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingOrgs ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name", "Nome")}</TableHead>
                        <TableHead>Identificador único</TableHead>
                        <TableHead>Áreas de Atuação</TableHead>
                        <TableHead>{t("common.createdAt", "Criado em")}</TableHead>
                        <TableHead className="w-[100px]">{t("common.actions", "Ações")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrganizations?.map((org) => {
                        const sectors = (org as { industry_sectors?: string[] | null }).industry_sectors || [];
                        return (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{org.slug}</Badge>
                            </TableCell>
                            <TableCell>
                              {sectors.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    {sectors.length} área{sectors.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(org.created_at), "dd MMM yyyy", {
                                locale: pt,
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewOrgMembers(org)}
                                  title="Ver utilizadores"
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditOrganization({
                                    id: org.id,
                                    name: org.name,
                                    slug: org.slug,
                                    industry_sectors: (org as { industry_sectors?: string[] | null }).industry_sectors,
                                  })}
                                  title="Editar organização"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={deleteOrganization.isPending}
                                      title="Eliminar organização"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Eliminar Organização</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem a certeza que deseja eliminar a organização "{org.name}"? 
                                        Esta ação não pode ser revertida e todos os dados associados serão perdidos.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t("common.cancel", "Cancelar")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteOrganization(org.id, org.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!allOrganizations || allOrganizations.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhuma organização encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Edit Organization Dialog */}
            <Dialog open={isEditOrgOpen} onOpenChange={setIsEditOrgOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Organização</DialogTitle>
                  <DialogDescription>
                    Altere os dados da organização.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-org-name">{t("common.name", "Nome")}</Label>
                    <Input
                      id="edit-org-name"
                      value={editOrgName}
                      onChange={(e) => setEditOrgName(e.target.value)}
                      placeholder="Nome da organização"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-org-slug">Identificador único</Label>
                    <Input
                      id="edit-org-slug"
                      value={editOrgSlug}
                      onChange={(e) => setEditOrgSlug(e.target.value)}
                      placeholder="identificador-da-organizacao"
                    />
                    <p className="text-xs text-muted-foreground">
                      Apenas Platform Admins podem alterar o identificador
                    </p>
                  </div>
                  <IndustrySectorSelect
                    selectedSectors={editOrgSectors}
                    onSectorsChange={setEditOrgSectors}
                  />
                  <OrgSharePointConfig organizationId={editingOrg?.id || null} />
                  <OrgLegalBiConfig organizationId={editingOrg?.id || null} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOrgOpen(false)}>
                    {t("common.cancel", "Cancelar")}
                  </Button>
                  <Button onClick={handleUpdateOrganization} disabled={updateOrganization.isPending}>
                    {updateOrganization.isPending ? "A guardar..." : "Guardar Alterações"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUsersTab
              organizations={allOrganizations}
              isLoadingOrgs={isLoadingOrgs}
              allMembers={allMembers}
              isLoadingMembers={isLoadingAllMembers}
              userMetrics={userMetrics}
              isLoadingMetrics={isLoadingMetrics}
              selectedOrgId={selectedUsersOrgId}
              onOrgChange={setSelectedUsersOrgId}
              onViewOrgMembers={handleViewOrgMembers}
              onDeleteUser={handleOpenDeleteUserDialog}
              isDeletingUser={deleteUser.isPending}
              currentUserId={user?.id}
            />
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("admin.allContracts", "Todos os Contratos")}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("common.search", "Pesquisar...")}
                      value={contractSearch}
                      onChange={(e) => setContractSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingContracts ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>{t("contracts.title", "Título")}</TableHead>
                        <TableHead>{t("admin.organization", "Organização")}</TableHead>
                        <TableHead>{t("contracts.status", "Estado")}</TableHead>
                        <TableHead>{t("common.createdAt", "Criado em")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContracts?.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell>
                            <Badge variant="outline">{contract.id_interno}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {contract.titulo_contrato}
                          </TableCell>
                          <TableCell>
                            {(contract.organization as { name: string } | null)?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[contract.estado_contrato] || ""}>
                              {t(`status.${contract.estado_contrato}`, contract.estado_contrato)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(contract.created_at), "dd MMM yyyy", {
                              locale: pt,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!filteredContracts || filteredContracts.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum contrato encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Admins Tab */}
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("admin.platformAdmins", "Platform Admins")}</CardTitle>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email do utilizador..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="w-64"
                    />
                    <Button onClick={handleAddAdmin} disabled={addPlatformAdmin.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("admin.addAdmin", "Adicionar")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAdmins ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.email", "Email")}</TableHead>
                        <TableHead>{t("common.name", "Nome")}</TableHead>
                        <TableHead>{t("common.notes", "Notas")}</TableHead>
                        <TableHead>{t("common.createdAt", "Adicionado em")}</TableHead>
                        <TableHead className="w-[100px]">{t("common.actions", "Ações")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platformAdmins?.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            {admin.profile?.email || admin.user_id}
                          </TableCell>
                          <TableCell>
                            {admin.profile?.nome_completo || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {admin.notes || "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(admin.created_at), "dd MMM yyyy", {
                              locale: pt,
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAdmin(admin.id)}
                              disabled={removePlatformAdmin.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!platformAdmins || platformAdmins.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum platform admin encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sheet para ver/editar membros da organização */}
        <Sheet open={isMembersSheetOpen} onOpenChange={setIsMembersSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Utilizadores - {selectedOrg?.name}
              </SheetTitle>
              <SheetDescription>
                Gerir utilizadores desta organização
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Criar novo utilizador */}
              <div className="p-4 border-2 border-primary/20 rounded-lg space-y-4 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-primary" />
                      Criar Novo Utilizador
                    </h4>
                    <p className="text-sm text-muted-foreground">Criar um novo utilizador nesta organização</p>
                  </div>
                  <Button onClick={() => setIsCreateUserOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Utilizador
                  </Button>
                </div>
              </div>

              {/* Adicionar utilizador existente */}
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <h4 className="font-medium">Adicionar Utilizador Existente</h4>
                <p className="text-sm text-muted-foreground">Adicionar um utilizador que já existe na plataforma</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email do utilizador existente..."
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as AppRole)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleAddMemberToOrg} disabled={addMemberToOrg.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Lista de membros */}
              <div className="space-y-3">
                <h4 className="font-medium">Membros ({orgMembers?.length || 0})</h4>
                
                {isLoadingOrgMembers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : orgMembers?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum utilizador nesta organização</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgMembers?.map((member) => {
                      const isLocked = isUserLocked(member);
                      const authMethod = member.profiles?.auth_method || 'local';
                      
                      return (
                        <Card key={member.id} className={isLocked ? "border-destructive/50" : ""}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={member.profiles?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {member.profiles?.nome_completo?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">
                                      {member.profiles?.nome_completo || "Sem nome"}
                                    </p>
                                    {isLocked && (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Bloqueado
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {member.profiles?.email}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    {authMethod === 'sso_cca' ? (
                                      <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">
                                        <KeyRound className="h-3 w-3 mr-1" />
                                        SSO
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-700">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Email
                                      </Badge>
                                    )}
                                    {member.profiles?.last_login_at && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(member.profiles.last_login_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={roleColors[member.role]}>
                                  {roleIcons[member.role]}
                                  <span className="ml-1">{getRoleLabel(member.role)}</span>
                                </Badge>
                                {member.role !== "owner" && (
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditMember(member)}
                                    >
                                      <UserCog className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          disabled={removeMember.isPending}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remover Utilizador</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Tem a certeza que deseja remover "{member.profiles?.nome_completo || member.profiles?.email}" desta organização?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Remover
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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
            </div>
          </SheetContent>
        </Sheet>

        {/* Dialog para editar role do membro */}
        <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Papel do Utilizador</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar>
                    <AvatarImage src={editingMember.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {editingMember.profiles?.nome_completo?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{editingMember.profiles?.nome_completo || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{editingMember.profiles?.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Novo Papel</Label>
                  <div className="grid gap-2">
                    {(["admin", "editor", "viewer"] as AppRole[]).map((role) => (
                      <Button
                        key={role}
                        variant={editingMember.role === role ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => handleUpdateMemberRole(role)}
                        disabled={updateMemberRole.isPending}
                      >
                        {roleIcons[role]}
                        <span className="ml-2">{getRoleLabel(role)}</span>
                        {editingMember.role === role && (
                          <Badge variant="secondary" className="ml-auto">Atual</Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsEditMemberOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar mudança de organização */}
        <AlertDialog open={isConfirmMoveOpen} onOpenChange={setIsConfirmMoveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mover Utilizador</AlertDialogTitle>
              <AlertDialogDescription>
                O utilizador <strong>{pendingMemberAdd?.email}</strong> já pertence à organização <strong>"{pendingMemberAdd?.currentOrgName}"</strong>.
                <br /><br />
                Deseja movê-lo para <strong>"{selectedOrg?.name}"</strong>? Ele será removido da organização atual.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingMemberAdd(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmMoveUser}>
                Mover Utilizador
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog para impersonation */}
        <Dialog open={isImpersonationDialogOpen} onOpenChange={setIsImpersonationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Entrar no Contexto
              </DialogTitle>
              <DialogDescription>
                Vai atuar no contexto de <strong>{selectedOrgForImpersonation?.name}</strong>. 
                Por favor, indique o motivo desta ação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ Esta ação será registada para auditoria. Verá a plataforma exatamente como um utilizador desta organização.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="impersonation-reason">Motivo (obrigatório)</Label>
                <Textarea
                  id="impersonation-reason"
                  placeholder="Ex: Configuração inicial da home page do cliente..."
                  value={impersonationReason}
                  onChange={(e) => setImpersonationReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 5 caracteres
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImpersonationDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleStartImpersonation}
                disabled={impersonationReason.trim().length < 5}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar no Contexto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para criar novo utilizador */}
        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Criar Novo Utilizador
              </DialogTitle>
              <DialogDescription>
                Criar um novo utilizador para a organização "{selectedOrg?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email *</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="utilizador@empresa.pt"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Nome Completo *</Label>
                <Input
                  id="new-user-name"
                  placeholder="Nome do utilizador"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Papel na Organização *</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrador
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Editor
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Visualizador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-password">Palavra-passe (opcional)</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  placeholder="Deixe vazio para gerar automaticamente"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className={newUserPassword.length > 0 && newUserPassword.length < 8 ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Se deixar vazio, será gerada uma palavra-passe segura automaticamente
                </p>
                {newUserPassword.length > 0 && newUserPassword.length < 8 && (
                  <p className="text-xs text-destructive">
                    A palavra-passe deve ter pelo menos 8 caracteres
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={createUser.isPending || !newUserEmail.trim() || !newUserName.trim() || (newUserPassword.length > 0 && newUserPassword.length < 8)}
              >
                {createUser.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    A criar...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Utilizador
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para mostrar credenciais do utilizador criado */}
        <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Utilizador Criado com Sucesso!
              </DialogTitle>
              <DialogDescription>
                Partilhe as credenciais abaixo com o utilizador. Esta é a única vez que a palavra-passe será exibida.
              </DialogDescription>
            </DialogHeader>
            {createdUserCredentials && createdUserCredentials.credentials && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-mono font-medium">{createdUserCredentials.credentials.email}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleCopyToClipboard(createdUserCredentials.credentials!.email, 'email')}
                    >
                      {copiedField === 'email' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Palavra-passe</p>
                      <p className="font-mono font-medium">{createdUserCredentials.credentials.password}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleCopyToClipboard(createdUserCredentials.credentials!.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ Guarde estas credenciais agora. A palavra-passe não será mostrada novamente.
                  </p>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => {
                    const text = `Email: ${createdUserCredentials.credentials!.email}\nPalavra-passe: ${createdUserCredentials.credentials!.password}`;
                    handleCopyToClipboard(text, 'all');
                  }}
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Tudo
                    </>
                  )}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button 
                onClick={() => {
                  setIsCredentialsDialogOpen(false);
                  setCreatedUserCredentials(null);
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar eliminação de utilizador */}
        <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("admin.deleteUserTitle", "Eliminar Utilizador")}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    {t("admin.deleteUserConfirm", "Tem a certeza que pretende eliminar permanentemente o utilizador")}{" "}
                    <strong>{userToDelete?.profiles?.nome_completo || userToDelete?.profiles?.email}</strong>?
                  </p>
                  
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                    <p className="font-medium text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {t("admin.deleteUserWarning", "ATENÇÃO: Esta ação é irreversível!")}
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>{t("admin.deleteUserWarning1", "O utilizador será removido de todas as organizações")}</li>
                      <li>{t("admin.deleteUserWarning2", "Todos os dados associados serão eliminados")}</li>
                      {userToDelete?.profiles?.auth_method === 'sso_cca' && (
                        <li className="text-amber-600 dark:text-amber-400">
                          {t("admin.deleteUserSsoWarning", "Utilizadores SSO podem criar nova conta através do SSO CCA")}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                {t("common.cancel", "Cancelar")}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => userToDelete && deleteUser.mutate(userToDelete.user_id)}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending 
                  ? t("admin.deletingUser", "A eliminar...") 
                  : t("admin.confirmDeleteUser", "Eliminar Utilizador")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
