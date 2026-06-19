import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalLayout } from './components/PortalLayout';
import PortalHome from './pages/PortalHome';
import PortalAssistente from './pages/PortalAssistente';
import PortalContratos from './pages/PortalContratos';
import PortalDocumentos from './pages/PortalDocumentos';
import PortalPrazos from './pages/PortalPrazos';
import PortalFinanceiro from './pages/PortalFinanceiro';
import PortalNovidades from './pages/PortalNovidades';
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
        <Route path="assistente" element={<PortalAssistente />} />
        <Route path="contratos" element={<PortalContratos />} />
        <Route path="documentos" element={<PortalDocumentos />} />
        <Route path="prazos" element={<PortalPrazos />} />
        <Route path="financeiro" element={<PortalFinanceiro />} />
        <Route path="novidades" element={<PortalNovidades />} />
        <Route path="perfil" element={<PortalPerfil />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  );
}
