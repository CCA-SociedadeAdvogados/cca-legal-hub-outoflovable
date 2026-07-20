import { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalLayout } from './components/PortalLayout';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useHubPortalConfig, type PortalAba } from '@/hooks/useHub';
import PortalHome from './pages/PortalHome';
import PortalContratos from './pages/PortalContratos';
import PortalAssuntos from './pages/PortalAssuntos';
import PortalTimelines from './pages/PortalTimelines';
import PortalDocumentos from './pages/PortalDocumentos';
import PortalPrazos from './pages/PortalPrazos';
import PortalFinanceiro from './pages/PortalFinanceiro';
import PortalPedidos from './pages/PortalPedidos';
import PortalNovidades from './pages/PortalNovidades';
import PortalPoliticas from './pages/PortalPoliticas';
import PortalPerfil from './pages/PortalPerfil';

/**
 * Gate por aba (nível 1 do modelo de permissões do hub): abas desligadas na
 * consola ficam inacessíveis mesmo por URL direto. Enquanto a configuração
 * carrega, não bloqueia (evita flash de redirect com defaults ativos).
 */
function AbaGate({ aba, children }: { aba: PortalAba; children: ReactNode }) {
  const { currentOrganization } = useOrganizations();
  const { data: config, isLoading } = useHubPortalConfig(currentOrganization?.id);
  if (!isLoading && config && config.abas[aba] === false) {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}

/**
 * Árvore de rotas do Portal do Cliente. Montada em `/portal/*` e renderizada
 * apenas para a audiência `client` (ver ProtectedRoute em App.tsx).
 *
 * Caminhos relativos a `/portal`.
 */
export default function PortalRoutes() {
  return (
    <PortalLayout>
      <Routes>
        <Route index element={<PortalHome />} />
        <Route
          path="contratos"
          element={
            <AbaGate aba="contratos">
              <PortalContratos />
            </AbaGate>
          }
        />
        <Route
          path="assuntos"
          element={
            <AbaGate aba="assuntos">
              <PortalAssuntos />
            </AbaGate>
          }
        />
        <Route
          path="timelines"
          element={
            <AbaGate aba="timelines">
              <PortalTimelines />
            </AbaGate>
          }
        />
        <Route
          path="documentos"
          element={
            <AbaGate aba="documentos">
              <PortalDocumentos />
            </AbaGate>
          }
        />
        <Route
          path="prazos"
          element={
            <AbaGate aba="prazos">
              <PortalPrazos />
            </AbaGate>
          }
        />
        <Route
          path="financeiro"
          element={
            <AbaGate aba="financeiro">
              <PortalFinanceiro />
            </AbaGate>
          }
        />
        <Route
          path="pedidos"
          element={
            <AbaGate aba="pedidos">
              <PortalPedidos />
            </AbaGate>
          }
        />
        <Route
          path="novidades"
          element={
            <AbaGate aba="novidades">
              <PortalNovidades />
            </AbaGate>
          }
        />
        <Route
          path="politicas"
          element={
            <AbaGate aba="politicas">
              <PortalPoliticas />
            </AbaGate>
          }
        />
        <Route path="perfil" element={<PortalPerfil />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  );
}
