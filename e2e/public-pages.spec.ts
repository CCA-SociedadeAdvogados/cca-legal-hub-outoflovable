import { test, expect } from '@playwright/test';

/**
 * Testa páginas públicas que não requerem autenticação.
 * Estes testes apanham erros de renderização, i18n, e JS broken.
 */

// Erros que ignoramos (ambiente de teste sem Supabase real)
function isEnvironmentNoise(err: string): boolean {
  return (
    err.includes('401') ||
    err.includes('403') ||
    err.includes('404') ||
    err.includes('Failed to fetch') ||
    err.includes('NetworkError') ||
    err.includes('ERR_CERT') ||
    err.includes('ERR_NAME_NOT_RESOLVED') ||
    err.includes('ERR_INTERNET_DISCONNECTED') ||
    err.includes('ERR_CONNECTION') ||
    err.includes('Failed to load resource') ||
    err.includes('Refused to apply style') ||
    err.includes('Invalid API key') ||
    err.includes('supabase')
  );
}

test.describe('Página de Login', () => {
  test('carrega sem erros críticos de JavaScript', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // deixa scripts executarem

    const critical = errors.filter((e) => !isEnvironmentNoise(e));
    expect(critical, `Erros críticos: ${critical.join(' | ')}`).toEqual([]);
  });

  test('mostra campos de input de email e password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Procura por inputs por tipo (mais robusto que labels)
    const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible();
  });

  test('mostra botão de submit', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
  });

  test('renderiza texto traduzido (sem chaves i18n em bruto visíveis)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Procura especificamente por chaves comuns conhecidas que não deviam aparecer
    const knownI18nKeys = [
      'common.title',
      'auth.login',
      'admin.title',
      'admin.subtitle',
      'common.loading',
      'common.error',
    ];

    const bodyText = (await page.locator('body').textContent()) ?? '';
    const leaked = knownI18nKeys.filter((key) => bodyText.includes(key));
    expect(leaked, `Chaves i18n expostas: ${leaked.join(', ')}`).toEqual([]);
  });
});

test.describe('Redirects de rotas protegidas', () => {
  // Rotas realmente protegidas (existentes em App.tsx)
  const protectedRoutes = [
    '/',
    '/contratos',
    '/eventos',
    '/politicas',
    '/perfil',
    '/definicoes',
    '/admin',
    '/assinatura-digital',
    '/documentos',
    '/novidades-cca',
    '/financeiro',
  ];

  for (const route of protectedRoutes) {
    test(`${route} não acede sem autenticação`, async ({ page }) => {
      await page.goto(route);
      // Aguarda pelo redirect OU pela página de login aparecer
      await page.waitForFunction(
        () => window.location.pathname === '/login' || !!document.querySelector('input[type="password"]'),
        { timeout: 15_000 },
      );
      expect(page.url()).toContain('/login');
    });
  }
});

test.describe('Robustez', () => {
  test('rota inexistente não crasha a app', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/esta-rota-nao-existe-12345');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const critical = pageErrors.filter((e) => !isEnvironmentNoise(e));
    expect(critical).toEqual([]);
  });
});
