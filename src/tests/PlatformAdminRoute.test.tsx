/**
 * Phase 4 — PlatformAdminRoute component tests.
 *
 * Guards the /admin route: shows spinner while checking, redirects to "/" if
 * not admin, renders children if admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mock usePlatformAdmin — must be set before importing the component
// ---------------------------------------------------------------------------
const mockUsePlatformAdmin = vi.fn();
vi.mock('@/hooks/usePlatformAdmin', () => ({
  usePlatformAdmin: () => mockUsePlatformAdmin(),
}));

// Supabase client mock (imported transitively)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }),
    auth: { onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { PlatformAdminRoute } from '@/components/layout/PlatformAdminRoute';

// ---------------------------------------------------------------------------
// Helper — render the route guard in a React Router context
// ---------------------------------------------------------------------------
function renderRoute(isPlatformAdmin: boolean, isCheckingAdmin: boolean) {
  mockUsePlatformAdmin.mockReturnValue({ isPlatformAdmin, isCheckingAdmin });

  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <PlatformAdminRoute>
              <div data-testid="admin-content">Painel de Administração</div>
            </PlatformAdminRoute>
          }
        />
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PlatformAdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while the admin check is in progress', () => {
    renderRoute(false, true /* isCheckingAdmin */);

    // The spinner is an animated div — it should be visible, and admin content should not be
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('redirects to "/" when the user is not a platform admin', () => {
    renderRoute(false /* isPlatformAdmin */, false);

    // The component renders <Navigate to="/" replace>, so we should see the home route
    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('renders children when the user is a platform admin', () => {
    renderRoute(true /* isPlatformAdmin */, false);

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.getByText('Painel de Administração')).toBeInTheDocument();
  });

  it('does not redirect while still checking (even if isPlatformAdmin is false)', () => {
    // isCheckingAdmin=true takes priority
    renderRoute(false, true);

    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });
});
