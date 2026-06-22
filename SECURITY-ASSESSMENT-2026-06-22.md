# Avaliação de Cibersegurança e Conformidade Regulatória UE — CCA Legal Hub

**Data:** 2026-06-22
**Tipo:** Avaliação estática de segurança (revisão de código / pentest white-box) + análise de conformidade RGPD/NIS2/DORA/ePrivacy
**Âmbito:** Codebase completo — SPA React + 40 Supabase Edge Functions (Deno) + 122 migrações SQL + CI/CD + agente on-premises de sincronização
**Avaliador:** Especialista em cibersegurança / pentester (revisão autorizada do próprio código do cliente)
**Nota:** Nenhum ficheiro de produção foi alterado. Esta avaliação é independente e substitui/atualiza o `SECURITY-ANALYSIS-REPORT.md` (2026-03-04), validando o estado atual de cada item.

---

## 1. Sumário executivo

O CCA Legal Hub demonstra uma **camada de base sólida e madura** — modelo RLS multi-tenant progressivamente endurecido, CSP e cabeçalhos de segurança bem configurados, MFA TOTP, framework DSAR (exportação/eliminação), prevenção de enumeração de utilizadores no login e ausência de segredos hardcoded no frontend. Estes são sinais de uma equipa atenta à segurança.

Contudo, a avaliação identificou **um padrão sistémico de alto risco**: a combinação de Edge Functions com `verify_jwt = false` que invocam a **service-role key** (que ignora todo o RLS) **sem revalidarem a identidade nem a organização do chamador**. Isto expõe dados jurídicos confidenciais de clientes — protegidos por sigilo profissional de advogado — a acesso não autorizado, em alguns casos a partir da internet anónima.

### Top 5 riscos (por prioridade de remediação)

| # | Risco | Severidade | Exploração |
|---|-------|------------|------------|
| 1 | **Funções de IA sem autenticação** (`contract-chat`, `multi-contract-analysis`, etc.) acedem a contratos com service-role e devolvem dados a partir de um `contract_id`/`organization_id` arbitrário | **CRÍTICA** | Anónima, internet |
| 2 | **`contract_ai_extractions` / `contract_ai_jobs` com RLS `USING(true)`** — qualquer autenticado lê payloads de extração de IA de todos os contratos | **CRÍTICA** | Qualquer conta |
| 3 | **`demo-login` promove a conta demo a `platform_admin` global** (superadmin) | **CRÍTICA** (condicionada a flag) | Anónima se `DEMO_LOGIN_ENABLED=true` |
| 4 | **Transferência de dados pessoais para LLM nos EUA (Anthropic)** sem divulgação, salvaguardas (SCC) nem opt-out | **ALTA** (RGPD Art. 44/28/13) | N/A (conformidade) |
| 5 | **`isAuthorizedForOrg` autoriza qualquer utilizador SSO CCA sobre qualquer organização** de cliente | **ALTA** | Qualquer colaborador CCA |

### Classificação global de risco: **ELEVADO**
A postura de base é boa, mas os achados críticos de controlo de acesso em funções que manipulam dados sujeitos a sigilo profissional, combinados com lacunas de conformidade RGPD (transferências internacionais, consentimento de cookies, notificação de violações), colocam o risco agregado em nível **Elevado** até remediação dos itens P0/P1.

---

## 2. Metodologia e âmbito

- **Revisão de código estática (SAST manual)** das 40 Edge Functions e módulos `_shared/`.
- **Análise das 122 migrações SQL** com reconstrução do *estado final efetivo* das políticas RLS (muitas migrações sobrepõem-se via `DROP POLICY`/`CREATE OR REPLACE`).
- **Auditoria do frontend** (gestão de sessão, XSS, controlo de acesso client-side, fluxo SSO/impersonação).
- **Mapeamento de conformidade** RGPD (Reg. (UE) 2016/679), ePrivacy (Dir. 2002/58 / Lei 41/2004), NIS2 (Dir. (UE) 2022/2555) e DORA (Reg. (UE) 2022/2554).
- **Análise de dependências** (`npm audit`) e **CI/CD** (GitHub Actions).
- **Limitação:** análise estática. Não foi executado DAST/pentest dinâmico em ambiente *running*, nem foi possível validar variáveis de ambiente de produção (ex.: `ALLOWED_ORIGIN`, `DEMO_LOGIN_ENABLED`) nem os advisors do Supabase (token MCP não autorizado). Recomenda-se complementar com DAST e revisão de configuração de produção.

---

## 3. Matriz de achados

