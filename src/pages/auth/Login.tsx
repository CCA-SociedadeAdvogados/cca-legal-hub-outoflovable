import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, ArrowRight, Building2, Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import ccaLogo from '@/assets/cca-logo.png';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const emailSchema = z.string().email('Por favor, introduza um e-mail válido');

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signIn } = useAuth();
  const { enabled: ssoEnabled, isLoading: ssoLoading } = useFeatureFlag('ENABLE_SSO_CCA');
  const { enabled: demoEnabled } = useFeatureFlag('DEMO_LOGIN_ENABLED');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  const validateEmail = (value: string) => {
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    const isEmailValid = validateEmail(email);

    if (!isEmailValid) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciais inválidas. Verifique o e-mail e palavra-passe.');
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success('Sessão iniciada com sucesso!');
      navigate('/');
    } catch {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email de recuperação enviado. Verifique a sua caixa de entrada.');
        setShowReset(false);
        setResetEmail('');
      }
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);

    try {
      // Call secure demo-login edge function instead of using hardcoded credentials
      const { data, error } = await supabase.functions.invoke('demo-login', {
        method: 'POST',
        body: {},
      });

      if (error) {
        console.error('Demo login error:', error);
        toast.error('Erro ao iniciar sessão demo. O login demo pode estar desativado.');
        return;
      }

      if (data?.error) {
        if (data.error === 'demo_disabled') {
          toast.error('O login demo está desativado neste ambiente.');
        } else if (data.error === 'rate_limited') {
          toast.error(data.message || 'Demasiadas tentativas. Aguarde alguns minutos.');
        } else {
          toast.error(data.message || 'Erro ao iniciar sessão demo.');
        }
        return;
      }

      if (data?.session) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        // Force refresh of all cached data to ensure fresh profile/org state
        await queryClient.invalidateQueries();

        toast.success('Sessão demo iniciada com sucesso!', {
          description: 'Acesso de superadmin com todas as funcionalidades.',
        });
        navigate('/');
      } else {
        toast.error('Resposta inválida do servidor.');
      }
    } catch (err) {
      console.error('Demo login exception:', err);
      toast.error('Erro ao iniciar sessão demo. Tente novamente.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    setIsLoading(true);

    try {
      // Call SSO start endpoint to get authorization URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/sso-cca/start`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.configured === false) {
          toast.error('SSO CCA ainda não está configurado. Por favor, contacte o administrador.');
        } else {
          toast.error(data.message || 'Erro ao iniciar SSO');
        }
        return;
      }

      if (data.authUrl) {
        // Validate authUrl against Microsoft allowlist before redirect (A2 — open redirect fix)
        try {
          const parsed = new URL(data.authUrl);
          const allowed = ['login.microsoftonline.com', 'login.microsoft.com'];
          if (parsed.protocol !== 'https:' || !allowed.includes(parsed.hostname)) {
            toast.error('URL de autenticação inválida. Contacte o administrador.');
            return;
          }
        } catch {
          toast.error('URL de autenticação inválida. Contacte o administrador.');
          return;
        }

        // Store state in sessionStorage for CSRF validation on callback
        sessionStorage.setItem('sso_state', data.state);

        // Redirect to IdP
        window.location.href = data.authUrl;
      } else {
        toast.error('Resposta inválida do servidor SSO');
      }
    } catch (err) {
      console.error('SSO login error:', err);
      toast.error('Erro ao iniciar autenticação SSO. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-primary-foreground"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={ccaLogo} alt="CCA" className="h-12 w-12 object-contain" />
            <h1 className="text-2xl font-serif font-bold">Legal Hub</h1>
          </div>
        </div>

        <div className="space-y-6">
          <blockquote className="text-xl font-serif leading-relaxed opacity-90">
            &ldquo;A plataforma que nos permite antecipar riscos regulatórios e manter os nossos
            contratos sempre em conformidade.&rdquo;
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">CCA Law Firm - Sociedade de Advogados</p>
              <p className="text-sm opacity-70">Cliente desde 2025</p>
            </div>
          </div>
        </div>

        <div className="text-sm opacity-60">© 2025 Legal Hub. Todos os direitos reservados.</div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <img src={ccaLogo} alt="CCA" className="h-10 w-10 object-contain" />
            <span className="text-xl font-serif font-bold">Legal Hub</span>
          </div>

          <Card className="border-0 shadow-elevated">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-serif">Legal Hub — Acesso</CardTitle>
              <CardDescription>
                Escolha o método de autenticação para aceder à plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SSO CCA Button - Only shown when feature flag is enabled */}
              {ssoEnabled && !ssoLoading && (
                <>
                  <div className="space-y-3">
                    <Button
                      onClick={handleSSOLogin}
                      className="w-full h-12"
                      size="lg"
                      disabled={isLoading}
                    >
                      <KeyRound className="mr-2 h-5 w-5" />
                      Entrar com CCA (SSO)
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Para utilizadores com conta CCA
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">
                        ou continue com e-mail
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Traditional Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemplo@empresa.pt"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        validateEmail(e.target.value);
                      }}
                      className={`pl-9 ${emailError ? 'border-destructive' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Palavra-passe</Label>
                    <button
                      type="button"
                      className="text-sm text-accent hover:underline"
                      onClick={() => {
                        setShowReset(true);
                        setResetEmail(email);
                      }}
                    >
                      Esqueceu a palavra-passe?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                      minLength={8}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A entrar...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Demo Login - Only shown when feature flag is enabled */}
              {demoEnabled && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Acesso rápido (demo)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDemoLogin}
                      disabled={isDemoLoading || isLoading}
                    >
                      {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Entrar como utilizador demo
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Conta de demonstração com funcionalidades limitadas</span>
                    </div>
                  </div>
                </>
              )}

              {/* Message for users without account */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Não tem conta? Contacte o administrador da plataforma para obter acesso.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reset Password Dialog */}
          <Dialog open={showReset} onOpenChange={setShowReset}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Recuperar palavra-passe</DialogTitle>
                <DialogDescription>
                  Introduza o seu e-mail para receber um link de recuperação.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="exemplo@empresa.pt"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-9"
                      required
                      disabled={isResetLoading}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReset(false)}
                    disabled={isResetLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isResetLoading || !resetEmail.trim()}>
                    {isResetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar...
                      </>
                    ) : (
                      'Enviar link'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
