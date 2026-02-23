import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Building2, User, CreditCard, Check, ArrowRight, ArrowLeft, Loader2, Sparkles, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSubscriptionPlans, useCreateSubscription } from '@/hooks/useSubscription';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';

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

  // SSO users: auto-complete onboarding — they are always assigned to CCA org by the SSO function
  const isSSOUser = profile?.auth_method === 'sso_cca';
  useEffect(() => {
    if (!isSSOUser || !profile) return;
    if (profile.onboarding_completed) return; // already handled by ProtectedRoute
    // Complete onboarding silently for SSO users
    completeOnboarding.mutateAsync().then(() => {
      navigate('/');
    }).catch(() => {
      // If it fails, still redirect — the SSO function already set onboarding_completed
      navigate('/');
    });
  }, [isSSOUser, profile]);

  const handleProfileSubmit = async () => {
    if (!profileData.nome_completo.trim()) {
      toast.error('Por favor, introduza o seu nome');
      return;
    }

    setIsLoading(true);
    try {
      // Use upsert to handle case where profile might not exist
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email,
          nome_completo: profileData.nome_completo,
          departamento: profileData.departamento as "comercial" | "financeiro" | "it" | "juridico" | "marketing" | "operacoes" | "outro" | "rh" | null || null,
        }, { onConflict: 'id' });

      if (error) throw error;
      setCurrentStep(1);
    } catch (error: any) {
      toast.error('Erro ao guardar perfil: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSubmit = async () => {
    // Se o utilizador já tem organização pré-atribuída, avançar directamente
    if (profile?.current_organization_id) {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold">Legal Hub</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Bem-vindo! Vamos configurar a sua conta
          </h1>
          <p className="text-muted-foreground">
            Complete os passos abaixo para começar a utilizar a plataforma
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 0 && <User className="h-5 w-5 text-primary" />}
              {currentStep === 1 && <Building2 className="h-5 w-5 text-primary" />}
              {currentStep === 2 && <CreditCard className="h-5 w-5 text-primary" />}
              {STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 0 && 'Introduza as suas informações pessoais'}
              {currentStep === 1 && 'Selecione a sua organização'}
              {currentStep === 2 && 'Escolha o plano ideal para a sua organização'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Profile */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={profileData.nome_completo}
                    onChange={(e) => setProfileData({ ...profileData, nome_completo: e.target.value })}
                    placeholder="O seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Select
                    value={profileData.departamento}
                    onValueChange={(value) => setProfileData({ ...profileData, departamento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juridico">Jurídico</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="rh">Recursos Humanos</SelectItem>
                      <SelectItem value="it">TI</SelectItem>
                      <SelectItem value="operacoes">Operações</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : isSSOUser || profile?.current_organization_id ? (
                  // User was pre-assigned to an organization by admin
                  <>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Organização Atribuída</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Você foi adicionado à organização pelo administrador. Clique em continuar para prosseguir.
                      </p>
                    </div>
                    {userMemberships && userMemberships.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {userMemberships.find(m => m.organization_id === profile.current_organization_id)?.organizations.name || 'Organização'}
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
                            <SelectItem key={membership.organization_id} value={membership.organization_id}>
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
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2 text-primary">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">
                            Organização selecionada: {userMemberships?.find(m => m.organization_id === selectedOrganizationId)?.organizations.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Sem Organização Atribuída</h3>
                    <p className="text-muted-foreground mb-6">
                      Ainda não foi adicionado a nenhuma organização. Por favor contacte o administrador para receber acesso.
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
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : plans && plans.length > 0 ? (
                  <div className="grid gap-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {plan.slug === 'professional' && (
                          <Badge className="absolute -top-2 right-4 bg-primary">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Recomendado
                          </Badge>
                        )}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {plan.features.map((feature, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {plan.price_monthly === 0 ? (
                                'Grátis'
                              ) : (
                                <>
                                  €{plan.price_monthly}
                                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                                </>
                              )}
                            </div>
                            {plan.price_monthly > 0 && (
                              <div className="text-xs text-muted-foreground">
                                €{plan.price_yearly}/ano (poupança de 2 meses)
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedPlan === plan.id && (
                          <div className="absolute top-4 left-4">
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Planos não disponíveis de momento</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pode continuar sem selecionar um plano. Poderá escolher um plano mais tarde nas definições.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              {/* Only show continue button if user has memberships or pre-assigned org in step 1, or in other steps */}
              {(currentStep !== 1 || hasMemberships || profile?.current_organization_id) && (
                <Button onClick={handleNext} disabled={isLoading || (currentStep === 1 && !selectedOrganizationId && !profile?.current_organization_id)}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {currentStep === STEPS.length - 1 ? 'Concluir' : 'Continuar'}
                  {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}