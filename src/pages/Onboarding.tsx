/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/click-events-have-key-events */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Building2,
  User,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSubscriptionPlans, useCreateSubscription } from '@/hooks/useSubscription';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { syncDepartamento } from '@/lib/syncDepartamento';

const STEPS = [
  { id: 'profile', title: 'Perfil', icon: User },
  { id: 'organization', title: 'Organização', icon: Building2 },
  { id: 'plan', title: 'Plano', icon: CreditCard },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { userMemberships, membershipsLoading, switchOrganization } = useOrganizations();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createSubscription = useCreateSubscription();
  const { completeOnboarding } = useOnboarding();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    nome_completo: profile?.nome_completo || '',
    departamento: (profile?.departamento || '') as string,
  });

  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Update profile data when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        nome_completo: profile.nome_completo || '',
        departamento: (profile.departamento || '') as string,
      });
    }
  }, [profile]);

  // Pre-select organization if user only has one membership
  useEffect(() => {
    if (userMemberships && userMemberships.length === 1 && !selectedOrganizationId) {
      setSelectedOrganizationId(userMemberships[0].organization_id);
    }
  }, [userMemberships, selectedOrganizationId]);

  // SSO users go through the normal onboarding flow — their org is pre-assigned
  // by the SSO edge function, so step 2 (organization) will show as pre-selected.
  const isSSOUser = profile?.auth_method === 'sso_cca';

  const handleProfileSubmit = async () => {
    if (!profileData.nome_completo.trim()) {
      toast.error('Por favor, introduza o seu nome');
      return;
    }

    if (!profileData.departamento) {
      toast.error('Por favor, selecione o seu departamento');
      return;
    }

    setIsLoading(true);
    try {
      // Use upsert to handle case where profile might not exist
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user?.id,
          email: user?.email,
          nome_completo: profileData.nome_completo,
          departamento:
            (profileData.departamento as
              | 'comercial'
              | 'financeiro'
              | 'it'
              | 'juridico'
              | 'marketing'
              | 'operacoes'
              | 'outro'
              | 'rh'
              | null) || null,
        },
        { onConflict: 'id' },
      );

      if (error) throw error;
      setCurrentStep(1);
    } catch (error: any) {
      toast.error('Erro ao guardar perfil: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSubmit = async () => {
    // Se o utilizador já tem organização pré-atribuída (admin ou SSO), avançar directamente
    if (isSSOUser || profile?.current_organization_id) {
      setCurrentStep(2);
      return;
    }

    // Caso contrário, exigir selecção
    if (!selectedOrganizationId) {
      toast.error('Por favor, selecione uma organização');
      return;
    }

    setIsLoading(true);
    try {
      await switchOrganization.mutateAsync(selectedOrganizationId);
      setCurrentStep(2);
    } catch (error: any) {
      toast.error('Erro ao selecionar organização: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSubmit = async () => {
    setIsLoading(true);
    try {
      // Only create subscription if a plan was selected
      if (selectedPlan) {
        await createSubscription.mutateAsync(selectedPlan);
      }
      await completeOnboarding.mutateAsync();

      // Sync departamento with user_departments junction table
      // At this point both departamento and current_organization_id should be set
      if (user?.id && profileData.departamento) {
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('current_organization_id')
          .eq('id', user.id)
          .maybeSingle();

        if (freshProfile?.current_organization_id) {
          try {
            await syncDepartamento(
              user.id,
              freshProfile.current_organization_id,
              profileData.departamento,
            );
          } catch (syncError) {
            // Non-blocking — department sync is best-effort during onboarding
            console.warn('[Onboarding] Failed to sync user_departments:', syncError);
          }
        }
      }

      // Aguardar que o cache do perfil seja atualizado antes de navegar
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast.success('Configuração concluída com sucesso!');
      navigate('/');
    } catch (error: any) {
      toast.error('Erro ao finalizar configuração: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 0:
        handleProfileSubmit();
        break;
      case 1:
        handleOrgSubmit();
        break;
      case 2:
        handlePlanSubmit();
        break;
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRefreshMemberships = () => {
    queryClient.invalidateQueries({ queryKey: ['user-memberships'] });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const hasMemberships = userMemberships && userMemberships.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-bg via-bg to-brand/5 p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-control bg-brand/10">
              <Shield className="h-6 w-6 text-brand" strokeWidth={2} />
            </span>
            <span className="font-display text-[22px] font-medium tracking-[-0.01em] text-ink">
              Legal Hub
            </span>
          </div>
          <h1 className="font-display text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-ink">
            Bem-vindo! Vamos configurar a sua <span className="italic text-brand">conta</span>
          </h1>
          <p className="mt-3 font-serif text-[16px] italic leading-[1.55] text-ink-soft">
            Complete os passos abaixo para começar a utilizar a plataforma
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                  index === currentStep
                    ? 'bg-brand text-white'
                    : index < currentStep
                      ? 'bg-brand/[0.12] text-brand'
                      : 'bg-bg-alt text-ink-mute'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="hidden text-sm font-medium sm:inline">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 w-8 ${index < currentStep ? 'bg-brand' : 'bg-line'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-card border border-line bg-surface shadow-card">
          <div className="border-b border-line px-6 py-5">
            <div className="flex items-center gap-2">
              {currentStep === 0 && <User className="h-5 w-5 text-brand" />}
              {currentStep === 1 && <Building2 className="h-5 w-5 text-brand" />}
              {currentStep === 2 && <CreditCard className="h-5 w-5 text-brand" />}
              <h2 className="font-display text-[19px] font-medium leading-tight tracking-[-0.005em] text-ink">
                {STEPS[currentStep].title}
              </h2>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-mute">
              {currentStep === 0 && 'Introduza as suas informações pessoais'}
              {currentStep === 1 && 'Selecione a sua organização'}
              {currentStep === 2 && 'Escolha o plano ideal para a sua organização'}
            </p>
          </div>
          <div className="p-6">
            {/* Step 1: Profile */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={profileData.nome_completo}
                    onChange={(e) =>
                      setProfileData({ ...profileData, nome_completo: e.target.value })
                    }
                    placeholder="O seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento *</Label>
                  <Select
                    value={profileData.departamento}
                    onValueChange={(value) =>
                      setProfileData({ ...profileData, departamento: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'juridico',
                        'comercial',
                        'financeiro',
                        'rh',
                        'it',
                        'operacoes',
                        'marketing',
                        'outro',
                      ].map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {t(`departments.${dept}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Organization */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {membershipsLoading && !isSSOUser ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                  </div>
                ) : isSSOUser || profile?.current_organization_id ? (
                  // User was pre-assigned to an organization by admin
                  <>
                    <div className="rounded-control border border-positive/30 bg-positive/10 p-4">
                      <div className="mb-2 flex items-center gap-2 text-positive">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Organização Atribuída</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-ink-soft">
                        Você foi adicionado à organização pelo administrador. Clique em continuar
                        para prosseguir.
                      </p>
                    </div>
                    {userMemberships && userMemberships.length > 0 && (
                      <div className="rounded-control border border-line bg-bg-alt/50 p-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-brand" />
                          <span className="font-medium text-ink">
                            {userMemberships.find(
                              (m) => m.organization_id === profile.current_organization_id,
                            )?.organizations.name || 'Organização'}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : hasMemberships ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="organization">Selecione a Organização *</Label>
                      <Select
                        value={selectedOrganizationId || undefined}
                        onValueChange={setSelectedOrganizationId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma organização..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userMemberships?.map((membership) => (
                            <SelectItem
                              key={membership.organization_id}
                              value={membership.organization_id}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {membership.organizations.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedOrganizationId && (
                      <div className="rounded-control border border-brand/20 bg-brand/[0.08] p-4">
                        <div className="flex items-center gap-2 text-brand">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">
                            Organização selecionada:{' '}
                            {
                              userMemberships?.find(
                                (m) => m.organization_id === selectedOrganizationId,
                              )?.organizations.name
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <AlertCircle
                      className="mx-auto mb-4 h-12 w-12 text-ink-mute"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-display text-[17px] font-medium text-ink">
                      Sem Organização Atribuída
                    </h3>
                    <p className="mx-auto mb-6 mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-mute">
                      Ainda não foi adicionado a nenhuma organização. Por favor contacte o
                      administrador para receber acesso.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="outline" onClick={handleRefreshMemberships}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar novamente
                      </Button>
                      <Button variant="ghost" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Terminar sessão
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Plan Selection */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {plansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                  </div>
                ) : plans && plans.length > 0 ? (
                  <div className="grid gap-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative cursor-pointer rounded-card border-2 p-4 transition-all ${
                          selectedPlan === plan.id
                            ? 'border-brand bg-brand/[0.05]'
                            : 'border-line hover:border-brand/50'
                        }`}
                      >
                        {plan.slug === 'professional' && (
                          <Badge className="absolute -top-2 right-4 border-brand bg-brand text-white">
                            <Sparkles className="mr-1 h-3 w-3" />
                            Recomendado
                          </Badge>
                        )}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-display text-lg font-medium text-ink">
                              {plan.name}
                            </h3>
                            <p className="mb-3 text-[13px] text-ink-mute">{plan.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {plan.features.map((feature, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="border-line bg-bg-alt text-xs text-ink-soft"
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink [font-variant-numeric:tabular-nums]">
                              {plan.price_monthly === 0 ? (
                                'Grátis'
                              ) : (
                                <>
                                  €{plan.price_monthly}
                                  <span className="text-sm font-normal text-ink-mute">/mês</span>
                                </>
                              )}
                            </div>
                            {plan.price_monthly > 0 && (
                              <div className="text-xs text-ink-mute">
                                €{plan.price_yearly}/ano (poupança de 2 meses)
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedPlan === plan.id && (
                          <div className="absolute left-4 top-4">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-control border border-line bg-bg-alt/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-ink-mute">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Planos não disponíveis de momento</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-ink-mute">
                      Pode continuar sem selecionar um plano. Poderá escolher um plano mais tarde
                      nas definições.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between border-t border-line pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              {/* Only show continue button if user has memberships or pre-assigned org in step 1, or in other steps */}
              {(currentStep !== 1 ||
                hasMemberships ||
                isSSOUser ||
                profile?.current_organization_id) && (
                <Button
                  onClick={handleNext}
                  disabled={
                    isLoading ||
                    (currentStep === 1 &&
                      !selectedOrganizationId &&
                      !isSSOUser &&
                      !profile?.current_organization_id)
                  }
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {currentStep === STEPS.length - 1 ? 'Concluir' : 'Continuar'}
                  {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
