import { test, expect } from '@playwright/test';

/**
 * Testes de fluxos autenticados.
 *
 * Estes testes só correm se E2E_TEST_EMAIL e E2E_TEST_PASSWORD estiverem
 * definidos nas env vars. Caso contrário, são skipped automaticamente.
 *
 * Configurar no GitHub Actions via secrets:
 *   E2E_TEST_EMAIL=...
 *   E2E_TEST_PASSWORD=...
 */

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('Fluxos autenticados', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL/PASSWORD não configurados');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill(EMAIL!);
    await page.getByLabel(/palavra-passe|password/i).first().fill(PASSWORD!);
    await page.locator('button[type="submit"]').first().click();
    // Espera pelo redirect pós-login
    await page.waitForURL(/\/(|dashboard|onboarding)/, { timeout: 15_000 });
  });

  test('Dashboard carrega sem erros', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(
      (e) => !e.includes('401') && !e.includes('Failed to fetch'),
    );
    expect(critical).toEqual([]);
  });

  test('Página de Contratos carrega', async ({ page }) => {
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Página de Prazos (Timeline) carrega', async ({ page }) => {
    await page.goto('/prazos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Página de Definições carrega', async ({ page }) => {
    await page.goto('/definicoes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Página de Templates carrega', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Página de Políticas carrega', async ({ page }) => {
    await page.goto('/politicas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Navegar para detalhe de contrato via lista', async ({ page }) => {
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    // Se existirem contratos, clicar no primeiro
    const firstRow = page.locator('[role="row"], table tbody tr').first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/contratos\/[a-f0-9-]+/i);
    }
  });
});