| ID | Achado | Sev. | Estado |
|----|--------|------|--------|
| C-01 | Funções de IA sem auth + service-role → exfiltração cross-tenant + denial-of-wallet | Crítica | Aberto |
| C-02 | `contract_ai_extractions`/`contract_ai_jobs` RLS `USING(true)` | Crítica | Aberto |
| C-03 | `demo-login` → `platform_admin` global | Crítica | Aberto (gated) |
| H-01 | `isAuthorizedForOrg`: qualquer SSO CCA gere qualquer org | Alta | Aberto |
| H-02 | Bucket `legal-mirror` gravável por anónimos (falta `TO service_role`) | Alta | Aberto |
| H-03 | SSRF/IDOR em `fetch-azure-photo` via `sso_external_id` | Alta | Aberto |
| H-04 | `admin-create-user` devolve password em claro | Alta | Aberto |
| H-05 | Restauro de impersonação não-bloqueante + `impersonatedOrgId` forjável | Alta | Aberto |
| H-06 | Transferência internacional de PII para Anthropic (EUA) sem salvaguardas | Alta | Aberto (RGPD) |
| H-07 | Sync Business Central por HTTP em claro + service-role key on-premises | Alta | Aberto |
| M-01 | CORS faz fallback para `*` | Média | Aberto |
| M-02 | Bucket `politicas` acessível cross-org por qualquer autenticado | Média | Aberto |
| M-03 | RPCs `fn_get_*_for_actor` não fixam `p_user_id=auth.uid()` + grant a `anon` | Média | Aberto |
| M-04 | SSO: debug info, nonce opcional, assinatura ID token não verificada, IDs hardcoded | Média | Aberto |
| M-05 | Prompt injection nas funções de IA | Média | Aberto |
| M-06 | Segredos CRON partilhados (`NAV_SYNC_SECRET`) + comparação não constante | Média | Aberto |
| M-07 | SSRF interno em `sync-sharepoint` (site_id/drive_id arbitrários) | Média | Aberto |
| M-08 | `mirror-run` desativa validação de certificado TLS | Média | Aberto |
| M-09 | XSS via `document.write` em `ExportPDFButton` | Média | Aberto |
| M-10 | `state` SSO não validado no cliente (validado server-side) | Média | Aberto |
| M-11 | `execute_data_retention()` ignora `deletion_type` (hard-delete sempre) | Média | Aberto |
| M-12 | Sem banner de consentimento de cookies (ePrivacy) | Média | Aberto |
| M-13 | `user-data-export` sem scoping por organização | Média | Aberto |
| M-14 | Eliminação RGPD = anonimização; não cobre Storage/backups | Média | Aberto |
| M-15 | Sem logging de acessos (VIEW) a dados pessoais | Média | Aberto |
| M-16 | Sem mecanismo de deteção/notificação de violações (Art. 33/34) | Média | Aberto |
| M-17 | Validação de upload sem magic bytes | Média | Aberto |
| M-18 | Tokens em `localStorage`; sem PKCE | Média | Aberto |
| L-01 | `feature_flags` legível por `anon` | Baixa | Aberto |
| L-02 | Fuga de `error.message` em toasts e respostas API | Baixa | Aberto |
| L-03 | URLs da BD em `href`/`iframe`/`window.open` sem validação de esquema | Baixa | Aberto |
| L-04 | `user_belongs_to_organization` com argumentos trocados (fail-closed) | Baixa | Aberto |
| L-05 | `match-legislation` grava `created_by_id = null` | Baixa | Aberto |
| L-06 | Rate limiting in-memory / ausente em vários endpoints | Baixa | Aberto |
| L-07 | Registo de consentimento sem `ip`/`user_agent`; `policy_version` hardcoded | Baixa | Aberto |
| L-08 | CI sem SAST/`npm audit`; lint "report-only" | Baixa | Aberto |
| L-09 | Dependências vulneráveis (maioria dev-only; runtime: react-router-dom, lodash) | Baixa | Aberto |

---

## 4. Achados detalhados

### A. Autenticação e Autorização

#### C-01 — [CRÍTICA] Funções de IA sem autenticação acedem a dados com service-role
**Ficheiros:** `supabase/functions/contract-chat/index.ts:42-97`, `multi-contract-analysis/index.ts`, `generate-contract`, `redline-contract`, `validate-contract`, `translate-content`, `analyze-document`, `analyze-compliance`, `scan-document-date` · `supabase/config.toml` (todas `verify_jwt = false`)

Estas funções têm `verify_jwt = false` e **nenhuma verificação interna de JWT ou de organização**. Exemplo verificado em `contract-chat`:

```ts
const { contract_id, messages, contract_context } = await req.json();   // input não autenticado
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;          // ignora RLS
const supabase = createClient(supabaseUrl, supabaseKey);
const { data: contrato } = await supabase.from("contratos")
  .select(`titulo_contrato, ... parte_a_nome_legal, valor_total_estimado,
           tratamento_dados_pessoais, clausulas_importantes ...`)
  .eq("id", contract_id).maybeSingle();                                  // qualquer contrato
```

**Impacto:** (1) **Exfiltração cross-tenant** de dados confidenciais de contratos (nomes legais, NIF, valores, cláusulas, obrigações) por iteração/adivinhação de UUIDs, a partir da internet anónima; (2) **denial-of-wallet** — abuso ilimitado da `ANTHROPIC_API_KEY` da CCA; (3) viola sigilo profissional de advogado. `multi-contract-analysis` agrava: recebe `organization_id` e devolve análise de **toda a carteira** dessa org.
**OWASP:** A01 / API2 (Broken Authentication) · **CWE-306** (Missing Authentication for Critical Function) · **CWE-639**.
**Remediação:** validar JWT (`supabase.auth.getUser(token)`) e aplicar `isAuthorizedForOrg()` (já existe) em todas; mudar para `verify_jwt = true` onde não há razão para serem públicas.

#### C-03 — [CRÍTICA] `demo-login` promove conta demo a platform admin global
**Ficheiro:** `supabase/functions/demo-login/index.ts:123-141` (verificado)

