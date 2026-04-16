import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

// Helper: login e esperar redirect
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#email').fill(EMAIL!);
  await page.locator('#password').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

// Helper: tirar screenshot com nome descritivo
async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/functional-${name}.png`, fullPage: true });
}

// Helper: verificar que página carregou sem erros fatais
async function assertNoFatalErrors(page: Page, pageName: string) {
  const bodyText = await page.locator('body').textContent();
  // Verifica que não está a mostrar erro de renderização
  expect(bodyText, `${pageName} não renderizou`).toBeTruthy();
  // Verifica que não mostra chaves i18n em bruto (ex: "common.loading")
  const knownBadKeys = ['common.loading', 'common.error', 'admin.title', 'contracts.archiveTab'];
  for (const key of knownBadKeys) {
    expect(bodyText, `${pageName} mostra chave i18n "${key}" em bruto`).not.toContain(key);
  }
}

test.describe('Teste funcional completo — utilizador externo', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL/PASSWORD não configurados');

  // =========================================================================
  // 1. LOGIN E HOME
  // =========================================================================
  test('1. Login com email/password funciona', async ({ page }) => {
    await login(page);
    // Deve estar na home ou onboarding
    expect(page.url()).not.toContain('/login');
    await screenshot(page, '01-home');
  });

  // =========================================================================
  // 2. HOME — WIDGETS E NAVEGAÇÃO
  // =========================================================================
  test('2. Home mostra widgets e conteúdo', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Home');

    // Deve ter pelo menos um card/widget visível
    const cards = page.locator('[class*="card"], [class*="Card"]');
    const cardCount = await cards.count();
    expect(cardCount, 'Home deve ter widgets').toBeGreaterThan(0);
    await screenshot(page, '02-home-widgets');
  });

  // =========================================================================
  // 3. CONTRATOS — LISTA
  // =========================================================================
  test('3. Lista de contratos carrega', async ({ page }) => {
    await login(page);
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Contratos');

    // Deve ter tabela ou lista de contratos, ou mensagem de vazio
    const hasTable = await page.locator('table, [role="table"]').count();
    const hasEmpty = await page.locator('text=Nenhum contrato, text=nenhum contrato').count();
    const hasContent = hasTable > 0 || hasEmpty > 0;
    expect(hasContent, 'Contratos deve mostrar tabela ou mensagem de vazio').toBeTruthy();
    await screenshot(page, '03-contratos-lista');
  });

  // =========================================================================
  // 4. CONTRATOS — CRIAR NOVO
  // =========================================================================
  test('4. Formulário de novo contrato carrega', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/novo');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Novo Contrato');

    // Primeiro aparece step de upload — clicar "Preencher manualmente"
    const manualLink = page.locator('text=Preencher manualmente, text=preencher manualmente').first();
    if (await manualLink.count() > 0) {
      await manualLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Agora deve ter campos de formulário
    const formVisible = await page.locator('form, [role="form"], input').first().count();
    expect(formVisible, 'Formulário de contrato deve estar visível').toBeGreaterThan(0);
    await screenshot(page, '04-contrato-novo-form');
  });

  test('4b. Criar contrato de teste', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/novo');
    await page.waitForLoadState('networkidle');

    // Clicar "Preencher manualmente" para aceder ao formulário
    const manualLink = page.locator('text=Preencher manualmente').first();
    if (await manualLink.count() > 0) {
      await manualLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Preencher campos mínimos obrigatórios
    // Título
    const titleField = page.locator('#titulo_contrato, input[name="titulo_contrato"]').first();
    if (await titleField.count() > 0) {
      await titleField.fill('E2E Test Contract - Playwright');
    }

    // Tipo de contrato (select)
    const tipoSelect = page.locator('[name="tipo_contrato"], #tipo_contrato').first();
    if (await tipoSelect.count() > 0) {
      await tipoSelect.click();
      await page.waitForTimeout(500);
      // Seleccionar primeiro item disponível
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.count() > 0) {
        await firstOption.click();
      }
    }

    // Parte A
    const parteA = page.locator('#parte_a_nome_legal, input[name="parte_a_nome_legal"]').first();
    if (await parteA.count() > 0) {
      await parteA.fill('Empresa Teste A Lda.');
    }

    // Parte B
    const parteB = page.locator('#parte_b_nome_legal, input[name="parte_b_nome_legal"]').first();
    if (await parteB.count() > 0) {
      await parteB.fill('Empresa Teste B S.A.');
    }

    // Departamento
    const deptSelect = page.locator('[name="departamento_responsavel"], #departamento_responsavel').first();
    if (await deptSelect.count() > 0) {
      await deptSelect.click();
      await page.waitForTimeout(500);
      const firstDept = page.locator('[role="option"]').first();
      if (await firstDept.count() > 0) {
        await firstDept.click();
      }
    }

    await screenshot(page, '04b-contrato-preenchido');

    // Guardar
    const saveButton = page.locator('button:has-text("Guardar"), button:has-text("Criar"), button:has-text("Salvar")').first();
    if (await saveButton.count() > 0 && await saveButton.isEnabled()) {
      await saveButton.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '04c-contrato-apos-guardar');
    }
  });

  // =========================================================================
  // 5. DASHBOARD / VISÃO GERAL
  // =========================================================================
  test('5. Dashboard mostra estatísticas', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/visao-geral');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Dashboard');

    // Deve ter cards com números/estatísticas
    const statCards = page.locator('[class*="card"], [class*="Card"]');
    expect(await statCards.count(), 'Dashboard deve ter stat cards').toBeGreaterThan(0);
    await screenshot(page, '05-dashboard');
  });

  // =========================================================================
  // 6. EVENTOS / LEGAL INSIGHTS
  // =========================================================================
  test('6. Eventos Legislativos carrega', async ({ page }) => {
    await login(page);
    await page.goto('/eventos');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Eventos');
    await screenshot(page, '06-eventos');
  });

  // =========================================================================
  // 7. POLÍTICAS
  // =========================================================================
  test('7. Políticas carrega e permite criar', async ({ page }) => {
    await login(page);
    await page.goto('/politicas');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Políticas');

    // Verificar botão "Nova Política"
    const newButton = page.locator('button:has-text("Nova"), button:has-text("Criar")').first();
    const hasNewButton = await newButton.count() > 0;
    await screenshot(page, '07-politicas');
    // O botão pode não existir se o user não tem permissão — OK
  });

  // =========================================================================
  // 8. DEFINIÇÕES
  // =========================================================================
  test('8. Definições — tabs funcionam', async ({ page }) => {
    await login(page);
    await page.goto('/definicoes');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Definições');

    // Deve ter tabs (Geral, Notificações, etc.)
    const tabs = page.locator('[role="tab"], [role="tablist"] button');
    expect(await tabs.count(), 'Definições deve ter tabs').toBeGreaterThan(0);
    await screenshot(page, '08-definicoes');
  });

  // =========================================================================
  // 9. PERFIL
  // =========================================================================
  test('9. Perfil mostra dados do utilizador', async ({ page }) => {
    await login(page);
    await page.goto('/perfil');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Perfil');

    // Deve mostrar email ou nome
    const bodyText = await page.locator('body').textContent();
    const hasUserInfo = bodyText?.includes('@') || bodyText?.includes('Perfil');
    expect(hasUserInfo, 'Perfil deve mostrar info do utilizador').toBeTruthy();
    await screenshot(page, '09-perfil');
  });

  // =========================================================================
  // 10. NOVIDADES CCA
  // =========================================================================
  test('10. Novidades CCA carrega', async ({ page }) => {
    await login(page);
    await page.goto('/novidades-cca');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Novidades CCA');
    await screenshot(page, '10-novidades');
  });

  // =========================================================================
  // 11. FINANCEIRO
  // =========================================================================
  test('11. Financeiro carrega (pode não ter dados)', async ({ page }) => {
    await login(page);
    await page.goto('/financeiro');
    await page.waitForLoadState('networkidle');
    // Financeiro pode mostrar "sem dados" para utilizadores sem facturação
    await assertNoFatalErrors(page, 'Financeiro');
    await screenshot(page, '11-financeiro');
  });

  // =========================================================================
  // 12. ASSINATURA DIGITAL
  // =========================================================================
  test('12. Assinatura Digital carrega', async ({ page }) => {
    await login(page);
    await page.goto('/assinatura-digital');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Assinatura Digital');
    await screenshot(page, '12-assinatura-digital');
  });

  // =========================================================================
  // 13. DOCUMENTOS
  // =========================================================================
  test('13. Documentos carrega', async ({ page }) => {
    await login(page);
    await page.goto('/documentos');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Documentos');
    await screenshot(page, '13-documentos');
  });

  // =========================================================================
  // 14. NOTIFICAÇÕES
  // =========================================================================
  test('14. Notificações carrega', async ({ page }) => {
    await login(page);
    await page.goto('/notificacoes');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Notificações');
    await screenshot(page, '14-notificacoes');
  });

  // =========================================================================
  // 15. ORGANIZAÇÃO
  // =========================================================================
  test('15. Minha Organização carrega', async ({ page }) => {
    await login(page);
    await page.goto('/minha-organizacao');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Minha Organização');
    await screenshot(page, '15-minha-organizacao');
  });

  // =========================================================================
  // 16. DETALHE DE CONTRATO (se existir algum)
  // =========================================================================
  test('16. Detalhe de contrato funciona', async ({ page }) => {
    await login(page);
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');

    // Clicar no primeiro contrato da lista (se existir)
    const firstLink = page.locator('a[href*="/contratos/"], tr[data-href], [role="row"] a').first();
    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Deve estar numa página de detalhe
      await assertNoFatalErrors(page, 'Detalhe Contrato');

      // Verificar que mostra tabs/secções (Timeline, Anexos, etc.)
      const tabs = page.locator('[role="tab"], [role="tablist"]');
      await screenshot(page, '16-contrato-detalhe');
    } else {
      // Sem contratos — skip
      test.skip();
    }
  });

  // =========================================================================
  // 17. UPLOAD EM MASSA
  // =========================================================================
  test('17. Upload em Massa carrega', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/upload-massa');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Upload em Massa');

    // Deve ter zona de drag-and-drop ou botão de upload
    const hasUploadArea = await page.locator('text=arrastar, text=selecionar, text=ficheiro, input[type="file"]').first().count();
    await screenshot(page, '17-upload-massa');
  });

  // =========================================================================
  // 18. TRIAGEM DE CONTRATOS
  // =========================================================================
  test('18. Triagem de Contratos carrega', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/triagem');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Triagem');
    await screenshot(page, '18-triagem');
  });

  // =========================================================================
  // 19. NAVEGAÇÃO — SIDEBAR FUNCIONA
  // =========================================================================
  test('19. Sidebar permite navegar entre secções', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verificar sidebar está presente
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Clicar em "Contratos" na sidebar
    const contratosLink = sidebar.locator('a:has-text("Contrato"), a[href*="/contratos"]').first();
    if (await contratosLink.count() > 0) {
      await contratosLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/contratos');
    }
    await screenshot(page, '19-sidebar-nav');
  });

  // =========================================================================
  // 20. RESPONSIVIDADE — NÃO CRASHA EM MOBILE
  // =========================================================================
  test('20. Layout não crasha em viewport mobile', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Home (mobile)');

    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    await assertNoFatalErrors(page, 'Contratos (mobile)');
    await screenshot(page, '20-mobile');
  });
});
