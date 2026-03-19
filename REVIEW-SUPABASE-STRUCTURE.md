# Avaliação Geral — Código & Estrutura Supabase

**Data**: 2026-03-19
**Projecto**: CCA Legal Hub (scjxhhkutsiswsgsuiqo)

---

## 1. Resumo Executivo

O projecto é uma plataforma **madura e funcional** de gestão de contratos legais com:
- **97 migrations** Supabase aplicadas
- **29 edge functions** (AI, SSO, SharePoint, GDPR, financeiro)
- **45+ tabelas** com RLS activado em todas
- **34 páginas/rotas** no frontend
- **60+ hooks** React Query
- **20 enums** de domínio bem definidos

A arquitectura multi-tenant está sólida, com separação identitária (CCA interna) vs visualização (ClienteContext). O sistema financeiro usa RPCs actor-based correctamente.

**Build status**: ✅ Compila sem erros

---

## 2. O Que Está Implementado

### 2.1 Autenticação & Autorização ✅
- Login email/password + SSO Microsoft (OAuth2/OIDC)
- Validação de redirect SSO contra allowlist (login.microsoftonline.com)
- Roles: owner, admin, editor, viewer (enum `app_role`)
- Platform admin via `platform_admins` + RPC `is_platform_admin()`
- CCA internal authorization via `cca_internal_users` + `fn_is_cca_internal_authorized()`
- Impersonation com audit trail completo
- Feature flags para SSO, 2FA, demo login

### 2.2 Gestão de Contratos ✅
- CRUD completo com máquina de estados (8 estados, transições validadas)
- AI parsing via Claude Haiku 4.5 (200K context)
- Triagem automática com scoring de risco
- Compliance analysis, redline, executive summary
- Contract chat (assistente IA por contrato)
- Geração de contratos a partir de templates
- Análise multi-contrato
- Timeline de eventos do ciclo de vida
- Upload em massa
- Anexos com tipos (pdf_principal, anexo, adenda, outro)

### 2.3 Compliance & Regulatório ✅
- Eventos legislativos com scoping por organização
- Análise de impacto (pendente → em_tratamento → resolvido)
- Políticas e requisitos de compliance
- Match de legislação com contratos

### 2.4 Multi-tenancy ✅
- Organizações como tenant boundary
- Catálogo de clientes via NAV (organizations_legacy)
- Provisioning automático de orgs a partir do NAV
- CCA org switcher com pesquisa debounced
- Grupos económicos (group_code)
- Separação identitária vs visualização para users CCA

### 2.5 Módulo Financeiro ✅
- Sync de dados NAV via Excel/SharePoint (edge function)
- RPCs actor-based com autorização 3-tier (CCA/owner/membro)
- Cache layer (financeiro_nav_cache)
- Vista de resumo por entidade e por grupo económico

### 2.6 Integração SharePoint ✅
- Configuração por organização
- Sync de documentos com delta token
- Browser de documentos SharePoint
- Provisioning de folders para novos clientes
- Azure AD photos para avatares

### 2.7 GDPR & Privacidade ✅
- Data retention policies com execução programada
- DSAR requests (Data Subject Access Requests)
- Edge functions para export e deletion de dados
- Consentimento do utilizador com tracking de versão
- Audit logs com triggers automáticos em 7 tabelas

### 2.8 Interface & UX ✅
- 9 widgets configuráveis na home page (editor visual)
- i18n PT/EN com react-i18next
- Dark mode
- Dashboard com gráficos (Recharts)
- Sidebar com badges de notificação
- Responsive (mobile detection)

---

## 3. Problemas Identificados

### 3.1 CRÍTICO — Edge Functions sem Autenticação

**6 edge functions que processam dados sensíveis têm `verify_jwt=false` e NENHUMA validação de auth interna:**

| Função | Risco | Impacto |
|--------|-------|---------|
| `parse-contract` | CRÍTICO | Acesso a storage + parsing de qualquer contrato |
| `contract-chat` | CRÍTICO | Exposição de dados contratuais via AI chat |
| `redline-contract` | CRÍTICO | Análise + escrita na DB sem auth |
| `executive-summary` | CRÍTICO | Summary + cache de qualquer contrato |
| `analyze-compliance` | CRÍTICO | Análise cross-org sem validação |
| `generate-contract` | ALTO | Geração de documentos legais sem auth |

**Funções que JÁ têm auth correcto** (bom exemplo): `admin-create-user`, `admin-delete-user`, `data-retention-cron`, `sso-cca`

**Acção recomendada**: Adicionar validação de `Authorization` header + verificação de acesso ao `contract_id`/`organization_id` em todas as 6 funções.

### 3.2 CRÍTICO — Índices em Falta (Performance)

| Tabela | Coluna(s) | Impacto |
|--------|-----------|---------|
| `organization_members` | `(organization_id, user_id)` | **Usado em TODAS as policies RLS** — scan completo em cada request |
| `contratos` | `(organization_id, created_at DESC)` | Query principal de listagem |
| `eventos_legislativos` | `(organization_id)` | Listagem por org |
| `eventos_ciclo_vida_contrato` | `(contrato_id, created_at DESC)` | Timeline do contrato |

O índice em `organization_members` é **urgente** — é avaliado 20+ vezes por request via RLS policies.

### 3.3 ALTO — Cache Invalidation Incompleta

**useEventosLegislativos** — invalida `['eventos_legislativos']` sem `organizationId`, podendo mostrar dados stale entre clientes.

**useFinanceiro** — `updateOrganizationFinancial` não invalida `['financial-summary']`, `['financial-items']`, `['financial-by-entity']`.

### 3.4 ALTO — useContrato sem Filtro de Organização