```ts
// 5) Ensure demo user is a platform admin (superadmin)
if (!existingPlatformAdmin) {
  await supabaseAdmin.from("platform_admins")
    .insert({ user_id: userId, notes: "Demo superadmin account" });
}
```

A função é `verify_jwt = false` e está travada apenas pelo flag `DEMO_LOGIN_ENABLED` (default off, linha 6-9) e pelas credenciais `DEMO_USER_*`. Se ativada em produção, qualquer pessoa obtém uma sessão de uma conta que é **platform admin de toda a plataforma** — controlo total sobre todas as organizações.
**OWASP:** A01 / A04 · **CWE-269** (Improper Privilege Management).
**Remediação:** uma conta demo nunca deve ser `platform_admin` (bastaria `admin` da org demo isolada). Garantir `DEMO_LOGIN_ENABLED` desligado em produção; idealmente não fazer deploy da função em produção.

#### H-01 — [ALTA] `isAuthorizedForOrg` concede acesso a qualquer org a todo o utilizador SSO CCA
**Ficheiro:** `supabase/functions/_shared/orgAuth.ts:33-39` (verificado)

```ts
const { data: prof } = await supabase.from("profiles").select("auth_method").eq("id", user.id).maybeSingle();
if (prof?.auth_method === "sso_cca") return true;   // qualquer org, sem verificar membership/papel
```

O SSO atribui `auth_method = "sso_cca"` a todos os utilizadores cujo domínio de email esteja em `CCA_SSO_ALLOWED_DOMAINS` (`cca.pt,cca-law.com,cca.law`), com papel default `editor` (`sso-cca/index.ts:875,939,1028`). Logo, **qualquer colaborador CCA, mesmo com o papel mais baixo**, fica autorizado a operar sobre **qualquer organização de cliente** nas ~8 funções que dependem deste helper (`sync-sharepoint`, `fetch-business-central`, `provision-client-sharepoint`, `executive-summary`, `analyze-contract-client`, `index-client-documents`, `portal-assistant`, `classify-document`).
**Impacto:** quebra do princípio do menor privilégio e da separação entre processos de clientes distintos (sigilo profissional). É uma fronteira de confiança interna (não exposta a externos), daí ALTA e não Crítica — mas significativa num contexto jurídico.
**OWASP:** A01 · **CWE-863** (Incorrect Authorization).
**Remediação:** substituir o bypass por verificação real de afetação do colaborador ao cliente/processo (allowlist explícita de "staff CCA com acesso a este cliente").

#### H-05 — [ALTA] Restauro de impersonação não-bloqueante e `impersonatedOrgId` forjável
**Ficheiro:** `src/contexts/ImpersonationContext.tsx:73-108`

```ts
const session: StoredSession = JSON.parse(stored);          // sem validação de schema (runtime)
verifySession(session.sessionId).then((isValid) => { ... }); // .then() — NÃO bloqueante
```

O estado é restaurado de `sessionStorage` em claro; a verificação server-side usa `.then()` (não `await`), criando uma janela de *race* em que componentes que leem `useEffectiveOrganization()` podem renderizar com um `impersonatedOrgId` ainda não validado. `verifySession` confirma que a sessão existe/está ativa, mas **não cruza** o `impersonatedOrgId` guardado com o registo na BD — um utilizador pode editar `sessionStorage` para apontar a outra organização mantendo um `sessionId` válido.
**Impacto:** potencial escalonamento horizontal de privilégios **se** o RLS server-side confiar no `impersonatedOrgId` enviado sem o cruzar com a sessão ativa. A segurança real depende inteiramente dessa reconfirmação server-side.
**OWASP:** A01 · **CWE-362** (Race Condition) / **CWE-602** (Client-Side Enforcement) / **CWE-639**.
**Remediação:** tornar `verifySession` bloqueante (`await`), validar `StoredSession` com Zod, e confirmar na BD que `impersonatedOrgId` corresponde à `sessionId` ativa do utilizador.

#### Positivo — MFA, login seguro e regra de tenancy CCA
- **MFA TOTP** disponível via `supabase.auth.mfa` (`src/components/settings/SecuritySettings.tsx:46-148`).
- **`secure-login`** previne enumeração de utilizadores (respostas normalizadas) e implementa lockout após 5 tentativas/15 min.
- **Utilizadores CCA internos** usam `ClienteContext.viewingOrganizationId` e **nunca** trocam `profiles.current_organization_id` (regra 10 do CLAUDE.md cumprida — `useOrganizations.ts:402-433`).
- **`admin-delete-user`, `admin-update-user-email`, `sync-demo-password`** validam corretamente `is_platform_admin` apesar de `verify_jwt=false`.

---

### B. Isolamento Multi-tenant e RLS

#### C-02 — [CRÍTICA] `contract_ai_extractions` / `contract_ai_jobs` com RLS aberto
**Ficheiro:** `supabase/migrations/20260218175603_65de21aa-0613-4095-a027-6342371eeeff.sql:73-83` (estado final — nenhuma migração posterior altera)

```sql
CREATE POLICY "clients_read_extractions" ON contract_ai_extractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_read_jobs"        ON contract_ai_jobs        FOR SELECT TO authenticated USING (true);
```

