import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Building2, Users, FolderOpen } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUserDepartments } from '@/hooks/useUserDepartments';
import { useDepartments } from '@/hooks/useDepartments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';

interface DeptMemberProfile {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface DeptMember {
  user_id: string;
  department_id: string;
  profile?: DeptMemberProfile;
}

export default function MeuDepartamento() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizations();
  const { legalHubProfile, isLoading: profileLoading } = useLegalHubProfile();
  const { userDepartments, isLoading: deptLoading } = useUserDepartments(
    user?.id ?? null,
    currentOrganization?.id ?? null,
  );
  const { departments: allDepts } = useDepartments(currentOrganization?.id ?? null);

  // Get members of user's departments
  const deptIds = userDepartments?.map((ud) => ud.department_id) ?? [];

  const { data: deptMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['dept-members', deptIds],
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!currentOrganization?.id || deptIds.length === 0) return [];
      const { data: ud, error } = await (supabase
        .from('user_departments' as never)
        .select('user_id, department_id')
        .in('department_id', deptIds) as unknown as Promise<{
        data: { user_id: string; department_id: string }[] | null;
        error: Error | null;
      }>);
      if (error) throw error;

      const rows = ud ?? [];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await (supabase
        .from('profiles_safe' as never)
        .select('id, nome_completo, email, avatar_url')
        .in('id', userIds) as unknown as Promise<{
        data: DeptMemberProfile[] | null;
        error: Error | null;
      }>);

      const profileRows = profiles ?? [];
      return rows.map<DeptMember>((r) => ({
        ...r,
        profile: profileRows.find((p) => p.id === r.user_id),
      }));
    },
    enabled: deptIds.length > 0 && !!currentOrganization?.id,
  });

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
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
      <div className="space-y-7 animate-fade-in">
        <header className="space-y-3">
          <Eyebrow>Equipa</Eyebrow>
          <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
            O meu <span className="italic text-brand">departamento</span>
          </h1>
          <p className="max-w-2xl font-serif text-[17px] italic leading-[1.55] text-ink-soft">
            Conteúdo e membros do{myDepts.length > 1 ? 's' : ''} seu{myDepts.length > 1 ? 's' : ''}{' '}
            departamento{myDepts.length > 1 ? 's' : ''}.
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : myDepts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/50 py-16 text-center">
            <Building2 className="mb-4 h-12 w-12 text-ink-mute" strokeWidth={1.5} />
            <h3 className="font-display text-[17px] font-medium text-ink">
              Sem departamento atribuído
            </h3>
            <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-mute">
              Ainda não foi atribuído a nenhum departamento. Contacte o administrador.
            </p>
          </div>
        ) : (
          <>
            {/* Departamentos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myDepts.map((dept) => {
                const membersInDept = (deptMembers || []).filter(
                  (m) => m.department_id === dept.id,
                );
                return (
                  <div
                    key={dept.id}
                    className="rounded-card border border-line bg-surface p-5 transition-shadow hover:shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand/10">
                          <FolderOpen className="h-4 w-4 text-brand" strokeWidth={2} />
                        </span>
                        <h3 className="font-display text-[15px] font-medium leading-snug text-ink">
                          {dept.name}
                        </h3>
                      </div>
                      {dept.is_system && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-line bg-bg-alt text-[10px] text-ink-mute"
                        >
                          Sistema
                        </Badge>
                      )}
                    </div>
                    <p className="mt-4 text-[13px] text-ink-mute">
                      <span className="font-display font-semibold tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
                        {membersInDept.length}
                      </span>{' '}
                      membro{membersInDept.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Membros do departamento */}
            <section className="rounded-card border border-line bg-surface">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <Users className="h-4 w-4 text-ink-mute" />
                <h2 className="font-display text-[19px] font-medium leading-tight tracking-[-0.005em] text-ink">
                  Membros
                </h2>
              </div>
              <div className="p-5">
                {(deptMembers || []).length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-ink-mute">Sem membros.</p>
                ) : (
                  <div className="space-y-3">
                    {/* Deduplicate by user_id */}
                    {[
                      ...new Map((deptMembers || []).map((m) => [m.user_id, m] as const)).values(),
                    ].map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center gap-3 rounded-control border border-line bg-bg-alt/40 p-3"
                      >
                        <Avatar>
                          <AvatarImage src={m.profile?.avatar_url} />
                          <AvatarFallback>{m.profile?.nome_completo?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-ink">
                            {m.profile?.nome_completo || 'Sem nome'}
                          </p>
                          <p className="truncate text-[11.5px] text-ink-mute">{m.profile?.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
