import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalLayout } from './components/PortalLayout';
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
        <Route path="contratos" element={<PortalContratos />} />
        <Route path="assuntos" element={<PortalAssuntos />} />
        <Route path="timelines" element={<PortalTimelines />} />
        <Route path="documentos" element={<PortalDocumentos />} />
        <Route path="prazos" element={<PortalPrazos />} />
        <Route path="financeiro" element={<PortalFinanceiro />} />
        <Route path="pedidos" element={<PortalPedidos />} />
        <Route path="novidades" element={<PortalNovidades />} />
        <Route path="politicas" element={<PortalPoliticas />} />
        <Route path="perfil" element={<PortalPerfil />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  );
}
