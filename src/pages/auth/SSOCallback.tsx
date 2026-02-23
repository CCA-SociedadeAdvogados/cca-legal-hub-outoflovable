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

      // Check for IdP error
      if (errorParam) {
        console.error("[SSO Callback] IdP error:", errorParam, errorDescription);
        setError({
          code: errorParam,
          message: errorDescription || "Erro durante a autenticação SSO",
        });
        setState("error");
        return;
      }

      // Validate required parameters
      if (!code || !stateParam) {
        console.error("[SSO Callback] Missing code or state");
        setError({
          code: "missing_params",
          message: "Parâmetros de autenticação em falta",
        });
        setState("error");
        return;
      }

      // State validation is handled server-side by the Edge Function
      // against the sso_states table in the database (CSRF protection)
      sessionStorage.removeItem("sso_state");

      try {
        // Call edge function to exchange code for session (single call only)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/sso-cca/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(stateParam)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        const result = await response.json();

       if (!response.ok || result.error) {
          console.error("[SSO Callback] Edge function error:", result);
          setError({
            code: result.error || "callback_failed",
            message: result.message || "Falha no processo de autenticação",
          });
          setState("error");
          return;
        }

        // Usar action_link para estabelecer sessão
        if (result.success && result.action_link) {
          const actionUrl = new URL(result.action_link);
          const token = actionUrl.searchParams.get("token");
          const type = actionUrl.searchParams.get("type") || "magiclink";

          if (token) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "magiclink",
            });

            if (verifyError) {
              console.error("[SSO Callback] VerifyOtp error:", verifyError);
              setError({
                code: "session_error",
                message: "Erro ao estabelecer sessão. Por favor, tente novamente.",
              });
              setState("error");
              return;
            }
          }

          await queryClient.invalidateQueries();
          setState("success");
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1500);
        } else {
          setError({
            code: "no_session",
            message: "Não foi possível estabelecer a sessão. Por favor, tente novamente.",
          });
          setState("error");
        }
