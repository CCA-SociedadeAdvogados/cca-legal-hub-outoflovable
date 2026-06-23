import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, Lock, ArrowRight, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import ccaLogo from "@/assets/cca-logo.png";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "A palavra-passe deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A palavra-passe deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A palavra-passe deve conter pelo menos um número");

const emailSchema = z.string().email("Por favor, introduza um e-mail válido");

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signIn } = useAuth();
  const { enabled: ssoEnabled, isLoading: ssoLoading } = useFeatureFlag("ENABLE_SSO_CCA");
  const { enabled: demoEnabled } = useFeatureFlag("DEMO_LOGIN_ENABLED");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

  const validateEmail = (value: string) => {
    const result = emailSchema.safeParse(value);
    if (!result.success) { setEmailError(result.error.errors[0].message); return false; }
    setEmailError(null); return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) toast.error("Credenciais inválidas. Verifique o e-mail e palavra-passe.");
        else toast.error(error.message);
        return;
      }
      toast.success("Sessão iniciada com sucesso!"); navigate("/");
    } catch { toast.error("Ocorreu um erro. Tente novamente."); }
    finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) toast.error(error.message);
      else { toast.success("Email de recuperação enviado. Verifique a sua caixa de entrada."); setShowReset(false); setResetEmail(""); }
    } finally { setIsResetLoading(false); }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-login", { method: "POST", body: {} });
      if (error) { toast.error("Erro ao iniciar sessão demo. O login demo pode estar desativado."); return; }
      if (data?.error) {
        if (data.error === "demo_disabled") toast.error("O login demo está desativado neste ambiente.");
        else if (data.error === "rate_limited") toast.error(data.message || "Demasiadas tentativas. Aguarde alguns minutos.");
        else toast.error(data.message || "Erro ao iniciar sessão demo.");
        return;
      }
      if (data?.session) {
        await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        await queryClient.invalidateQueries();
        toast.success("Sessão demo iniciada com sucesso!", { description: "Acesso de superadmin com todas as funcionalidades." });
        navigate("/");
      } else { toast.error("Resposta inválida do servidor."); }
    } catch { toast.error("Erro ao iniciar sessão demo. Tente novamente."); }
    finally { setIsDemoLoading(false); }
  };

  const handleSSOLogin = async () => {
    setIsLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/sso-cca/start`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "apikey": anonKey, "Authorization": `Bearer ${anonKey}` },
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.configured === false) toast.error("SSO CCA ainda não está configurado. Por favor, contacte o administrador.");
        else toast.error(data.message || "Erro ao iniciar SSO");
        return;
      }
      if (data.authUrl) {
        try {
          const parsed = new URL(data.authUrl);
          const allowed = ["login.microsoftonline.com", "login.microsoft.com"];
          if (parsed.protocol !== "https:" || !allowed.includes(parsed.hostname)) { toast.error("URL de autenticação inválida. Contacte o administrador."); return; }
        } catch { toast.error("URL de autenticação inválida. Contacte o administrador."); return; }
        sessionStorage.setItem("sso_state", data.state);
        window.location.href = data.authUrl;
      } else { toast.error("Resposta inválida do servidor SSO"); }
    } catch { toast.error("Erro ao iniciar autenticação SSO. Por favor, tente novamente."); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* ============ LEFT — institutional dark panel ============ */}
      <aside className="hidden lg:flex flex-col p-12 relative overflow-hidden bg-sidebar text-sidebar-foreground">
        {/* Radial accent glow */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(800px 600px at 20% 0%, hsl(var(--accent-brand) / 0.18), transparent 60%), radial-gradient(600px 500px at 100% 100%, hsl(var(--accent-brand) / 0.10), transparent 60%)" }} />
        {/* Concentric rings ornament */}
        <div className="absolute -right-56 top-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full pointer-events-none"
             style={{ border: "1px solid hsl(var(--sidebar-ink) / 0.05)",
                      boxShadow: "inset 0 0 0 80px hsl(var(--sidebar-ink) / 0.02), 0 0 0 80px hsl(var(--sidebar-ink) / 0.025), 0 0 0 160px hsl(var(--sidebar-ink) / 0.018)" }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3.5">
          <img src={ccaLogo} alt="CCA" className="h-11 w-11 object-contain" />
          <div>
            <div className="font-serif text-[22px] font-medium tracking-tight leading-none text-sidebar-ink">Legal Hub</div>
            <div className="font-sans text-[10px] tracking-[0.22em] uppercase text-sidebar-ink-mute mt-1">by CCA</div>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[540px]">
          <div className="eyebrow mb-5" style={{ color: "hsl(var(--accent-brand))" }}>Área reservada</div>
          <h1 className="font-serif text-[44px] font-normal leading-[1.08] tracking-tight text-sidebar-ink mb-4">
            Gestão jurídica<br/>
            <em className="not-italic" style={{ fontStyle: "italic", color: "hsl(var(--accent-brand))" }}>com a precisão</em><br/>
            de um escritório.
          </h1>
          <p className="font-serif italic text-[17px] text-sidebar-ink-mute leading-[1.55] max-w-[480px]">
            Contratos, documentos, obrigações fiscais e legislação aplicável — tudo organizado e ao seu alcance.
          </p>

          {/* Testimonial card */}
          <div className="mt-12 p-7 rounded-md relative backdrop-blur-sm"
               style={{ background: "hsl(var(--sidebar-ink) / 0.04)", border: "1px solid hsl(var(--sidebar-ink) / 0.08)" }}>
            <span className="absolute top-3 right-5 font-serif text-[60px] leading-none italic opacity-35"
                  style={{ color: "hsl(var(--accent-brand))" }}>"</span>
            <p className="font-serif italic text-[17px] text-sidebar-ink leading-[1.5] max-w-[430px]">
              A plataforma que nos permite antecipar riscos regulatórios e manter os nossos contratos sempre em conformidade.
            </p>
            <div className="mt-4 pt-3.5 flex items-center gap-3" style={{ borderTop: "1px solid hsl(var(--sidebar-ink) / 0.08)" }}>
              <div className="h-9 w-9 rounded-full flex items-center justify-center font-serif text-[13px] font-medium text-white"
                   style={{ background: "hsl(var(--accent-brand))" }}>SP</div>
              <div className="leading-tight">
                <div className="text-[12.5px] font-medium text-sidebar-ink">Sofia Pereira</div>
                <div className="text-[11px] text-sidebar-ink-mute mt-0.5">Head of Legal · Grupo Aurora · Cliente desde 2024</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-center text-[11px] text-sidebar-ink-mute tracking-wider">
          <div>© 2026 CCA · Sociedade de Advogados, R.L.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-sidebar-ink transition-colors">Privacidade</a>
            <a href="#" className="hover:text-sidebar-ink transition-colors">Termos</a>
            <a href="#" className="hover:text-sidebar-ink transition-colors">Suporte</a>
          </div>
        </div>
      </aside>

      {/* ============ RIGHT — sign-in form ============ */}
      <section className="flex items-center justify-center p-8 bg-background relative">
        {/* Mobile brand */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 lg:hidden flex items-center gap-3">
          <img src={ccaLogo} alt="CCA" className="h-9 w-9 object-contain" />
          <span className="font-serif text-xl font-medium">Legal Hub</span>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-surface border border-line rounded-card p-10 shadow-card">
            {/* Header */}
            <div className="mb-7">
              <div className="eyebrow mb-2.5">Acesso à plataforma</div>
              <h2 className="font-serif text-[30px] font-medium tracking-tight leading-[1.1] text-ink">
                Iniciar <em style={{ color: "hsl(var(--accent-brand))" }}>sessão</em>
              </h2>
              <p className="mt-2.5 text-[13.5px] text-ink-soft leading-[1.5]">
                Escolha o método de autenticação para aceder à sua área reservada.
              </p>
            </div>

            {/* SSO — secondary (dark, NOT orange). Orange is reserved for submit. */}
            {ssoEnabled && !ssoLoading && (
              <>
                <Button
                  onClick={handleSSOLogin} disabled={isLoading}
                  className="w-full h-12 bg-ink text-bg hover:bg-ink/90 border border-ink rounded-control font-medium tracking-wide text-[13px]"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Entrar com CCA SSO
                </Button>
                <p className="text-[11.5px] text-center text-ink-mute mt-2.5">
                  Para utilizadores com conta de domínio <span className="text-ink font-medium">@cca.law</span>
                </p>

                <div className="flex items-center gap-3.5 my-6 text-[10px] tracking-[0.22em] uppercase text-ink-mute font-medium">
                  <span className="flex-1 h-px bg-line" />
                  ou continue com e-mail
                  <span className="flex-1 h-px bg-line" />
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11.5px] text-ink-soft font-medium tracking-wide">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-mute pointer-events-none" />
                  <Input
                    id="email" type="email" placeholder="nome@empresa.pt" value={email}
                    onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                    className={`pl-10 h-11 bg-surface border-line text-ink placeholder:text-ink-mute focus-visible:ring-ink focus-visible:ring-offset-0 focus-visible:ring-2 ${emailError ? "border-destructive" : ""}`}
                    required disabled={isLoading}
                  />
                </div>
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11.5px] text-ink-soft font-medium tracking-wide">Palavra-passe</Label>
                  <button type="button" className="text-[11px] text-ink-mute hover:text-brand hover:underline underline-offset-[3px] tracking-wide"
                          onClick={() => { setShowReset(true); setResetEmail(email); }}>
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-mute pointer-events-none" />
                  <Input
                    id="password" type="password" placeholder="••••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-surface border-line text-ink placeholder:text-ink-mute focus-visible:ring-ink focus-visible:ring-offset-0 focus-visible:ring-2"
                    required minLength={8} disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit — THE orange button */}
              <Button type="submit" disabled={isLoading}
                      className="w-full h-12 bg-brand text-white hover:bg-brand-strong border border-brand rounded-control font-medium tracking-wide text-[13px] mt-2">
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />A entrar...</>)
                           : (<>Entrar<ArrowRight className="ml-2 h-4 w-4" /></>)}
              </Button>
            </form>

            {/* Demo */}
            {demoEnabled && (
              <>
                <div className="flex items-center gap-3.5 my-5 text-[10px] tracking-[0.22em] uppercase text-ink-mute font-medium">
                  <span className="flex-1 h-px bg-line" />
                  acesso rápido (demo)
                  <span className="flex-1 h-px bg-line" />
                </div>
                <Button variant="outline" className="w-full h-11 border-line bg-bg-alt text-ink-soft hover:bg-bg hover:text-ink rounded-control text-[13px]"
                        onClick={handleDemoLogin} disabled={isDemoLoading || isLoading}>
                  {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar como utilizador demo
                </Button>
                <div className="flex items-center justify-center gap-2 text-[11px] text-ink-mute mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Conta de demonstração com funcionalidades limitadas</span>
                </div>
              </>
            )}

            {/* Notice */}
            <div className="mt-7 p-3.5 rounded-control border text-center text-[12px] text-ink-soft leading-[1.5]"
                 style={{ background: "hsl(var(--accent-brand) / 0.06)", borderColor: "hsl(var(--accent-brand) / 0.18)" }}>
              Não tem conta? <span className="font-medium" style={{ color: "hsl(var(--accent-brand))" }}>Contacte o administrador</span> da sua organização para obter acesso.
            </div>

            {/* Legal */}
            <div className="mt-7 text-center text-[11px] text-ink-mute tracking-wide">
              Ao continuar, aceita os <a href="#" className="underline underline-offset-[3px] hover:text-brand">Termos de Uso</a> e a <a href="#" className="underline underline-offset-[3px] hover:text-brand">Política de Privacidade</a>.
            </div>
          </div>
        </div>

        {/* Reset Dialog — unchanged */}
        <Dialog open={showReset} onOpenChange={setShowReset}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Recuperar palavra-passe</DialogTitle>
              <DialogDescription>Introduza o seu e-mail para receber um link de recuperação.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reset-email" type="email" placeholder="exemplo@empresa.pt" value={resetEmail}
                         onChange={(e) => setResetEmail(e.target.value)} className="pl-9" required disabled={isResetLoading} autoFocus />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowReset(false)} disabled={isResetLoading}>Cancelar</Button>
                <Button type="submit" disabled={isResetLoading || !resetEmail.trim()}>
                  {isResetLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar...</> : "Enviar link"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
