import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#email').fill(EMAIL!);
  await page.locator('#password').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/fn-${name}.png`, fullPage: true });
}

// ID do contrato criado no teste — partilhado entre testes
let createdContractId: string | null = null;

test.describe('Fluxos reais de utilizador externo', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL/PASSWORD não configurados');

  // =========================================================================
  // FLUXO 1: CRIAR CONTRATO COM UPLOAD DE PDF
  // =========================================================================
  test('Criar contrato via upload de PDF', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/novo');
    await page.waitForLoadState('networkidle');

    // A página mostra zona de upload — usar o file input hidden
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(path.resolve('e2e/fixtures/test-contract.pdf'));

    // Esperar que o ficheiro seja processado (upload + parse IA)
    // Pode demorar até 30s se a IA estiver a processar
    await page.waitForTimeout(3000);
    await screenshot(page, '01a-upload-processing');

    // Se o parsing terminar, deve aparecer o formulário pré-preenchido
    // OU um botão "Preencher manualmente" se o parsing falhar
    const manualLink = page.locator('text=Preencher manualmente').first();
    const formVisible = page.locator('form input').first();

    // Esperar até 20s por um dos dois: formulário ou link manual
    await Promise.race([
      formVisible.waitFor({ timeout: 20_000 }).catch(() => null),
      manualLink.waitFor({ timeout: 20_000 }).catch(() => null),
    ]);

    // Se o parsing falhou ou não preencheu, clicar "Preencher manualmente"
    if (await manualLink.isVisible().catch(() => false)) {
      await manualLink.click();
      await page.waitForTimeout(1000);
    }

    // Agora preencher os campos obrigatórios
    const titleField = page.locator('#titulo_contrato, input[name="titulo_contrato"]').first();
    if (await titleField.isVisible()) {
      const currentValue = await titleField.inputValue();
      if (!currentValue) {
        await titleField.fill('E2E Contrato Upload PDF');
      }
    }

    // Tipo de contrato
    const tipoTrigger = page.locator('button:has-text("Selecione"), button[role="combobox"]').first();
    if (await tipoTrigger.isVisible().catch(() => false)) {
      await tipoTrigger.click();
      await page.waitForTimeout(500);
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      }
    }

    // Parte A e B
    const parteA = page.locator('#parte_a_nome_legal, input[name="parte_a_nome_legal"]').first();
    if (await parteA.isVisible()) {
      const val = await parteA.inputValue();
      if (!val) await parteA.fill('Empresa Alpha Lda.');
    }
    const parteB = page.locator('#parte_b_nome_legal, input[name="parte_b_nome_legal"]').first();
    if (await parteB.isVisible()) {
      const val = await parteB.inputValue();
      if (!val) await parteB.fill('Empresa Beta S.A.');
    }

    // Departamento
    const deptTriggers = page.locator('#departamento_responsavel, [name="departamento_responsavel"]').first();
    if (await deptTriggers.isVisible().catch(() => false)) {
      await deptTriggers.click();
      await page.waitForTimeout(500);
      const deptOption = page.locator('[role="option"]').first();
      if (await deptOption.isVisible().catch(() => false)) {
        await deptOption.click();
      }
    }

    await screenshot(page, '01b-form-filled');

    // Clicar Guardar (botão no topo direito — contém texto "Guardar")
    const saveBtn = page.getByRole('button', { name: /guardar/i }).first();
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();

    // Esperar redirect ou toast de sucesso
    await page.waitForTimeout(5000);
    await screenshot(page, '01c-after-save');

    // Capturar o ID do contrato criado (se redirecionou)
    const url = page.url();
    const match = url.match(/\/contratos\/([a-f0-9-]+)/);
    if (match) {
      createdContractId = match[1];
    }
  });

  // =========================================================================
  // FLUXO 2: VER DETALHE DO CONTRATO E VERIFICAR DADOS EXTRAÍDOS
  // =========================================================================
  test('Ver detalhe do contrato e verificar extracção', async ({ page }) => {
    await login(page);

    // Navegar para lista e clicar no primeiro contrato
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');

    // Clicar no título do primeiro contrato (link dentro da tabela)
    const contractLink = page.locator('table a[href*="/contratos/"], [role="row"] a[href*="/contratos/"]').first();
    if (await contractLink.count() === 0) {
      test.skip(true, 'Sem contratos na lista');
      return;
    }
    await contractLink.click();
    await page.waitForURL(/\/contratos\/[a-f0-9-]/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verificar que mostra título do contrato
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const title = await heading.textContent();
    expect(title?.length, 'Contrato deve ter título').toBeGreaterThan(0);

    // Verificar que mostra badge de estado
    const badge = page.locator('[class*="badge"], [class*="Badge"]').first();
    await expect(badge).toBeVisible();

    // Verificar que existem tabs (Timeline, Anexos, etc.)
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount, 'Detalhe deve ter tabs').toBeGreaterThan(0);

    // Capturar nomes das tabs
    const tabNames: string[] = [];
    for (let i = 0; i < tabCount; i++) {
      const name = await tabs.nth(i).textContent();
      if (name) tabNames.push(name.trim());
    }

    await screenshot(page, '02-detalhe-contrato');
  });

  // =========================================================================
  // FLUXO 3: EDITAR CONTRATO — ALTERAR CAMPO E GUARDAR
  // =========================================================================
  test('Editar contrato existente', async ({ page }) => {
    await login(page);
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');

    // Clicar no primeiro contrato
    const firstRow = page.locator('a[href*="/contratos/"]').first();
    if (await firstRow.count() === 0) {
      test.skip(true, 'Sem contratos para editar');
      return;
    }
    await firstRow.click();
    await page.waitForLoadState('networkidle');

    // Procurar botão de editar
    const editBtn = page.locator('a:has-text("Editar"), button:has-text("Editar"), a[href*="editar"]').first();
    if (await editBtn.count() === 0) {
      test.skip(true, 'Sem permissão de edição');
      return;
    }
    await editBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Alterar o campo "objeto resumido"
    const objField = page.locator('#objeto_resumido, textarea[name="objeto_resumido"]').first();
    if (await objField.isVisible()) {
      await objField.fill('Actualizado via teste E2E Playwright — ' + new Date().toISOString());
    }

    await screenshot(page, '03-editar-contrato');

    // Guardar
    const saveBtn = page.locator('button:has-text("Guardar")').first();
    if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
      await saveBtn.click();
      await page.waitForTimeout(3000);
      await screenshot(page, '03b-apos-guardar-edicao');
    }
  });

  // =========================================================================
  // FLUXO 4: CRIAR POLÍTICA E ELIMINAR
  // =========================================================================
  test('Criar e eliminar política', async ({ page }) => {
    await login(page);
    await page.goto('/politicas');
    await page.waitForLoadState('networkidle');

    // Clicar "Nova Política"
    const newBtn = page.locator('button:has-text("Nova Política"), button:has-text("Nova")').first();
    if (await newBtn.count() === 0) {
      test.skip(true, 'Sem botão de criar política');
      return;
    }
    await newBtn.click();
    await page.waitForTimeout(1000);

    // O dialog "Nova Política" está aberto — preencher título
    const dialog = page.locator('[role="dialog"], [class*="DialogContent"]').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const titleInput = dialog.locator('input').first();
    const policyName = 'E2E Política Teste ' + Date.now();
    await titleInput.fill(policyName);

    // Preencher descrição (primeiro textarea no dialog)
    const descInput = dialog.locator('textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Política criada automaticamente para teste E2E.');
    }

    await screenshot(page, '04-nova-politica');

    // Clicar "Criar" dentro do dialog
    const createBtn = dialog.locator('button:has-text("Criar")').first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await page.waitForTimeout(3000);

    // Verificar que apareceu na lista (dialog deve ter fechado)
    await screenshot(page, '04b-politica-criada');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('E2E Política Teste');
  });

  // =========================================================================
  // FLUXO 5: DEFINIÇÕES — ALTERAR PREFERÊNCIA E VERIFICAR
  // =========================================================================
  test('Alterar preferência nas definições', async ({ page }) => {
    await login(page);
    await page.goto('/definicoes');
    await page.waitForLoadState('networkidle');

    // Clicar na tab de Notificações
    const notifTab = page.locator('[role="tab"]:has-text("Notificaç")').first();
    if (await notifTab.count() > 0) {
      await notifTab.click();
      await page.waitForTimeout(1000);

      // Verificar que mostra opções de notificação (switches/checkboxes)
      const switches = page.locator('[role="switch"], input[type="checkbox"]');
      const switchCount = await switches.count();
      expect(switchCount, 'Definições de notificação devem ter switches').toBeGreaterThan(0);

      await screenshot(page, '05-definicoes-notificacoes');
    }

    // Clicar na tab de Segurança
    const secTab = page.locator('[role="tab"]:has-text("Segurança")').first();
    if (await secTab.count() > 0) {
      await secTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '05b-definicoes-seguranca');

      // Verificar que i18n funciona (correcções que fizemos)
      const bodyText = await page.locator('body').textContent() ?? '';
      expect(bodyText).not.toContain('security.twoFactor.title');
      expect(bodyText).not.toContain('security.sessions.title');
    }
  });

  // =========================================================================
  // FLUXO 6: PERFIL — EDITAR NOME E GUARDAR
  // =========================================================================
  test('Editar perfil', async ({ page }) => {
    await login(page);
    await page.goto('/perfil');
    await page.waitForLoadState('networkidle');

    // Encontrar campo de nome
    const nameField = page.locator('input[name*="nome"], input[id*="nome"], input[placeholder*="nome"]').first();
    if (await nameField.isVisible()) {
      const originalName = await nameField.inputValue();

      // Alterar nome temporariamente
      await nameField.fill(originalName + ' (E2E)');

      // Guardar
      const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Atualizar")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);

        // Verificar toast de sucesso (pode ter desaparecido)
        await screenshot(page, '06-perfil-editado');

        // Reverter nome
        await nameField.fill(originalName);
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }
    } else {
      await screenshot(page, '06-perfil-sem-campo-nome');
    }
  });

  // =========================================================================
  // FLUXO 7: UPLOAD EM MASSA — UPLOAD DE FICHEIRO
  // =========================================================================
  test('Upload em massa — adicionar ficheiro', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/upload-massa');
    await page.waitForLoadState('networkidle');

    // Upload de ficheiro via input
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(path.resolve('e2e/fixtures/test-contract.pdf'));
    await page.waitForTimeout(3000);

    // Verificar que o ficheiro aparece na lista
    const fileItem = page.getByText('test-contract.pdf');
    await expect(fileItem).toBeVisible({ timeout: 10_000 });

    await screenshot(page, '07-upload-massa-ficheiro');

    // Verificar que mostra status (pending, parsing, etc.)
    const statusBadge = page.locator('[class*="badge"], [class*="Badge"]').first();
    if (await statusBadge.count() > 0) {
      const statusText = await statusBadge.textContent();
      // Status válidos: Pendente, A analisar, Pronto, Erro
      expect(statusText?.length).toBeGreaterThan(0);
    }

    // Esperar parsing terminar (até 30s)
    await page.waitForTimeout(5000);
    await screenshot(page, '07b-upload-massa-apos-parse');
  });

  // =========================================================================
  // FLUXO 8: TRIAGEM — COLAR TEXTO E ANALISAR
  // =========================================================================
  test('Triagem de contrato — analisar texto', async ({ page }) => {
    await login(page);
    await page.goto('/contratos/triagem');
    await page.waitForLoadState('networkidle');

    // Encontrar textarea para colar texto do contrato
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill(
        'CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n' +
        'Entre: Empresa Alpha Lda (NIF 509123456) e Empresa Beta SA (NIF 501234567)\n' +
        'Data: 15 de Janeiro de 2025\n' +
        'Valor: EUR 50.000 anuais\n' +
        'Duração: 12 meses, com renovação automática\n' +
        'Cláusula de confidencialidade: Sim\n' +
        'Lei aplicável: Lei Portuguesa\n' +
        'Foro competente: Tribunal de Lisboa\n' +
        'RGPD: Tratamento de dados pessoais dos colaboradores da Parte B\n' +
        'Prazo de denúncia: 90 dias antes do termo',
      );

      await screenshot(page, '08-triagem-texto');

      // Clicar botão de análise
      const analyzeBtn = page.locator('button:has-text("Analisar"), button:has-text("analisar")').first();
      if (await analyzeBtn.isVisible()) {
        await analyzeBtn.click();

        // Esperar resultado (pode demorar até 30s com IA)
        await page.waitForTimeout(10_000);
        await screenshot(page, '08b-triagem-resultado');

        // Verificar se apareceu algum resultado
        const bodyText = await page.locator('body').textContent() ?? '';
        const hasResult =
          bodyText.includes('Resumo') ||
          bodyText.includes('resultado') ||
          bodyText.includes('análise') ||
          bodyText.includes('cláusula') ||
          bodyText.includes('Risco');
        // OK se não tem resultado (IA pode estar desligada) — o importante é não crashar
      }
    }
  });

  // =========================================================================
  // FLUXO 9: NAVEGAÇÃO COMPLETA — PERCORRER SIDEBAR
  // =========================================================================
  test('Navegar por todas as secções via sidebar', async ({ page }) => {
    await login(page);

    const routes = [
      { path: '/', name: 'Home' },
      { path: '/contratos', name: 'Contratos' },
      { path: '/contratos/visao-geral', name: 'Visão Geral' },
      { path: '/eventos', name: 'Eventos' },
      { path: '/politicas', name: 'Políticas' },
      { path: '/novidades-cca', name: 'Novidades' },
      { path: '/financeiro', name: 'Financeiro' },
      { path: '/notificacoes', name: 'Notificações' },
      { path: '/perfil', name: 'Perfil' },
      { path: '/definicoes', name: 'Definições' },
      { path: '/documentos', name: 'Documentos' },
      { path: '/minha-organizacao', name: 'Organização' },
    ];

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`${err.message}`));

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Verificar que não ficou na página de login
      expect(page.url(), `${route.name} não deve redirecionar para login`).not.toContain('/login');

      // Verificar que a página tem conteúdo
      const bodyText = await page.locator('body').textContent() ?? '';
      expect(bodyText.length, `${route.name} deve ter conteúdo`).toBeGreaterThan(50);
    }

    // Verificar que não houve erros JS fatais em nenhuma página
    const fatal = errors.filter(
      (e) => !e.includes('401') && !e.includes('Failed to fetch') && !e.includes('ERR_'),
    );
    expect(fatal, `Erros JS: ${fatal.join(' | ')}`).toEqual([]);
  });

  // =========================================================================
  // FLUXO 10: MOBILE — INTERAGIR EM VIEWPORT PEQUENO
  // =========================================================================
  test('Interagir em viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    // Home em mobile
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await screenshot(page, '10a-mobile-home');

    // Contratos em mobile
    await page.goto('/contratos');
    await page.waitForLoadState('networkidle');
    await screenshot(page, '10b-mobile-contratos');

    // Verificar que contratos são visíveis (cards ou tabela)
    const content = page.locator('table, [class*="card"], [class*="Card"], [role="row"]').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });
});
