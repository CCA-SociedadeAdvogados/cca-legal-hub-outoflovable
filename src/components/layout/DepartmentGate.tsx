import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { syncDepartamento } from '@/lib/syncDepartamento';

const DEPARTAMENTO_VALUES = [
  'juridico', 'comercial', 'financeiro', 'rh', 'it', 'operacoes', 'marketing', 'outro',
] as const;

interface DepartmentGateProps {
  children: React.ReactNode;
}

export function DepartmentGate({ children }: DepartmentGateProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const [selectedDept, setSelectedDept] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // SSO CCA users bypass department gate — they are internal staff
  // and their department is optional (set via platform_users or profile)
  if ((profile as any)?.auth_method === 'sso_cca') {
    return <>{children}</>;
  }

  // If department is already set, render children
  if (profile?.departamento) {
    return <>{children}</>;
  }

  const handleSave = async () => {
    if (!selectedDept) {
      toast({ title: t('department.selectRequired'), variant: 'destructive' });
      return;
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Get the user's current organization
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const orgId = profileData?.current_organization_id;

      if (orgId) {
        // Sync profiles.departamento + user_departments
        await syncDepartamento(user.id, orgId, selectedDept);
      } else {
        // Fallback: only update profiles.departamento (no org yet)
        const { error } = await supabase
          .from('profiles')
          .update({
            departamento: selectedDept as "comercial" | "financeiro" | "it" | "juridico" | "marketing" | "operacoes" | "outro" | "rh",
          })
          .eq('id', user.id);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['user-departments'] });
      toast({ title: t('department.saved') });
    } catch (error: unknown) {
      toast({
        title: t('department.saveError'),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle>{t('department.gateTitle')}</CardTitle>
          <CardDescription>{t('department.gateDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="departamento">{t('department.label')} *</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger>
                <SelectValue placeholder={t('department.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {DEPARTAMENTO_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`departments.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSave}
            disabled={!selectedDept || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.continue')
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
