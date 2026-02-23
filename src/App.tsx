import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "next-themes";
import { useOnboarding } from "@/hooks/useOnboarding";
import { translationService } from "@/lib/TranslationService";
import React from "react";

// Initialize translation service (migration, cleanup)
translationService.initialize();
import Dashboard from "./pages/Dashboard";
import Eventos from "./pages/Eventos";
import Contratos from "./pages/Contratos";
import ContratoDetalhe from "./pages/ContratoDetalhe";
import ContratoForm from "./pages/ContratoForm";
import ContratosUploadMassa from "./pages/ContratosUploadMassa";
import ContratosTriagem from "./pages/ContratosTriagem";
import Impactos from "./pages/Impactos";
import Perfil from "./pages/Perfil";
import Organizacao from "./pages/Organizacao";
import Definicoes from "./pages/Definicoes";
import Politicas from "./pages/Politicas";
import AssinaturaDigital from "./pages/AssinaturaDigital";
import DocumentosGlobal from "./pages/DocumentosGlobal";
// Utilizadores foi movido para a tab Users na página Admin
import Normativos from "./pages/Normativos";
import NormativoDetalhe from "./pages/NormativoDetalhe";
import NovidadesCCA from "./pages/NovidadesCCA";
import Financeiro from "./pages/Financeiro";
import Notificacoes from "./pages/Notificacoes";
import Login from "./pages/auth/Login";
import SSOCallback from "./pages/auth/SSOCallback";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import PlatformAdmin from "./pages/PlatformAdmin";
import Home from "./pages/Home";
import MeuDepartamento from "./pages/MeuDepartamento";
import MinhaOrganizacao from "./pages/MinhaOrganizacao";
import UtilizadoresOrg from "./pages/UtilizadoresOrg";
import LegalBi from "./pages/LegalBi";
import { PlatformAdminRoute } from "./components/layout/PlatformAdminRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();

  if (loading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed
  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const OnboardingRoute = () => {
  const { user, loading } = useAuth();
  const { isOnboardingComplete, isLoading } = useOnboarding();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se onboarding já completo, redirecionar para home
  if (isOnboardingComplete) {
    return <Navigate to="/" replace />;
  }

  return <Onboarding />;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/auth/sso-callback" element={<SSOCallback />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
      
      {/* Home page - nova página inicial */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      
      {/* Contratos e subpáginas */}
      <Route path="/contratos/visao-geral" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
      <Route path="/contratos/novo" element={<ProtectedRoute><ContratoForm /></ProtectedRoute>} />
      <Route path="/contratos/upload-massa" element={<ProtectedRoute><ContratosUploadMassa /></ProtectedRoute>} />
      <Route path="/contratos/triagem" element={<ProtectedRoute><ContratosTriagem /></ProtectedRoute>} />
      <Route path="/contratos/documentos" element={<Navigate to="/assinatura-digital" replace />} />
      <Route path="/contratos/:id/editar" element={<ProtectedRoute><ContratoForm /></ProtectedRoute>} />
      <Route path="/contratos/:id" element={<ProtectedRoute><ContratoDetalhe /></ProtectedRoute>} />
      
      {/* Assinatura Digital (antiga página de Documentos gerados) */}
      <Route path="/assinatura-digital" element={<ProtectedRoute><AssinaturaDigital /></ProtectedRoute>} />
      
      {/* Nova página global de Documentos */}
      <Route path="/documentos" element={<ProtectedRoute><DocumentosGlobal /></ProtectedRoute>} />
      
      <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
      <Route path="/impactos" element={<ProtectedRoute><Impactos /></ProtectedRoute>} />
      <Route path="/normativos" element={<ProtectedRoute><Normativos /></ProtectedRoute>} />
      <Route path="/normativos/:id" element={<ProtectedRoute><NormativoDetalhe /></ProtectedRoute>} />
      <Route path="/politicas" element={<ProtectedRoute><Politicas /></ProtectedRoute>} />
      
      {/* Páginas removidas do menu - redirect para home */}
      <Route path="/requisitos" element={<Navigate to="/contratos/visao-geral" replace />} />
      <Route path="/templates" element={<Navigate to="/contratos/visao-geral" replace />} />
      <Route path="/auditoria" element={<Navigate to="/contratos/visao-geral" replace />} />
      
      {/* Novas páginas */}
      <Route path="/novidades-cca" element={<ProtectedRoute><NovidadesCCA /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
      <Route path="/legalbi" element={<ProtectedRoute><LegalBi /></ProtectedRoute>} />
      <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
      
      {/* Novas páginas do módulo de utilizadores */}
      <Route path="/meu-departamento" element={<ProtectedRoute><MeuDepartamento /></ProtectedRoute>} />
      <Route path="/minha-organizacao" element={<ProtectedRoute><MinhaOrganizacao /></ProtectedRoute>} />
      <Route path="/utilizadores-org" element={<ProtectedRoute><UtilizadoresOrg /></ProtectedRoute>} />
      
      {/* Utilizadores - redirect para admin com tab users */}
      <Route path="/utilizadores" element={
        <ProtectedRoute>
          <PlatformAdminRoute>
            <Navigate to="/admin?tab=users" replace />
          </PlatformAdminRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
      <Route path="/organizacao" element={<ProtectedRoute><Organizacao /></ProtectedRoute>} />
      <Route path="/definicoes" element={<ProtectedRoute><Definicoes /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><PlatformAdminRoute><PlatformAdmin /></PlatformAdminRoute></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </SidebarProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
