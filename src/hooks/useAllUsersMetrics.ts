import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserMetricsData } from "@/components/admin/AdminUserMetrics";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface AllMembersEntry {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
  is_platform_admin: boolean;
  profiles: {
    id: string | null;
    email: string | null;
    nome_completo: string | null;
    avatar_url: string | null;
    auth_method: string | null;
    last_login_at: string | null;
    locked_until: string | null;
    login_attempts: number | null;
  } | null;
  organization: {
    name: string;
  } | null;
  departments: DepartmentRef[];
}

export function useAllUsersMetrics(isPlatformAdmin: boolean) {
  const { data: allMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["allMembersWithProfiles"],
    queryFn: async (): Promise<AllMembersEntry[]> => {
      // 1. Fetch ALL profiles (base list — every user in the system)
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles_safe")
        .select("id, email, nome_completo, avatar_url, auth_method, last_login_at, locked_until, login_attempts");

      if (profilesError) throw profilesError;
      if (!allProfiles || allProfiles.length === 0) return [];

      const allUserIds = allProfiles.map(p => p.id);

      // 2. Fetch org memberships, platform_admins and departments in parallel
      const [membersResult, platformAdminsResult] = await Promise.all([
        supabase
          .from("organization_members")
          .select(`id, user_id, organization_id, role, created_at`)
          .in("user_id", allUserIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("platform_admins")
          .select("user_id")
          .in("user_id", allUserIds),
      ]);

      if (membersResult.error) throw membersResult.error;

      const members = membersResult.data || [];
      const orgIds = [...new Set(members.map(m => m.organization_id))];

      // 3. Fetch departments only for users that have org memberships
      let deptMap = new Map<string, DepartmentRef[]>();
      if (members.length > 0 && orgIds.length > 0) {
        const memberUserIds = [...new Set(members.map(m => m.user_id))];
        const { data: userDeptsData } = await supabase
          .from("user_departments" as any)
          .select("user_id, organization_id, department_id, departments:department_id(id, name)")
          .in("user_id", memberUserIds)
          .in("organization_id", orgIds);

        for (const ud of (userDeptsData as any[] || [])) {
          const key = `${ud.user_id}_${ud.organization_id}`;
          if (!deptMap.has(key)) deptMap.set(key, []);
          const dept = ud.departments as { id: string; name: string } | null;
          if (dept) deptMap.get(key)!.push({ id: dept.id, name: dept.name });
        }
      }

      const profilesMap = new Map(allProfiles.map(p => [p.id, p]));
      const platformAdminSet = new Set(
        (platformAdminsResult.data || []).map((pa: { user_id: string }) => pa.user_id)
      );

      // Track which users already have an org membership entry
      const usersWithMembership = new Set<string>();

      // 4a. One entry per org membership (preserves multi-org users)
      const memberEntries: AllMembersEntry[] = members.map(member => {
        usersWithMembership.add(member.user_id);
        return {
          id: member.id,
          user_id: member.user_id,
          organization_id: member.organization_id,
          role: member.role,
          created_at: member.created_at,
          is_platform_admin: platformAdminSet.has(member.user_id),
          profiles: profilesMap.get(member.user_id) || null,
          organization: member.organization as { name: string } | null,
          departments: deptMap.get(`${member.user_id}_${member.organization_id}`) || [],
        };
      });

      // 4b. Users with no org membership still appear (sem organização)
      const noOrgEntries: AllMembersEntry[] = allProfiles
        .filter(p => !usersWithMembership.has(p.id))
        .map(p => ({
          id: p.id,
          user_id: p.id,
          organization_id: "",
          role: "viewer" as AppRole,
          created_at: new Date().toISOString(),
          is_platform_admin: platformAdminSet.has(p.id),
          profiles: p,
          organization: null,
          departments: [],
        }));

      return [...memberEntries, ...noOrgEntries];
    },
    enabled: !!isPlatformAdmin,
  });

  const userMetrics: UserMetricsData | null = allMembers ? {
    total: allMembers.length,
    admins: allMembers.filter((m) => m.role === "admin" || m.role === "owner").length,
    editors: allMembers.filter((m) => m.role === "editor").length,
    viewers: allMembers.filter((m) => m.role === "viewer").length,
    ssoUsers: allMembers.filter((m) => m.profiles?.auth_method === "sso_cca").length,
    localUsers: allMembers.filter((m) => !m.profiles?.auth_method || m.profiles?.auth_method === "local").length,
    lockedUsers: allMembers.filter((m) => {
      const lockedUntil = m.profiles?.locked_until;
      return lockedUntil && new Date(lockedUntil) > new Date();
    }).length,
  } : null;

  return {
    allMembers,
    isLoadingMembers,
    userMetrics,
    isLoadingMetrics: isLoadingMembers,
  };
}