Qualquer utilizador autenticado de qualquer organização lê o `payload JSONB` das extrações de IA e o estado dos jobs de **todos os contratos da plataforma**. As tabelas-irmãs `contract_ai_diffs`/`contract_audit_log` (mesmo ficheiro) usam `raw_user_meta_data->>'role' = 'internal'` — padrão frágil (metadata de utilizador é menos fiável que `app_metadata`) e inconsistente com `is_cca_user`/`is_platform_admin`.
**Impacto:** fuga cross-tenant de dados jurídicos extraídos por IA. **OWASP:** A01 · **CWE-639/CWE-284**.
**Remediação:** scopar por organização do contrato (à semelhança do fix de `contract_extractions`). Confirmar se a feature "CCA Validate Contract" ainda está em uso; se descontinuada, eliminar as tabelas.

> **Nota:** A `contract_extractions` (sem `_ai_`), apontada no relatório anterior, **foi corrigida** em `20260619000004_portal_security_hardening.sql:12-68` (scoping por org do contrato). C-02 refere tabelas distintas, ainda vulneráveis.

#### H-02 — [ALTA] Bucket de storage `legal-mirror` gravável por qualquer um (incl. anónimos)
**Ficheiro:** `supabase/migrations/20251226120014_b32862f6-859e-42fc-b32b-bb8b1998afaa.sql:32-69`

```sql
CREATE POLICY "Service role can upload legal mirror files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'legal-mirror');   -- sem TO service_role nem auth.role()
```

O nome promete restrição a service_role, mas sem cláusula `TO` a política aplica-se a `public` (todos os roles, incluindo `anon`). Qualquer pessoa pode inserir, sobrepor e eliminar objetos. Bucket é público para leitura (espelho de legislação pública — confidencialidade baixa), mas o risco é de **integridade**: tampering/defacement do conteúdo legal servido aos utilizadores, e abuso de armazenamento.
**OWASP:** A01 · **CWE-732** (Incorrect Permission Assignment).
**Remediação:** adicionar `TO service_role` (ou `auth.role() = 'service_role'`) às políticas de escrita.

#### M-02 — [MÉDIA] Bucket `politicas` acessível cross-org
**Ficheiro:** `supabase/migrations/20260107152746_da39a3c3-89f0-4d84-8e9d-6d6b755d9ec9.sql:13-35`
INSERT/SELECT/DELETE testam apenas `bucket_id='politicas' AND auth.uid() IS NOT NULL`, sem scoping por organização. Documentos de políticas de uma org podem ser lidos/eliminados por autenticados de outra. **Remediação:** replicar o scoping por path/organização do bucket `contratos` (que está correto).

#### M-03 — [MÉDIA] RPCs financeiras não fixam o actor + grant a `anon`
**Ficheiro:** `supabase/migrations/20260313000004_fix_financial_data_access.sql:60-390`; grants em `20260313000003`
As funções `fn_get_*_for_actor(p_user_id uuid, ...)` são `SECURITY DEFINER` e fazem toda a autorização com base no `p_user_id` **recebido como parâmetro**, sem verificar `p_user_id = auth.uid()`. Com `GRANT EXECUTE ... TO authenticated` (e `anon`), um cliente pode invocar via PostgREST passando o UUID de outro utilizador (ex.: um colaborador CCA com mais visibilidade) e obter os dados financeiros visíveis a esse utilizador (IDOR). Mitigado por ser necessário conhecer o UUID-alvo.
**Remediação:** forçar `p_user_id := auth.uid()` dentro da função; remover `GRANT ... TO anon`.

#### Positivos — modelo RLS maduro (estado final verificado)
- **RLS ativo em todas as tabelas de dados de cliente** (contratos, documentos, anexos, eventos, financeiro/`bc_*`, pedidos, assuntos, organization_members, profiles, audit_logs).
- **Scoping consistente** via `organization_id = get_user_organization_id(auth.uid())` com extensão controlada para CCA (`is_cca_user`/`org_type='cca_owner'`) e `is_platform_admin`.
- **Endurecimento progressivo** documentado: `contract_extractions`, `anexos_contrato`, `eventos_ciclo_vida_contrato`, `profiles` (cross-org removido), `organizations_legacy`/`financeiro_nav_*` (tighten RLS), e a série `20260619000004/5/6`.
- **Views de defesa em profundidade:** `profiles_safe`/`contratos_safe` em `security_invoker=on` com mascaramento de NIF/morada por papel; `vw_cca_client_catalog_overview` convertida de `SECURITY DEFINER` para `security_invoker`; views financeiras retiradas do acesso direto via API.
- **`audit_logs` imutável** para utilizadores (sem políticas UPDATE/DELETE; INSERT exige `auth.uid()`).
- **Funções helper `SECURITY DEFINER` com `search_path` fixo** (sem recursão de RLS, sem hijacking) — `is_cca_user`, `is_platform_admin`, `get_user_organization_id`, etc. `cca_internal_users` substituiu emails hardcoded.
- **Storage `contratos` corretamente scopado** por papel + path da organização.

---

### C. Exposição de dados e segredos

#### H-04 — [ALTA] `admin-create-user` devolve password em texto-claro
**Ficheiro:** `supabase/functions/admin-create-user/index.ts:228-235`
A função verifica `is_platform_admin` corretamente, mas devolve a password gerada no corpo JSON (`credentials.password`), expondo-a a logs, histórico e proxies. **CWE-522/CWE-200.** **Remediação:** enviar credencial por canal seguro ou forçar reset no primeiro login.

