import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Mail, Lock, ArrowRight, Loader2, KeyRound, AlertTriangle } from 'lucide-react';
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
    if (!validateEmail(email)) return;
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
    } catch {
      toast.error('Erro ao iniciar autenticação SSO. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ============ LEFT — institutional dark panel ============ */}
      <aside className="relative hidden flex-col overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        {/* Radial accent glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(800px 600px at 20% 0%, hsl(var(--accent-brand) / 0.18), transparent 60%), radial-gradient(600px 500px at 100% 100%, hsl(var(--accent-brand) / 0.10), transparent 60%)',
          }}
        />
        {/* Concentric rings ornament */}
        <div
          className="pointer-events-none absolute -right-56 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full"
          style={{
            border: '1px solid hsl(var(--sidebar-ink) / 0.05)',
            boxShadow:
              'inset 0 0 0 80px hsl(var(--sidebar-ink) / 0.02), 0 0 0 80px hsl(var(--sidebar-ink) / 0.025), 0 0 0 160px hsl(var(--sidebar-ink) / 0.018)',
          }}
        />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3.5">
          <img src={ccaLogo} alt="CCA" className="h-11 w-11 object-contain" />
          <div>
            <div className="font-serif text-[22px] font-medium leading-none tracking-tight text-sidebar-ink">
              Legal Hub
            </div>
            <div className="mt-1 font-sans text-[10px] uppercase tracking-[0.22em] text-sidebar-ink-mute">
              by CCA
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 flex max-w-[540px] flex-1 flex-col justify-center">
          <div className="eyebrow mb-5" style={{ color: 'hsl(var(--accent-brand))' }}>
            Área reservada
          </div>
          <h1 className="mb-4 font-serif text-[44px] font-normal leading-[1.08] tracking-tight text-sidebar-ink">
            Gestão jurídica
            <br />
            <em style={{ fontStyle: 'italic', color: 'hsl(var(--accent-brand))' }}>
              com a precisão
            </em>
            <br />
            de um escritório.
          </h1>
          <p className="max-w-[480px] font-serif text-[17px] italic leading-[1.55] text-sidebar-ink-mute">
            Contratos, documentos, obrigações fiscais e legislação aplicável — tudo organizado e ao
            seu alcance.
          </p>

          {/* Testimonial card */}
          <div
            className="relative mt-12 rounded-md p-7 backdrop-blur-sm"
            style={{
              background: 'hsl(var(--sidebar-ink) / 0.04)',
              border: '1px solid hsl(var(--sidebar-ink) / 0.08)',
            }}
          >
            <span
              className="absolute right-5 top-3 font-serif text-[60px] italic leading-none opacity-35"
              style={{ color: 'hsl(var(--accent-brand))' }}
            >
              "
            </span>
            <p className="max-w-[430px] font-serif text-[17px] italic leading-[1.5] text-sidebar-ink">
              A plataforma que nos permite antecipar riscos regulatórios e manter os nossos
              contratos sempre em conformidade.
            </p>
            <div
              className="mt-4 flex items-center gap-3 pt-3.5"
              style={{ borderTop: '1px solid hsl(var(--sidebar-ink) / 0.08)' }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full font-serif text-[13px] font-medium text-white"
                style={{ background: 'hsl(var(--accent-brand))' }}
              >
                SP
              </div>
              <div className="leading-tight">
                <div className="text-[12.5px] font-medium text-sidebar-ink">Sofia Pereira</div>
                <div className="mt-0.5 text-[11px] text-sidebar-ink-mute">
                  Head of Legal · Grupo Aurora · Cliente desde 2024
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-[11px] tracking-wider text-sidebar-ink-mute">
          <div>© 2026 CCA · Sociedade de Advogados, R.L.</div>
          <div className="flex gap-5">
            <a href="#" className="transition-colors hover:text-sidebar-ink">
              Privacidade
            </a>
            <a href="#" className="transition-colors hover:text-sidebar-ink">
              Termos
            </a>
            <a href="#" className="transition-colors hover:text-sidebar-ink">
              Suporte
            </a>
          </div>
        </div>
      </aside>

      {/* ============ RIGHT — sign-in form ============ */}
      <section className="relative flex items-center justify-center bg-background p-8">
        {/* Mobile brand */}
        <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-3 lg:hidden">
          <img src={ccaLogo} alt="CCA" className="h-9 w-9 object-contain" />
          <span className="font-serif text-xl font-medium">Legal Hub</span>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-card border border-line bg-surface p-10 shadow-card">
            {/* Header */}
            <div className="mb-7">
              <div className="eyebrow mb-2.5">Acesso à plataforma</div>
              <h2 className="font-serif text-[30px] font-medium leading-[1.1] tracking-tight text-ink">
                Iniciar <em style={{ color: 'hsl(var(--accent-brand))' }}>sessão</em>
              </h2>
              <p className="mt-2.5 text-[13.5px] leading-[1.5] text-ink-soft">
                Escolha o método de autenticação para aceder à sua área reservada.
              </p>
            </div>

            {/* SSO — secondary (dark, NOT orange). Orange is reserved for submit. */}
            {ssoEnabled && !ssoLoading && (
              <>
                <Button
                  onClick={handleSSOLogin}
                  disabled={isLoading}
                  className="h-12 w-full rounded-control border border-ink bg-ink text-[13px] font-medium tracking-wide text-bg hover:bg-ink/90"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Entrar com CCA SSO
                </Button>
                <p className="mt-2.5 text-center text-[11.5px] text-ink-mute">
                  Para utilizadores com conta de domínio{' '}
                  <span className="font-medium text-ink">@cca.law</span>
                </p>

                <div className="my-6 flex items-center gap-3.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
                  <span className="h-px flex-1 bg-line" />
                  ou continue com e-mail
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[11.5px] font-medium tracking-wide text-ink-soft"
                >
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-mute" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.pt"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    className={`h-11 border-line bg-surface pl-10 text-ink placeholder:text-ink-mute focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-0 ${emailError ? 'border-destructive' : ''}`}
                    required
                    disabled={isLoading}
                  />
                </div>
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-[11.5px] font-medium tracking-wide text-ink-soft"
                  >
                    Palavra-passe
                  </Label>
                  <button
                    type="button"
                    className="text-[11px] tracking-wide text-ink-mute underline-offset-[3px] hover:text-brand hover:underline"
                    onClick={() => {
                      setShowReset(true);
                      setResetEmail(email);
                    }}
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-mute" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-line bg-surface pl-10 text-ink placeholder:text-ink-mute focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-0"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit — THE orange button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 h-12 w-full rounded-control border border-brand bg-brand text-[13px] font-medium tracking-wide text-white hover:bg-brand-strong"
              >
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

            {/* Demo */}
            {demoEnabled && (
              <>
                <div className="my-5 flex items-center gap-3.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
                  <span className="h-px flex-1 bg-line" />
                  acesso rápido (demo)
                  <span className="h-px flex-1 bg-line" />
                </div>
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-control border-line bg-bg-alt text-[13px] text-ink-soft hover:bg-bg hover:text-ink"
                  onClick={handleDemoLogin}
                  disabled={isDemoLoading || isLoading}
                >
                  {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar como utilizador demo
                </Button>
                <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-ink-mute">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Conta de demonstração com funcionalidades limitadas</span>
                </div>
              </>
            )}

            {/* Notice */}
            <div
              className="mt-7 rounded-control border p-3.5 text-center text-[12px] leading-[1.5] text-ink-soft"
              style={{
                background: 'hsl(var(--accent-brand) / 0.06)',
                borderColor: 'hsl(var(--accent-brand) / 0.18)',
              }}
            >
              Não tem conta?{' '}
              <span className="font-medium" style={{ color: 'hsl(var(--accent-brand))' }}>
                Contacte o administrador
              </span>{' '}
              da sua organização para obter acesso.
            </div>

            {/* Legal */}
            <div className="mt-7 text-center text-[11px] tracking-wide text-ink-mute">
              Ao continuar, aceita os{' '}
              <a href="#" className="underline underline-offset-[3px] hover:text-brand">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href="#" className="underline underline-offset-[3px] hover:text-brand">
                Política de Privacidade
              </a>
              .
            </div>
          </div>
        </div>

        {/* Reset Dialog — unchanged */}
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
              <div className="flex justify-end gap-2">
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
      </section>
    </div>
  );
}
