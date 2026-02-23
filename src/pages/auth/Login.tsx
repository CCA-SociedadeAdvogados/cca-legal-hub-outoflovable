import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, ArrowRight, Building2, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import ccaLogo from "@/assets/cca-logo.png";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Password validation schema - requires strong passwords
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
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Credenciais inválidas. Verifique o e-mail e palavra-passe.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Sessão iniciada com sucesso!");
      navigate("/");
    } catch (err: any) {
      toast.error("Ocorreu um erro. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);

    try {
      // Call secure demo-login edge function instead of using hardcoded credentials
      const { data, error } = await supabase.functions.invoke("demo-login", {
        method: "POST",
        body: {},
      });

      if (error) {
        console.error("Demo login error:", error);
        toast.error("Erro ao iniciar sessão demo. O login demo pode estar desativado.");
        return;
      }

      if (data?.error) {
        if (data.error === "demo_disabled") {
          toast.error("O login demo está desativado neste ambiente.");
        } else if (data.error === "rate_limited") {
          toast.error(data.message || "Demasiadas tentativas. Aguarde alguns minutos.");
        } else {
          toast.error(data.message || "Erro ao iniciar sessão demo.");
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

        toast.success("Sessão demo iniciada com sucesso!", {
          description: "Acesso de superadmin com todas as funcionalidades.",
        });
        navigate("/");
      } else {
        toast.error("Resposta inválida do servidor.");
      }
    } catch (err) {
      console.error("Demo login exception:", err);
      toast.error("Erro ao iniciar sessão demo. Tente novamente.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    setIsLoading(true);
    
    try {
      // Call SSO start endpoint to get authorization URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/sso-cca/start`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.configured === false) {
          toast.error("SSO CCA ainda não está configurado. Por favor, contacte o administrador.");
        } else {
          toast.error(data.message || "Erro ao iniciar SSO");
        }
        return;
      }

      if (data.authUrl && data.state) {
        // Store state in sessionStorage for CSRF validation on callback
        sessionStorage.setItem("sso_state", data.state);
        
        // Redirect to IdP
        window.location.href = data.authUrl;
      } else {
        toast.error("Resposta inválida do servidor SSO");
      }
    } catch (err) {
      console.error("SSO login error:", err);
      toast.error("Erro ao iniciar autenticação SSO. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={ccaLogo} alt="CCA" className="h-12 w-12 object-contain" />
            <h1 className="text-2xl font-serif font-bold">Legal Hub</h1>
          </div>
        </div>

        <div className="space-y-6">
          <blockquote className="text-xl font-serif leading-relaxed opacity-90">
            "A plataforma que nos permite antecipar riscos regulatórios e manter os nossos contratos sempre em
            conformidade."
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
                    <Button onClick={handleSSOLogin} className="w-full h-12" size="lg" disabled={isLoading}>
                      <KeyRound className="mr-2 h-5 w-5" />
                      Entrar com CCA (SSO)
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">Para utilizadores com conta CCA</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">ou continue com e-mail</span>
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
                      className={`pl-9 ${emailError ? "border-destructive" : ""}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Palavra-passe</Label>
                    <a href="#" className="text-sm text-accent hover:underline">
                      Esqueceu a palavra-passe?
                    </a>
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A entrar...
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
                      <span className="bg-card px-2 text-muted-foreground">Acesso rápido (demo)</span>
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
        </div>
      </div>
    </div>
  );
}