#### H-07 — [ALTA] Business Central por HTTP em claro + service-role key on-premises
**Ficheiros:** `scripts/bc-sync-agent/sync.js:27-50`; `supabase/migrations/20260622120000_business_central_integration.sql:16,294` (`bc_url = http://10.110.250.30:2053`)
O agente on-premises usa a **`SUPABASE_SERVICE_ROLE_KEY`** (ignora todo o RLS) num `.env` numa máquina interna, e liga-se ao Business Central por **HTTP em claro** com Basic Auth (base64), sincronizando PII e dados financeiros (NIF, morada, telefone, email, saldos). Compromisso da máquina = acesso total à BD; tráfego BC interpercetável na rede interna.
**OWASP:** A02 (Cryptographic Failures) / A04 · **CWE-319** (Cleartext Transmission) / **CWE-798**.
**Remediação:** TLS no endpoint BC; substituir service-role por uma chave de menor privilégio/role dedicada; cofre de segredos na máquina.

#### M-04 / M-06 — Segredos e SSO
- **M-04:** `sso-cca/index.ts:573-578` devolve objeto `debug` com flags de quais segredos estão configurados (divulgação de configuração a anónimos); IDs hardcoded `CCA_TESTE_ORG_ID` (linha 958) e `DEMO_USER_ID` (linha 1051); a **assinatura do ID token não é verificada** (`decodeIdToken` só faz base64-decode) e o `nonce` só é validado quando presente.
- **M-06:** `client-notifications-cron`, `client-weekly-digest` e `sync-nav-excel` partilham o **mesmo** `NAV_SYNC_SECRET`; `data-retention-cron` (que **elimina/anonimiza utilizadores**) aceita `CRON_SECRET`. Todas comparam com `===` (não constante — timing). **CWE-208/CWE-798.**

#### L-02 — Fuga de mensagens de erro
~50 ocorrências de `toast.error(error.message)` no frontend (`Login.tsx:92`, `useFinanceiro.ts:226`, etc.) e `error.message`/`String(err)` cru em várias Edge Functions expõem detalhes de schema/DB/RLS. **CWE-209.**

---

### D. SSRF e integrações externas

#### H-03 — [ALTA] SSRF/IDOR em `fetch-azure-photo`
**Ficheiro:** `supabase/functions/fetch-azure-photo/index.ts:46-122`
A função autentica o JWT (bom), mas interpola `sso_external_id` (do corpo, sem validação) numa URL Graph privilegiada com token de aplicação (`User.Read.All`):

```ts
const photoUrl = `https://graph.microsoft.com/v1.0/users/${sso_external_id}/photo/$value`;
```

Qualquer autenticado pode passar o `oid` de outro utilizador (IDOR sobre fotos de todo o diretório Azure) ou injetar segmentos de path para pivotar o endpoint Graph. **OWASP:** A10 (SSRF) · **CWE-918/CWE-639.** **Remediação:** validar `sso_external_id` como UUID estrito e confirmar que pertence ao próprio utilizador.

#### M-07 / M-08
- **M-07:** `sync-sharepoint` faz dezenas de `fetch` a `graph.microsoft.com/.../{site_id}/{drive_id}` com `site_id`/`drive_id` persistidos do input, sem validar que pertencem ao tenant autorizado — acesso a sites/drives arbitrários a que a app Graph tenha permissões (combinado com H-01).
- **M-08:** `mirror-run/index.ts:281-287` desativa a validação de cadeia TLS (`caCerts: []`) para `pgdlisboa.pt` — abre porta a MITM no conteúdo legal ingerido e armazenado. **CWE-295.**

---

### E. Frontend e cliente

#### M-09 — [MÉDIA] XSS via `document.write` em `ExportPDFButton`
**Ficheiro:** `src/components/shared/ExportPDFButton.tsx:24-94`
Constrói HTML por concatenação (`filename`, `content.innerHTML`, `outerHTML` de stylesheets) e injeta via `document.write` numa nova janela. Se `filename` ou o conteúdo da secção exportada contiverem markup controlável (nome de organização, dados extraídos por IA), há XSS na janela de impressão (mesmo origin). **CWE-79.**

#### M-18 — [MÉDIA] Tokens em `localStorage`; sem PKCE
**Ficheiro:** `src/integrations/supabase/client.ts:11-16` — `access_token`/`refresh_token` em `localStorage` (exfiltráveis por qualquer XSS); sem `flowType: 'pkce'`. Mitigado pela CSP estrita. **CWE-522.**

#### M-10 / L-03
- **M-10:** `SSOCallback.tsx` guarda `sso_state` mas **nunca o compara** com o `state` devolvido — apenas o remove. A proteção CSRF está delegada ao backend (correto), mas o código cliente cria ilusão de proteção. **Remediação:** comparar ou remover o código morto.
- **L-03:** `legalbi_url`, `canonical_url`, `link_oficial` (da BD) fluem para `href`/`window.open`/`iframe src` sem validar esquema `http(s):` (risco `javascript:` se a BD for adulterada). Mitigado por `rel="noopener noreferrer"` consistente.

#### Positivos
- **CSP bloqueante e bem documentada** (`vercel.json` + `docs/security-csp.md`): `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `connect-src` restrito ao Supabase, mais `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
- **Open redirect SSO corrigido** com allowlist de hostname Microsoft + verificação `https:` (`Login.tsx:182-200`).
- **Sem segredos hardcoded**; service-role nunca exposta no bundle; output de IA renderizado via JSX (auto-escaping do React, sem `dangerouslySetInnerHTML` para conteúdo externo).

---

### F. Injeção

- **M-05 — Prompt injection** (LLM01): conteúdo de documentos/mensagens é interpolado nos prompts (`contract-chat:88-97`, `portal-assistant:156-192`, `translate-content`, `classify-document`). Um documento malicioso pode subverter regras de âmbito do assistente. **CWE-94.**
- **L-05** — `match-legislation` grava `created_by_id = null` quando o header de auth é omitido (viola regra 4; integridade/auditoria).
- Interpolação em filtros PostgREST `.or()` (`portal-assistant:137`) — `fetch-business-central` sanitiza (`[,.*()]` removidos, bom); o portal-assistant menos. **CWE-943.**

---

### G. Dependências e cadeia de fornecimento

`npm audit`: **12 vulnerabilidades (2 críticas, 4 altas, 6 moderadas)**. Classificação por exposição real:

| Pacote | Sev. | Via | Runtime/Dev | Risco real |
|--------|------|-----|-------------|------------|
| `@vitest/ui`, `vitest`, `esbuild` | crítica/mod | direto/dev | **Dev/build** | Baixo (só dev server) |
| `postcss` <8.5.10 | moderada | direto | **Build** | Baixo |
| `js-yaml` | moderada | eslint | **Dev** | Nulo em prod |
| `undici` | alta | jsdom (teste) | **Dev** | Nulo em prod |
| **`lodash`** <=4.17.23 | **alta** | **recharts** | **Runtime** | Baixo-médio (code injection via `_.template` improvável de ser acionável via recharts) |
| **`react-router-dom`** 6.30.3 | moderada | direto | **Runtime** | **Médio** — open redirect via `//` (GHSA-2j2x-hqr9-3h42); afeta toda a app |

