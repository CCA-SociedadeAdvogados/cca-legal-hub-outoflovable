import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Loader2, Users, Edit3, Save, X } from 'lucide-react';
import { useOrganizations, useOrganizationMembers } from '@/hooks/useOrganizations';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function MinhaOrganizacao() {
  const { currentOrganization, isLoading } = useOrganizations();
  const { members, isLoading: membersLoading } = useOrganizationMembers(currentOrganization?.id);
  const { legalHubProfile, isLoading: profileLoading } = useLegalHubProfile();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);

  if (profileLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Only for local users
  if (legalHubProfile === 'app_admin' || legalHubProfile === 'cca_manager' || legalHubProfile === 'cca_user') {
    return <Navigate to="/" replace />;
  }

  if (!currentOrganization) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Sem organização associada</h2>
          <p className="text-muted-foreground mt-2">Contacte o administrador.</p>
        </div>
      </AppLayout>
    );
  }

  // org_manager can edit; org_user is read-only
  const canEdit = legalHubProfile === 'org_manager';

  const handleStartEdit = () => {
    setOrgName(currentOrganization.name);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', currentOrganization.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organização atualizada com sucesso');
      setIsEditing(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar organização');
    } finally {
      setSaving(false);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">A Minha Organização</h1>
            <p className="text-muted-foreground mt-1">
              {canEdit ? 'Dados editáveis da sua organização.' : 'Dados da sua organização (apenas leitura).'}
            </p>
          </div>
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={handleStartEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </div>
          )}
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Organização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome</Label>
              {isEditing ? (
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 font-medium">{currentOrganization.name}</p>
              )}
            </div>
            <div>
              <Label>Identificador</Label>
              <p className="mt-1 text-muted-foreground font-mono text-sm">{currentOrganization.slug}</p>
            </div>
            {!canEdit && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                Esta página está em modo apenas leitura.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilizadores
            </CardTitle>
            <CardDescription>
              Membros da organização {currentOrganization.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {(members || []).map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar>
                      <AvatarImage src={member.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profiles?.nome_completo?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.profiles?.nome_completo || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.profiles?.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