O hook `useContrato(id)` faz `.eq('id', id).single()` sem validar `organization_id`. Embora o RLS proteja, é defence-in-depth insuficiente.

### 3.5 ALTO — 40+ Toasts Hardcoded sem i18n

Mensagens de toast em ~20 hooks estão hardcoded em PT. Viola a regra de que todas as strings user-facing devem usar `t()`.

### 3.6 MÉDIO — Bundle Size (2MB+ sem gzip)

O chunk principal (`index-*.js`) tem **2,057 KB**. Recomenda-se code splitting via `React.lazy()` e `manualChunks` no Vite.

### 3.7 MÉDIO — Política DELETE em eventos_legislativos

A policy de DELETE verifica apenas `organization_id = current_org` sem validar o role `admin`. Um `editor` pode potencialmente apagar eventos.

### 3.8 MÉDIO — translate-content, legal-api, mirror-run sem Auth

Menor risco que as funções de contratos, mas permitem uso não autorizado da API Claude (custos) e acesso a documentos legais.

### 3.9 BAIXO — Console.log em Produção

`useProfile.ts` e `useContratos.ts` têm `console.log()` que deviam ser removidos ou usar debug-level logging.

---

## 4. O Que Falta Implementar

### 4.1 Assinatura Digital Electrónica
- A página `AssinaturaDigital.tsx` existe mas o **backend de assinatura não está implementado**
- Faltam: integração com provedor (e.g., DocuSign, AMA CMD), workflow de assinatura, verificação de certificados
- O enum `metodo_assinatura` já suporta 4 métodos

### 4.2 Notificações por Email
- Framework de notificações existe (tabela `notifications`, `notification_templates`)
- `send-contract-alerts` edge function existe
- Falta: **integração SMTP/Resend**, triggers automáticos para expiração, alertas de compliance

### 4.3 Testes Automatizados
- **Zero testes** configurados (Vitest está no package.json mas sem test files)
- Nenhum test para hooks, componentes, ou state machine
- Nenhum e2e test

### 4.4 Code Splitting & Lazy Loading
- Todas as rotas carregam no bundle principal (2MB)
- Nenhum `React.lazy()` ou `Suspense` configurado
- Widget renderer carrega todos os widgets antecipadamente

### 4.5 Rate Limiting nas Edge Functions
- Nenhuma edge function tem rate limiting
- Funções AI (parse-contract, contract-chat) podem ser abusadas para gerar custos

### 4.6 Monitorização & Observabilidade
- Sem Sentry, LogRocket, ou similar
- Sem health checks nas edge functions
- Sem métricas de performance (Web Vitals)

### 4.7 Backup & Recovery
- Sem estratégia documentada de backup do Supabase
- Sem point-in-time recovery configurado
- Sem disaster recovery plan

### 4.8 Webhooks & Integrações
- Sem webhooks para eventos de contrato (notificar sistemas externos)
- Sem integração com calendário (prazos, renovações)
- Sem API pública documentada

### 4.9 Versionamento de Contratos
- Campo `versao_actual` existe mas sem histórico de versões
- Sem diff entre versões do mesmo contrato
- Sem merge de alterações concorrentes

### 4.10 Workflow de Aprovação Completo
- `estado_aprovacao` (pendente/aprovado/rejeitado) existe
- Falta: cadeia de aprovação multi-nível, delegação, escalation, deadlines

---

## 5. Recomendações Priorizadas

### P0 — Segurança (Implementar Imediatamente)

1. **Adicionar auth validation às 6 edge functions críticas**
   - Validar `Authorization` header
   - Verificar acesso ao `contract_id` / `organization_id`
   - Usar anon key com RLS em vez de service role key onde possível

2. **Criar índice composto em `organization_members(organization_id, user_id)`**
   - Impacto directo em performance de TODAS as queries (usado em RLS)

3. **Configurar `ALLOWED_ORIGIN` nos Supabase secrets** (acção pendente desde 2026-03-15)

### P1 — Estabilidade (Próximas 2 semanas)

4. **Adicionar índices em `contratos`, `eventos_legislativos`, `eventos_ciclo_vida_contrato`**
5. **Corrigir cache invalidation** em `useEventosLegislativos` e `useFinanceiro`
6. **Adicionar org filter ao `useContrato(id)`** — defence-in-depth
7. **Implementar code splitting** — `React.lazy()` nas rotas principais
8. **Configurar Sentry** (ou similar) para error tracking em produção

### P2 — Qualidade (Próximo mês)

9. **Migrar toasts para i18n** — criar chaves em pt.json e en.json
10. **Implementar testes** — começar pelo `contractStateMachine`, hooks críticos
11. **Rate limiting** nas edge functions AI (via Supabase ou middleware)
12. **Corrigir política DELETE** em `eventos_legislativos` — exigir role admin

### P3 — Funcionalidades (Roadmap)

13. **Assinatura digital** — integração com provedor
14. **Notificações email** — SMTP/Resend + triggers automáticos
15. **Versionamento de contratos** — histórico + diff
16. **Workflow de aprovação** multi-nível
17. **API pública** com documentação OpenAPI

---

## 6. Métricas do Projecto

| Métrica | Valor |
|---------|-------|
| Migrations Supabase | 97 |
| Edge Functions | 29 |
| Tabelas (com RLS) | 45+ |
| Views | 6 |
| RPCs/Functions | 26 |
| Enums | 20 |
| Triggers | 23 |
| Páginas Frontend | 34 |
| Hooks React | 60+ |
| Componentes | 100+ |
| Ficheiros i18n | 2 (PT, EN) |
| Bundle size (gzip) | 554 KB |
| Build time | ~10s |
| Dependências npm | ~50 |

---

*Documento gerado automaticamente como parte da revisão de código e estrutura Supabase.*
