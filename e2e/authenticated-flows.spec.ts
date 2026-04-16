import { test, expect } from '@playwright/test';

/**
 * Testes de fluxos autenticados.
 *
 * Só correm se E2E_TEST_EMAIL e E2E_TEST_PASSWORD estiverem definidos.
 */

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe.configure({ mode: 'serial' });

test.describe('Fluxos autenticados', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL/PASSWORD não configurados');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Preencher login
    await page.locator('#email').fill(EMAIL!);
    await page.locator('#password').fill(PASSWORD!);
    await page.locator('button[type="submit"]').click();

    // Espera pelo redirect pós-login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
    await page.waitForLoadState('networkidle');
  });

  test('Home carrega sem erros', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Já estamos logados — navegamos para home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(
      (e) =>
        !e.includes('401') &&
        !e.includes('403') &&
        !e.includes('Failed to fetch') &&
        !e.includes('ERR_'),
    );
    expect(critical).toEqual([]);
  });

  test('Página de Contratos carrega e mostra conteúdo', async ({ page }) => {
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    // Deve ter algum título ou tabela visível
    const content = await page.locator('h1, h2, table, [role="table"]').first();
    await expect(content).toBeVisible({ timeout: 15_000 });
  });

  test('Dashboard (Visão Geral) carrega', async ({ page }) => {
    await page.goto('/contratos/visao-geral');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Página de Políticas carrega', async ({ page }) => {
    await page.goto('/politicas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Página de Definições carrega', async ({ page }) => {
    await page.goto('/definicoes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Perfil carrega e mostra nome', async ({ page }) => {
    await page.goto('/perfil');
    await page.waitForLoadState('networkidle');
    // A página deve mostrar o formulário de perfil
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Novidades CCA carrega', async ({ page }) => {
    await page.goto('/novidades-cca');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Financeiro carrega', async ({ page }) => {
    await page.goto('/financeiro');
    await page.waitForLoadState('networkidle');
    // Pode mostrar mensagem de "sem dados" — o importante é não crashar
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('i18n funciona em páginas autenticadas (contratos)', async ({ page }) => {
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const bodyText = (await page.locator('body').textContent()) ?? '';
    // Chaves conhecidas que corrigimos — não devem aparecer em bruto
    const knownKeys = [
      'contracts.archiveTab',
      'contracts.openEnded',
      'dashboard.docCompliance',
      'prazos.renewal',
      'admin.title',
    ];
    const leaked = knownKeys.filter((key) => bodyText.includes(key));
    expect(leaked, `Chaves i18n expostas: ${leaked.join(', ')}`).toEqual([]);
  });
});
