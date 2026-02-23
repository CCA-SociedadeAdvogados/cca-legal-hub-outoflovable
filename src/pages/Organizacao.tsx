import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizations, useOrganizationMembers } from '@/hooks/useOrganizations';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { Navigate } from 'react-router-dom';
import { generateSlug } from '@/lib/utils';
import { 
  Building2, 
  Plus, 
  Users, 
  Loader2,
  UserPlus,
  Crown,
  Shield,
  Edit3,
  Eye,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const roleIcons = {
  owner: Crown,
  admin: Shield,
  editor: Edit3,
  viewer: Eye,
};

export default function Organizacao() {
  const { t } = useTranslation();
  const { organizations, currentOrganization, userMemberships, isLoading, membershipsLoading, createOrganization, switchOrganization } = useOrganizations();
  const { members, inviteMember, updateMemberRole, removeMember } = useOrganizationMembers(currentOrganization?.id);
  const { isPlatformAdmin } = usePlatformAdmin();
  const { legalHubProfile, isLoading: profileLoading } = useLegalHubProfile();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');

  // Check if current user is the owner of the current organization
  const currentUserMembership = userMemberships?.find(
    m => m.organization_id === currentOrganization?.id
  );
  const isOwner = currentUserMembership?.role === 'owner';

  const roleLabels = {
    owner: t('organization.roles.owner'),
    admin: t('organization.roles.admin'),
    editor: t('organization.roles.editor'),
    viewer: t('organization.roles.viewer'),
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOrganization.mutateAsync({ name: newOrgName, slug: newOrgSlug });
    setCreateDialogOpen(false);
    setNewOrgName('');
    setNewOrgSlug('');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('editor');
  };

  const handleSelectOrganization = (organizationId: string) => {
    switchOrganization.mutate(organizationId);
  };

  if (isLoading || membershipsLoading || profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // CCA SSO users don't need this page — redirect to home
  if (legalHubProfile === 'cca_user' || legalHubProfile === 'cca_manager') {
    return <Navigate to="/" replace />;
  }

  // No current organization - check if user has memberships
  if (!currentOrganization) {
    const hasMemberships = userMemberships && userMemberships.length > 0;

    if (hasMemberships) {
      // User has memberships but no current organization selected - show selection
      return (
        <AppLayout>
          <div className="max-w-lg mx-auto py-12">
            <Card>
              <CardHeader className="text-center">
                <Building2 className="h-12 w-12 mx-auto text-primary mb-4" />
                <CardTitle>{t('organization.selectOrganization', 'Selecione a sua Organização')}</CardTitle>
                <CardDescription>
                  {t('organization.selectOrganizationDescription', 'Pertence às seguintes organizações. Selecione uma para continuar.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userMemberships.map((membership) => {
                  const RoleIcon = roleIcons[membership.role];
                  return (
                    <div
                      key={membership.organization_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{membership.organizations.name}</p>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit mt-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleLabels[membership.role]}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSelectOrganization(membership.organization_id)}
                        disabled={switchOrganization.isPending}
                      >
                        {switchOrganization.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('common.select', 'Selecionar')
                        )}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      );
    }

    // User has no memberships - show message to contact admin
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>{t('organization.noOrganization', 'Sem Organização')}</CardTitle>
              <CardDescription>
                {t('organization.noOrganizationDescription', 'Ainda não pertence a nenhuma organização.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                {t('organization.contactAdmin', 'Por favor contacte o administrador para ser adicionado a uma organização.')}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">{t('organization.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('organization.subtitle')}
            </p>
          </div>
          
          {/* Organization Switcher */}
          {organizations && organizations.length > 1 && (
            <Select
              value={currentOrganization.id}
              onValueChange={(value) => switchOrganization.mutate(value)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {currentOrganization.name}
            </CardTitle>
            <CardDescription>
              {t('organization.identifier')}: {currentOrganization.slug}
            </CardDescription>
          </CardHeader>
        </Card>


        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('organization.team')}
              </CardTitle>
              <CardDescription>
                {t('organization.teamDescription')}
              </CardDescription>
            </div>
            {isOwner && (
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('organization.invite')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('organization.inviteMember')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={t('organization.emailPlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">{t('organization.permission')}</Label>
                      <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{t('organization.roles.admin')}</SelectItem>
                          <SelectItem value="editor">{t('organization.roles.editor')}</SelectItem>
                          <SelectItem value="viewer">{t('organization.roles.viewer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={inviteMember.isPending}>
                      {inviteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('organization.invite')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members?.map((member) => {
                const RoleIcon = roleIcons[member.role];
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profiles?.nome_completo?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.nome_completo || t('organization.user')}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <RoleIcon className="h-3 w-3" />
                        {roleLabels[member.role]}
                      </Badge>
                      {member.role !== 'owner' && isOwner && (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(v: any) => updateMemberRole.mutate({ memberId: member.id, role: v })}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{t('organization.roles.admin')}</SelectItem>
                              <SelectItem value="editor">{t('organization.roles.editor')}</SelectItem>
                              <SelectItem value="viewer">{t('organization.roles.viewer')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemberToRemove(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Create New Organization - Only for Platform Admins */}
        {isPlatformAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>{t('organization.createNew')}</CardTitle>
              <CardDescription>
                {t('organization.createNewDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('organization.newOrganization')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('organization.createOrganization')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrg} className="space-y-4">
                    <div>
                      <Label htmlFor="newOrgName">{t('organization.name')}</Label>
                      <Input
                        id="newOrgName"
                        value={newOrgName}
                        onChange={(e) => {
                          setNewOrgName(e.target.value);
                          setNewOrgSlug(generateSlug(e.target.value));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newOrgSlug">{t('organization.identifier', 'Identificador único')}</Label>
                      <Input
                        id="newOrgSlug"
                        value={newOrgSlug}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Gerado automaticamente a partir do nome
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={createOrganization.isPending}>
                      {createOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('common.create')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('organization.removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('organization.removeMemberDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (memberToRemove) {
                removeMember.mutate(memberToRemove);
                setMemberToRemove(null);
              }
            }}>
              {t('organization.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}