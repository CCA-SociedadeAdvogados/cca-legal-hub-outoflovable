import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider } from 'next-themes';
import { useOnboarding } from '@/hooks/useOnboarding';
import { DepartmentGate } from '@/components/layout/DepartmentGate';
import { translationService } from '@/lib/TranslationService';
import { ClienteProvider } from '@/contexts/ClienteContext';
import React, { Suspense } from 'react';

// Initialize translation service (migration, cleanup)
translationService.initialize();

// Critical path — imported eagerly (login, home, core contracts)
import Login from './pages/auth/Login';
import SSOCallback from './pages/auth/SSOCallback';
import Contratos from './pages/Contratos';
import ContratoDetalhe from './pages/ContratoDetalhe';
import ContratoForm from './pages/ContratoForm';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import { PlatformAdminRoute } from './components/layout/PlatformAdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAudience } from '@/portal/useAudience';

// Lazy-loaded pages — code-split for smaller initial bundle
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PrazosTimeline = React.lazy(() => import('./pages/PrazosTimeline'));
const Eventos = React.lazy(() => import('./pages/Eventos'));
const ContratosUploadMassa = React.lazy(() => import('./pages/ContratosUploadMassa'));
const Impactos = React.lazy(() => import('./pages/Impactos'));
const Perfil = React.lazy(() => import('./pages/Perfil'));
const Organizacao = React.lazy(() => import('./pages/Organizacao'));
const Definicoes = React.lazy(() => import('./pages/Definicoes'));
const Politicas = React.lazy(() => import('./pages/Politicas'));
const DocumentosGlobal = React.lazy(() => import('./pages/DocumentosGlobal'));
const Normativos = React.lazy(() => import('./pages/Normativos'));
const NormativoDetalhe = React.lazy(() => import('./pages/NormativoDetalhe'));
const NovidadesCCA = React.lazy(() => import('./pages/NovidadesCCA'));
const Financeiro = React.lazy(() => import('./pages/Financeiro'));
const PedidosCCA = React.lazy(() => import('./pages/PedidosCCA'));
const Assuntos = React.lazy(() => import('./pages/Assuntos'));
const TimelinesProcessos = React.lazy(() => import('./pages/TimelinesProcessos'));
const Notificacoes = React.lazy(() => import('./pages/Notificacoes'));
const PlatformAdmin = React.lazy(() => import('./pages/PlatformAdmin'));
const MeuDepartamento = React.lazy(() => import('./pages/MeuDepartamento'));
const UtilizadoresOrg = React.lazy(() => import('./pages/UtilizadoresOrg'));
const LegalBi = React.lazy(() => import('./pages/LegalBi'));

// Portal do Cliente — árvore de rotas separada (audiência "client"), lazy-loaded
// para que utilizadores CCA não transfiram este código e vice-versa.
const PortalRoutes = React.lazy(() => import('@/portal/PortalRoutes'));

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

type RouteAudience = 'cca' | 'client';

