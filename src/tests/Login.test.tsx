/**
 * Phase 4 — Login page tests.
 *
 * Tests focus on:
 *   1. Form renders correctly (email/password inputs, submit button)
 *   2. Email validation error appears for invalid input
 *   3. signIn is called with correct args on valid submit
 *   4. SSO button shown/hidden based on feature flag
 *   5. Demo login button shown/hidden based on feature flag
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing Login
// ---------------------------------------------------------------------------

const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockNavigate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, signIn: mockSignIn }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Control feature flags per test
let ssoEnabled = false;
let demoEnabled = false;
vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: (flag: string) => {
    if (flag === 'ENABLE_SSO_CCA') return { enabled: ssoEnabled, isLoading: false };
    if (flag === 'DEMO_LOGIN_ENABLED') return { enabled: demoEnabled, isLoading: false };
    return { enabled: false, isLoading: false };
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

// Mock the logo asset — Vitest transforms images to their paths, but jsdom
// doesn't fetch them, so rendering is safe. Explicit mock keeps tests stable.
vi.mock('@/assets/cca-logo.png', () => ({ default: 'cca-logo.png' }));

import Login from '@/pages/auth/Login';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Login — form rendering', () => {
  beforeEach(() => {
    ssoEnabled = false;
    demoEnabled = false;
    vi.clearAllMocks();
  });

  it('renders the email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/palavra-passe/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('does NOT show the SSO button when flag is disabled', () => {
    renderLogin();
    expect(screen.queryByRole('button', { name: /sso/i })).not.toBeInTheDocument();
  });

  it('shows the SSO button when ENABLE_SSO_CCA flag is enabled', () => {
    ssoEnabled = true;
    renderLogin();
    expect(screen.getByRole('button', { name: /entrar com cca/i })).toBeInTheDocument();
  });

  it('does NOT show demo login when flag is disabled', () => {
    renderLogin();
    expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument();
  });

  it('shows demo login button when DEMO_LOGIN_ENABLED flag is enabled', () => {
    demoEnabled = true;
    renderLogin();
    expect(screen.getByRole('button', { name: /utilizador demo/i })).toBeInTheDocument();
  });
});

describe('Login — email validation', () => {
  beforeEach(() => {
    ssoEnabled = false;
    demoEnabled = false;
    vi.clearAllMocks();
  });

  it('shows email error message for invalid email input', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/e-mail/i);

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    await waitFor(() => {
      expect(screen.getByText(/e-mail válido/i)).toBeInTheDocument();
    });
  });

  it('clears email error when a valid email is typed', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/e-mail/i);

    // Trigger error
    fireEvent.change(emailInput, { target: { value: 'bad' } });
    await waitFor(() => expect(screen.getByText(/e-mail válido/i)).toBeInTheDocument());

    // Fix it
    fireEvent.change(emailInput, { target: { value: 'user@cca.pt' } });
    await waitFor(() => {
      expect(screen.queryByText(/e-mail válido/i)).not.toBeInTheDocument();
    });
  });

  it('does not submit the form if email is invalid', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitBtn = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'bad-email' } });
    fireEvent.click(submitBtn);

    // signIn should not have been called
    await waitFor(() => expect(mockSignIn).not.toHaveBeenCalled());
  });
});

describe('Login — form submission', () => {
  beforeEach(() => {
    ssoEnabled = false;
    demoEnabled = false;
    vi.clearAllMocks();
  });

  it('calls signIn with email and password on valid submit', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/palavra-passe/i);
    const form = emailInput.closest('form')!;

    fireEvent.change(emailInput, { target: { value: 'user@cca.pt' } });
    fireEvent.change(passwordInput, { target: { value: 'Str0ngPass!' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@cca.pt', 'Str0ngPass!');
    });
  });

  it('navigates to "/" on successful login', async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });
    renderLogin();

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/palavra-passe/i);

    fireEvent.change(emailInput, { target: { value: 'user@cca.pt' } });
    fireEvent.change(passwordInput, { target: { value: 'Str0ngPass!' } });
    fireEvent.submit(emailInput.closest('form')!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