**Conclusão:** a maioria das vulnerabilidades é de *tooling* de desenvolvimento (não chega a produção). As genuinamente *runtime* são `react-router-dom` (atualizar para ≥6.30.4) e `lodash` via `recharts`.

**CI/CD (`.github/workflows/`):**
- **L-08:** O pipeline `pr-validation.yml` corre lint com `|| true` (não bloqueia) e **não tem** `npm audit`, SAST, secret-scanning nem verificação de RLS. `deploy-edge-functions` faz deploy automático para produção em push para `main`.
- Segredos GitHub (`SUPABASE_ACCESS_TOKEN`, `NAV_SYNC_SECRET`, `SUPABASE_PROJECT_ID`) usados corretamente via `secrets.*` (não hardcoded). `.mcp.json` usa `--read-only` e token via variável de ambiente (bom).

---

## 5. Conformidade RGPD (Reg. (UE) 2016/679)

> Contexto: SaaS jurídico multi-tenant; trata dados pessoais de clientes e de **terceiros** (contrapartes em contratos), potencialmente incluindo categorias especiais (Art. 9) em conteúdos jurídicos. A CCA atua como **responsável pelo tratamento** (dados dos seus utilizadores/clientes) e como **subcontratante/responsável** consoante o serviço prestado ao cliente.

### 5.1 Direitos dos titulares (Art. 15-20)
- **[RISCO] Art. 15(4)** — `user-data-export` filtra por `created_by_id` **sem scoping por organização** (`user-data-export/index.ts:150-176`); um utilizador CCA recebe metadados de contratos de várias orgs de clientes num único ficheiro.
- **[CONFORME parcial] Art. 20** — exportação em JSON estruturado, registada em `dsar_requests`/`audit_logs`.
- **[LACUNA] Art. 16/18** — `dsar_requests` prevê `rectification`/`restriction` no schema, mas não há função nem UI que os operacionalize (só export/deletion existem).
- **[RISCO] Art. 17** — a "eliminação" (`data-retention-cron/index.ts:132-208`) é sobretudo **anonimização**: `audit_logs` retêm `original_user_id` (reversível), contratos/templates só põem `created_by_id = null`. **Não cobre Supabase Storage** (ficheiros carregados) nem backups. `auth.users` é apagado (bom). **[CONFORME]** verificação por password + período de graça de 7 dias (`user-data-deletion`).

### 5.2 Consentimento e ePrivacy (Art. 6/7; Dir. ePrivacy / Lei 41/2004)
- **[LACUNA — M-12]** **Não existe banner de consentimento de cookies.** A tabela `user_consents` prevê `cookies_*` mas o frontend (`useUserConsents.ts:29-35`) não os inclui e não há componente de banner. localStorage não essencial é usado sem consentimento prévio.
- **[LACUNA — L-07]** O registo de consentimento não preenche `ip_address`/`user_agent` e usa `policy_version` hardcoded `"1.0"` — prova de consentimento fraca (Art. 7(1)).
- **[Impreciso]** Rotular bases contratuais (terms/privacy) como "consentimento obrigatório" (`PrivacySettings.tsx:197`) é juridicamente incorreto — execução de contrato é Art. 6(1)(b), não consentimento.

