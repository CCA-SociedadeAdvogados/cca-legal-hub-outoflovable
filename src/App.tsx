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
import { DepartmentGate } from "@/components/layout/DepartmentGate";
import { translationService } from "@/lib/TranslationService";
import { ClienteProvider } from "@/contexts/ClienteContext";
import React from "react";

// Initialize translation service (migration, cleanup)
translationService.initialize();

// Eagerly loaded (auth flow — must be instant)
import Login from "./pages/auth/Login";
import SSOCallback from "./pages/auth/SSOCallback";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";

// Lazy-loaded pages (code splitting)
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Eventos = React.lazy(() => import("./pages/Eventos"));
const Contratos = React.lazy(() => import("./pages/Contratos"));
const ContratoDetalhe = React.lazy(() => import("./pages/ContratoDetalhe"));
const ContratoForm = React.lazy(() => import("./pages/ContratoForm"));
const ContratosUploadMassa = React.lazy(() => import("./pages/ContratosUploadMassa"));
const ContratosTriagem = React.lazy(() => import("./pages/ContratosTriagem"));
const Impactos = React.lazy(() => import("./pages/Impactos"));
const Perfil = React.lazy(() => import("./pages/Perfil"));
const Organizacao = React.lazy(() => import("./pages/Organizacao"));
const Definicoes = React.lazy(() => import("./pages/Definicoes"));
const Politicas = React.lazy(() => import("./pages/Politicas"));
const AssinaturaDigital = React.lazy(() => import("./pages/AssinaturaDigital"));
const DocumentosGlobal = React.lazy(() => import("./pages/DocumentosGlobal"));
const Normativos = React.lazy(() => import("./pages/Normativos"));
const NormativoDetalhe = React.lazy(() => import("./pages/NormativoDetalhe"));
const NovidadesCCA = React.lazy(() => import("./pages/NovidadesCCA"));
const Financeiro = React.lazy(() => import("./pages/Financeiro"));
const Notificacoes = React.lazy(() => import("./pages/Notificacoes"));
const PlatformAdmin = React.lazy(() => import("./pages/PlatformAdmin"));
const MeuDepartamento = React.lazy(() => import("./pages/MeuDepartamento"));
const MinhaOrganizacao = React.lazy(() => import("./pages/MinhaOrganizacao"));
const UtilizadoresOrg = React.lazy(() => import("./pages/UtilizadoresOrg"));
const LegalBi = React.lazy(() => import("./pages/LegalBi"));
const OrganizationsPage = React.lazy(() => import("./pages/OrganizationsPage"));
const ManagementDocs = React.lazy(() => import("./pages/ManagementDocs"));

import { PlatformAdminRoute } from "./components/layout/PlatformAdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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

  // Block access until department is set
  return <DepartmentGate>{children}</DepartmentGate>;
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
    <React.Suspense fallback={<LazyFallback />}>
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

        {/* Management Docs - documentos de gestão do cliente */}
        <Route path="/management-docs" element={<ProtectedRoute><ManagementDocs /></ProtectedRoute>} />

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
        <Route path="/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />
        <Route path="/organizations/:clientCode" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />

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
        <Route path="/admin" element={<ProtectedRoute><PlatformAdminRoute><ErrorBoundary><PlatformAdmin /></ErrorBoundary></PlatformAdminRoute></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationProvider>
          <SidebarProvider>
            <ClienteProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </ClienteProvider>
          </SidebarProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
