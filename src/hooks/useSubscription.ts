import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from './useOrganizations';
import type { Json } from '@/integrations/supabase/types';

export interface SubscriptionPlanLimits {
  max_contracts: number;
  max_users: number;
  max_events: number;
  max_storage_mb: number;
  ai_analysis?: boolean;
  priority_support?: boolean;
  api_access?: boolean;
  sso?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_active: boolean;
  features: string[];
  limits: SubscriptionPlanLimits;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  plan?: SubscriptionPlan;
}

function parseJsonToLimits(json: Json): SubscriptionPlanLimits {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return {
      max_contracts: (json as Record<string, unknown>).max_contracts as number ?? 0,
      max_users: (json as Record<string, unknown>).max_users as number ?? 0,
      max_events: (json as Record<string, unknown>).max_events as number ?? 0,
      max_storage_mb: (json as Record<string, unknown>).max_storage_mb as number ?? 0,
      ai_analysis: (json as Record<string, unknown>).ai_analysis as boolean ?? false,
      priority_support: (json as Record<string, unknown>).priority_support as boolean ?? false,
      api_access: (json as Record<string, unknown>).api_access as boolean ?? false,
      sso: (json as Record<string, unknown>).sso as boolean ?? false,
    };
  }
  return { max_contracts: 0, max_users: 0, max_events: 0, max_storage_mb: 0 };
}

function parseJsonToFeatures(json: Json): string[] {
  if (Array.isArray(json)) {
    return json.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      
      return data.map((plan): SubscriptionPlan => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price_monthly: plan.price_monthly ?? 0,
        price_yearly: plan.price_yearly ?? 0,
        currency: plan.currency ?? 'EUR',
        is_active: plan.is_active ?? true,
        features: parseJsonToFeatures(plan.features),
        limits: parseJsonToLimits(plan.limits),
      }));
    },
  });
}

export function useOrganizationSubscription() {
  const { currentOrganization } = useOrganizations();

  return useQuery({
    queryKey: ['organization-subscription', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;

      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      const planData = data.plan as Record<string, unknown> | null;
      
      return {
        id: data.id,
        organization_id: data.organization_id,
        plan_id: data.plan_id,
        status: data.status,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        plan: planData ? {
          id: planData.id as string,
          name: planData.name as string,
          slug: planData.slug as string,
          description: planData.description as string | null,
          price_monthly: planData.price_monthly as number ?? 0,
          price_yearly: planData.price_yearly as number ?? 0,
          currency: planData.currency as string ?? 'EUR',
          is_active: planData.is_active as boolean ?? true,
          features: parseJsonToFeatures(planData.features as Json),
          limits: parseJsonToLimits(planData.limits as Json),
        } : undefined,
      } as OrganizationSubscription;
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();

  return useMutation({
    mutationFn: async (planId: string) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('organization_subscriptions')
        .upsert(
          {
            organization_id: currentOrganization.id,
            plan_id: planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
          },
          { onConflict: 'organization_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-subscription'] });
    },
  });
}