### 5.3 Conservação (Art. 5(1)(e))
- **[LACUNA]** `data_retention_policies` só cobre logs (audit 365d, auth 180d, impersonation 90d, notifications 90d). **Não há retenção definida para `contratos`, `documentos_gerados`, `bc_customers`** nem PII de clientes — conservados indefinidamente.
- **[RISCO — M-11]** `execute_data_retention()` faz **sempre `DELETE`**, ignorando a coluna `deletion_type` ('hard'/'soft'/'anonymize') — `audit_logs` são fisicamente apagados aos 365d, podendo colidir com necessidade de conservação para defesa de direitos.

### 5.4 Responsabilização e registos (Art. 5(2), Art. 30)
- **[LACUNA — M-15]** **Acessos/leituras** (VIEW) de dados pessoais **não são auditados** — só mutações. Num contexto jurídico, *quem consultou* o NIF/contrato de um cliente é relevante.
- **[RISCO]** `useAuthActivityLogs.ts:24-31` faz `SELECT *` sem filtro de utilizador (confia 100% no RLS) — inconsistente com o export, que filtra explicitamente.
- **[CONFORME parcial]** `audit_logs` imutável para utilizadores (sem UPDATE/DELETE) e RLS de leitura restrita a admins da org.

### 5.5 Minimização e categorias especiais (Art. 5(1)(c), Art. 9)
- **[RISCO] Art. 32(1)(a)** — PII em **texto claro**: `parte_a/b_nif`, `parte_a/b_morada`, `contacto_comercial_telefone` (contratos), `nif`/`address`/`phone`/`email` + dados financeiros (`bc_customers`). **Sem cifragem ao nível da aplicação** (`pgsodium`/`vault` não usados em colunas) — confidencialidade depende da cifragem transparente do Supabase + RLS.
- **[Positivo]** Algumas views mascaram NIF/morada para não-membros.

### 5.6 Transferências internacionais (Cap. V, Art. 44+) — **H-06**
- **[RISCO ALTO]** `_shared/callAI.ts` envia todos os prompts para **`api.anthropic.com` (Anthropic, EUA)**; 16 funções enviam conteúdos de contratos com PII de terceiros (`contract-chat`, `analyze-contract-client`, `parse-contract`, etc.). **Não há divulgação ao titular (Art. 13(1)(f)), referência a SCC/decisão de adequação, nem regionalização** (API direta, não Bedrock/Vertex UE).
- **Microsoft Graph/SharePoint** e **Business Central** são subprocessadores adicionais.

### 5.7 Subcontratação (Art. 28)
- **[LACUNA]** O envio de conteúdos a IA constitui subcontratação. Não há lista de subprocessadores, nem **opt-out** por organização/contrato; a `ANTHROPIC_API_KEY` é global. Subprocessadores no código: **Anthropic, Microsoft, Supabase, Business Central (cliente)** — nenhum divulgado a titulares.

### 5.8 Segurança do tratamento e violações (Art. 32, 33/34)
- **[Positivo]** MFA TOTP; CSP; RLS; TLS in-transit (exceto BC).
- **[LACUNA — M-16]** **Sem mecanismo de deteção/notificação de violações** (sem fluxo CNPD 72h, sem alertas) — `breach`/`incident`/`cnpd` sem ocorrências no código.

---

## 6. NIS2, DORA, ePrivacy e sigilo profissional

A aplicabilidade direta de **NIS2** (Dir. (UE) 2022/2555) e **DORA** (Reg. (UE) 2022/2554) depende da classificação da entidade — um escritório de advogados não é, em regra, entidade essencial/importante NIS2 nem entidade financeira DORA, **mas** pode ser apanhado por requisitos contratuais de cadeia de fornecimento ao prestar serviços a entidades reguladas. Requisitos técnicos *observáveis*:

| Requisito | Referência | Estado |
|-----------|-----------|--------|
| Gestão de incidentes | NIS2 Art. 23 / DORA Art. 17-19 | **Ausente** (M-16) |
| Logging e monitorização | NIS2 Art. 21(2)(b) | **Parcial** — sem logging de acessos, retenção a apagar logs aos 365d |
| Gestão de acessos / MFA | NIS2 Art. 21(2)(i)/(j) | **Bom/Parcial** — MFA + RLS, enfraquecido por `verify_jwt=false` + funções de IA sem authz |
| Cifragem | NIS2 Art. 21(2)(h) | **Parcial** — TLS in-transit (exceto BC por HTTP); sem cifragem aplicacional de PII |
| Continuidade / backup | NIS2 Art. 21(2)(c) / DORA Art. 12 | **Não observável** (gerido pelo Supabase) |
| Risco de terceiros / ICT | DORA Art. 28-30 / NIS2 supply chain | **Ausente** — subprocessadores sem registo/opt-out |

**Sigilo profissional (EOA / Lei 145/2015):** os achados C-01, C-02, H-01 e H-06 têm implicações diretas no dever de sigilo — permitem, respetivamente, acesso anónimo a conteúdos de contratos, leitura cross-tenant de extrações, acesso de qualquer colaborador a qualquer cliente, e envio de dados a um terceiro nos EUA sem salvaguardas. Estes devem ser tratados como prioridade não só de segurança mas de dever deontológico.

---

## 7. Pontos positivos (postura de segurança)

