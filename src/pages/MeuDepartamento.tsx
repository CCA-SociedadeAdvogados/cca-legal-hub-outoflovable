import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Building2, Users, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUserDepartments } from '@/hooks/useUserDepartments';
import { useDepartments } from '@/hooks/useDepartments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';

export default function MeuDepartamento() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizations();
  const { legalHubProfile, isLoading: profileLoading } = useLegalHubProfile();
  const { userDepartments, isLoading: deptLoading } = useUserDepartments(
    user?.id ?? null,
    currentOrganization?.id ?? null
  );
  const { departments: allDepts } = useDepartments(currentOrganization?.id ?? null);

  // Get members of user's departments
  const deptIds = userDepartments?.map((ud) => ud.department_id) ?? [];

  const { data: deptMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['dept-members', deptIds],
    queryFn: async () => {
      if (!currentOrganization?.id || deptIds.length === 0) return [];
      const { data: ud, error } = await (supabase as any)
        .from('user_departments')
        .select('user_id, department_id')
        .in('department_id', deptIds);
      if (error) throw error;

      const userIds = [...new Set((ud || []).map((r: any) => r.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await (supabase as any)
        .from('profiles_safe')
        .select('id, nome_completo, email, avatar_url')
        .in('id', userIds);

      return (ud || []).map((r: any) => ({
        ...r,
        profile: (profiles || []).find((p: any) => p.id === r.user_id),
      }));
    },
    enabled: deptIds.length > 0 && !!currentOrganization?.id,
  });

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Only accessible for non-admin, non-org-manager profiles
  if (legalHubProfile === 'app_admin') {
    return <Navigate to="/" replace />;
  }

  const myDepts = allDepts?.filter((d) => deptIds.includes(d.id)) ?? [];

  const isLoading = deptLoading || membersLoading;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-serif">O Meu Departamento</h1>
          <p className="text-muted-foreground mt-1">
            Conteúdo e membros do{myDepts.length > 1 ? 's' : ''} seu{myDepts.length > 1 ? 's' : ''} departamento{myDepts.length > 1 ? 's' : ''}.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : myDepts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sem departamento atribuído</h3>
              <p className="text-muted-foreground">
                Ainda não foi atribuído a nenhum departamento. Contacte o administrador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Departamentos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myDepts.map((dept) => {
                const membersInDept = (deptMembers || []).filter(
                  (m: any) => m.department_id === dept.id
                );
                return (
                  <Card key={dept.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        {dept.name}
                      </CardTitle>
                      {dept.is_system && (
                        <Badge variant="secondary" className="w-fit text-xs">Sistema</Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {membersInDept.length} membro{membersInDept.length !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Membros do departamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Membros
                </CardTitle>
                <CardDescription>
                  Utilizadores nos seus departamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(deptMembers || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Sem membros.</p>
                ) : (
                  <div className="space-y-3">
                    {/* Deduplicate by user_id */}
                    {[
                      ...new Map(
                        (deptMembers || []).map((m: any) => [m.user_id, m])
                      ).values(),
                    ].map((m: any) => (
                      <div key={m.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar>
                          <AvatarImage src={m.profile?.avatar_url} />
                          <AvatarFallback>
                            {m.profile?.nome_completo?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {m.profile?.nome_completo || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