const ProtectedRoute = ({
  children,
  requireAudience = 'cca',
}: {
  children: React.ReactNode;
  requireAudience?: RouteAudience;
}) => {
  const { user, loading } = useAuth();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();
  const { audience, isLoading: audienceLoading } = useAudience();

  if (loading || onboardingLoading || audienceLoading) {
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

  // Audiência: clientes vivem em /portal; CCA no cockpit. Encaminhar quando há mismatch.
  if (audience === 'client' && requireAudience === 'cca') {
    return <Navigate to="/portal" replace />;
  }
  if (audience === 'cca' && requireAudience === 'client') {
    return <Navigate to="/" replace />;
  }

  // Portal tem o seu próprio shell e não depende do DepartmentGate do cockpit.
  if (requireAudience === 'client') {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  // Block access until department is set (apenas cockpit CCA)
  return (
    <ErrorBoundary>
      <DepartmentGate>{children}</DepartmentGate>
    </ErrorBoundary>
  );
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

  const lazyFallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <Suspense fallback={lazyFallback}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/auth/sso-callback" element={<SSOCallback />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />

        {/* Portal do Cliente — audiência "client" (login local email+password) */}
        <Route
          path="/portal/*"
          element={
            <ProtectedRoute requireAudience="client">
              <PortalRoutes />
            </ProtectedRoute>
          }
        />

        {/* Início — vista única de overview (KPIs + contratos + conformidade) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Contratos e subpáginas */}
        {/* "Visão Geral" foi unificada com o Início */}
        <Route path="/contratos/visao-geral" element={<Navigate to="/" replace />} />
        <Route
          path="/contratos"
          element={
            <ProtectedRoute>
              <Contratos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contratos/novo"
          element={
            <ProtectedRoute>
              <ContratoForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contratos/upload-massa"
          element={
            <ProtectedRoute>
              <ContratosUploadMassa />
            </ProtectedRoute>
          }
        />
        <Route path="/contratos/documentos" element={<Navigate to="/documentos" replace />} />
        <Route
          path="/contratos/:id/editar"
          element={
            <ProtectedRoute>
              <ContratoForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contratos/:id"
          element={
            <ProtectedRoute>
              <ContratoDetalhe />
            </ProtectedRoute>
          }
        />

        {/* Assinatura Digital removida — redireciona para Documentos */}
        <Route path="/assinatura-digital" element={<Navigate to="/documentos" replace />} />

        {/* Nova página global de Documentos */}
        <Route
          path="/documentos"
          element={
            <ProtectedRoute>
              <DocumentosGlobal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos"
          element={
            <ProtectedRoute>
              <Eventos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/impactos"
          element={
            <ProtectedRoute>
              <Impactos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normativos"
          element={
            <ProtectedRoute>
              <Normativos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/normativos/:id"
          element={
            <ProtectedRoute>
              <NormativoDetalhe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/politicas"
          element={
            <ProtectedRoute>
              <Politicas />
            </ProtectedRoute>
          }
        />

        {/* Páginas removidas do menu - redirect para home */}
        <Route path="/requisitos" element={<Navigate to="/" replace />} />
        <Route path="/templates" element={<Navigate to="/" replace />} />
        <Route path="/auditoria" element={<Navigate to="/" replace />} />

        {/* Novas páginas */}
        <Route
          path="/novidades-cca"
          element={
            <ProtectedRoute>
              <NovidadesCCA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute>
              <Financeiro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <ProtectedRoute>
              <PedidosCCA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assuntos"
          element={
            <ProtectedRoute>
              <Assuntos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timelines"
          element={
            <ProtectedRoute>
              <TimelinesProcessos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/legalbi"
          element={
            <ProtectedRoute>
              <LegalBi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prazos"
          element={
            <ProtectedRoute>
              <PrazosTimeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notificacoes"
          element={
            <ProtectedRoute>
              <Notificacoes />
            </ProtectedRoute>
          }
        />

        {/* Novas páginas do módulo de utilizadores */}
        <Route
          path="/meu-departamento"
          element={
            <ProtectedRoute>
              <MeuDepartamento />
            </ProtectedRoute>
          }
        />
        {/* "Minha Organização" consolidada com "Organização" */}
        <Route path="/minha-organizacao" element={<Navigate to="/organizacao" replace />} />
        <Route
          path="/utilizadores-org"
          element={
            <ProtectedRoute>
              <UtilizadoresOrg />
            </ProtectedRoute>
          }
        />
        {/* Utilizadores - redirect para admin com tab users */}
        <Route
          path="/utilizadores"
          element={
            <ProtectedRoute>
              <PlatformAdminRoute>
                <Navigate to="/admin?tab=users" replace />
              </PlatformAdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizacao"
          element={
            <ProtectedRoute>
              <Organizacao />
            </ProtectedRoute>
          }
        />
        <Route
          path="/definicoes"
          element={
            <ProtectedRoute>
              <Definicoes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PlatformAdminRoute>
                <PlatformAdmin />
              </PlatformAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange={false}
  >
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