1. Modelo **RLS multi-tenant maduro** e progressivamente endurecido, com funções helper `SECURITY DEFINER` de `search_path` fixo e views `security_invoker` com mascaramento.
2. **CSP bloqueante** + cabeçalhos de segurança, documentados em `docs/security-csp.md`.
3. **MFA TOTP** disponível.
4. **`secure-login`** com lockout e sem enumeração de utilizadores; consumo único de state SSO; open redirect corrigido por allowlist.
5. **`audit_logs` imutável** para utilizadores; triggers de auditoria com `created_by_id`/`updated_by_id`.
6. **Framework DSAR** (export/deletion) com confirmação por password e período de graça.
7. **Sem segredos hardcoded** no frontend; service-role nunca no bundle; `.env` fora do Git; `.mcp.json` read-only.
8. **Regra de tenancy CCA** respeitada (`viewingOrganizationId`, nunca troca `current_organization_id`).
9. **TypeScript + Zod**; output de IA renderizado via JSX (sem XSS por markdown).
10. **`parse-contract`** com proteção contra path traversal no storage.

---

## 8. Roadmap de remediação priorizado

### P0 — Imediato (dias)
1. **Adicionar autenticação + `isAuthorizedForOrg`** a todas as funções de IA (`contract-chat`, `multi-contract-analysis`, `generate-contract`, `redline-contract`, `validate-contract`, `translate-content`, `analyze-document`, `analyze-compliance`, `scan-document-date`); reavaliar `verify_jwt` (C-01).
2. **Corrigir RLS de `contract_ai_extractions`/`contract_ai_jobs`** (scoping por org ou eliminar se descontinuadas) (C-02).
3. **Confirmar `DEMO_LOGIN_ENABLED=false` em produção** e remover a promoção a `platform_admin` da `demo-login` (C-03).
4. **Definir `ALLOWED_ORIGIN`** explícito em produção (eliminar fallback `*`) (M-01).

### P1 — Esta semana/sprint
5. Corrigir `isAuthorizedForOrg` (membership/allowlist real em vez de `auth_method==='sso_cca'`) (H-01).
6. `TO service_role` nas políticas de escrita do bucket `legal-mirror` (H-02).
7. Validar `sso_external_id` (UUID + ownership) em `fetch-azure-photo` (H-03).
8. Remover password do corpo de `admin-create-user` (H-04).
9. Tornar `verifySession` bloqueante e validar `impersonatedOrgId`/schema (H-05).
10. **TLS no Business Central**; substituir service-role do agente on-premises por role dedicada (H-07).
11. **RGPD transferências:** avaliar SCC/regionalização da IA, divulgar subprocessadores, implementar **opt-out** por tenant (H-06).

### P2 — Próximo sprint
12. Scoping do bucket `politicas`; fixar `p_user_id=auth.uid()` e remover grant `anon` nas RPCs financeiras (M-02, M-03).
13. SSO: remover `debug`, validar assinatura do ID token, exigir nonce, externalizar IDs (M-04).
14. Segredos CRON distintos + comparação de tempo constante (M-06).
15. Corrigir `execute_data_retention()` (respeitar `deletion_type`); estender retenção a dados de clientes; cobrir Storage na eliminação RGPD (M-11, M-14).
16. **Banner de consentimento de cookies** + registo de consentimento com `ip`/`user_agent`/versão (M-12, L-07).
17. Scoping por org no `user-data-export`; **logging de acessos (VIEW)** a dados pessoais (M-13, M-15).
18. **Processo de deteção/notificação de violações** (CNPD 72h) (M-16).
19. Sanitizar `ExportPDFButton`; validar magic bytes em uploads; restringir TLS de `mirror-run` e `sync-sharepoint` (M-07, M-08, M-09, M-17).

### P3 — Melhoria contínua
20. Mapear erros para mensagens genéricas (L-02); validação de esquema de URLs da BD (L-03); `feature_flags` para `authenticated` (L-01).
21. Atualizar `react-router-dom` (≥6.30.4) e rever `lodash`/`recharts` (L-09); **adicionar `npm audit`/SAST/secret-scanning ao CI** e tornar o lint bloqueante (L-08).
22. Considerar cifragem aplicacional (pgsodium) de PII de alta sensibilidade; reponderar tokens em cookies httpOnly / `flowType: 'pkce'` (M-18).
23. Implementar Art. 16/18 (retificação/limitação); rate limiting consistente nos endpoints públicos/sensíveis (L-06).

---

## 9. Notas finais

- Esta é uma análise **estática**. Recomenda-se complementar com **DAST/pentest dinâmico** em ambiente *staging*, validação das **variáveis de ambiente de produção** (`ALLOWED_ORIGIN`, `DEMO_LOGIN_ENABLED`, segredos CRON) e execução dos **Supabase Advisors** (security/performance) com um token de acesso.
- Vários achados de severidade alta dependem de pré-condições (flags, conhecimento de UUIDs, fronteira interna) — assinaladas honestamente ao longo do relatório.
- **[Verificado — positivo]** A política RLS de `INSERT` em `platform_admins` (o frontend faz inserts diretos via `usePlatformAdmin.ts:197`) está **corretamente protegida**: `WITH CHECK (is_platform_admin(auth.uid()))` (`20251230155335:1-5`) — um utilizador normal **não** se pode auto-promover a superadmin (o RLS bloqueia). UPDATE/DELETE idem. A via indevida para `platform_admin` é a `demo-login` via service-role (C-03), não o cliente.

*Relatório gerado em revisão de código autorizada. Nenhuma alteração foi aplicada ao código.*
