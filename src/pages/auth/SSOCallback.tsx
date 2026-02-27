import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import ccaLogo from "@/assets/cca-logo.png";

type CallbackState = "processing" | "success" | "error";

interface ErrorDetails {
  code: string;
  message: string;
}

export default function SSOCallback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<ErrorDetails | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const stateParam = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        setError({ code: errorParam, message: errorDescription || "Erro durante a autenticação SSO" });
        setState("error");
        return;
      }

      if (!code || !stateParam) {
        setError({ code: "missing_params", message: "Parâmetros de autenticação em falta" });
        setState("error");
        return;
      }

      sessionStorage.removeItem("sso_state");

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/sso-cca?action=callback&code=${encodeURIComponent(code)}&state=${encodeURIComponent(stateParam)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        const result = await response.json();
        console.log("[SSO Callback] Edge function result:", result);

        if (!response.ok || result.error) {
          setError({ code: result.error || "callback_failed", message: result.message || "Falha no processo de autenticação" });
          setState("error");
          return;
        }

        if (result.success && result.session) {
          // Edge Function returns tokens directly — establish session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          });

          if (sessionError) {
            console.error("[SSO] setSession error:", sessionError);
            setError({ code: "session_error", message: "Erro ao estabelecer sessão." });
            setState("error");
            return;
          }

          await queryClient.invalidateQueries();
          setState("success");
          setTimeout(() => navigate("/", { replace: true }), 1500);
        } else {
          setError({ code: "no_session", message: "Não foi possível estabelecer a sessão. Por favor, tente novamente." });
          setState("error");
        }

      } catch (err) {
        console.error("[SSO Callback] Exception:", err);
        setError({ code: "network_error", message: "Erro de comunicação. Por favor, verifique a sua ligação e tente novamente." });
        setState("error");
      }
    };

    processCallback();
  }, [searchParams, navigate, queryClient]);

  const handleRetry = () => {
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={ccaLogo} alt="CCA" className="h-12 w-12 object-contain" />
          </div>
          <CardTitle className="text-xl font-serif">
            {state === "processing" && "A processar autenticação..."}
            {state === "success" && "Autenticação bem sucedida!"}
            {state === "error" && "Erro na autenticação"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {state === "processing" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                A validar as suas credenciais SSO CCA...
              </p>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-primary" />
              <p className="text-muted-foreground text-center">
                A redirecionar para a aplicação...
              </p>
            </>
          )}
          {state === "error" && error && (
            <>
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-destructive font-medium">{error.message}</p>
                <p className="text-xs text-muted-foreground">Código: {error.code}</p>
              </div>
              <Button onClick={handleRetry} className="mt-4">
                Voltar ao Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
