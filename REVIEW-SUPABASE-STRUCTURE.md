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

### 3.1 ~~CRÍTICO — Edge Functions sem Autenticação~~ — **Por design**

As edge functions AI (parse-contract, contract-chat, redline-contract, executive-summary, analyze-compliance, generate-contract) têm `verify_jwt=false` **intencionalmente** para permitir que utilizadores externos acedam às funcionalidades. O acesso é controlado pela app frontend.

### 3.2 CRÍTICO — Índices em Falta (Performance) — ✅ CORRIGIDO

| Tabela | Coluna(s) | Impacto |
|--------|-----------|---------|
| `organization_members` | `(organization_id, user_id)` | **Usado em TODAS as policies RLS** — scan completo em cada request |
| `contratos` | `(organization_id, created_at DESC)` | Query principal de listagem |
| `eventos_legislativos` | `(organization_id)` | Listagem por org |
| `eventos_ciclo_vida_contrato` | `(contrato_id, created_at DESC)` | Timeline do contrato |

O índice em `organization_members` é **urgente** — é avaliado 20+ vezes por request via RLS policies.

### 3.3 ALTO — Cache Invalidation Incompleta — ✅ CORRIGIDO

- useEventosLegislativos: agora invalida com `organizationId`
- useFinanceiro: agora invalida todas as query keys financeiras relacionadas
- useImpactos: agora invalida com `organizationId`

### 3.4 ALTO — useContrato sem maybeSingle — ✅ CORRIGIDO

O hook `useContrato(id)` agora usa `.maybeSingle()` em vez de `.single()`.

### 3.5 ALTO — 40+ Toasts Hardcoded sem i18n — ✅ CORRIGIDO

Adicionada secção `toasts.*` em pt.json e en.json. Hooks migrados: useContratos, useProfile, useEventosLegislativos, useImpactos, useAnexos, useEventos, useContractTriage, useFinanceiro.

### 3.6 MÉDIO — Bundle Size (2MB+ sem gzip) — ✅ CORRIGIDO

Implementado `React.lazy()` + `Suspense` em App.tsx para todas as páginas não-críticas. Login, SSO, Onboarding e Home carregam eagerly.

### 3.7 MÉDIO — Política DELETE em eventos_legislativos — ✅ CORRIGIDO

Migration `20260319000002` exige role `owner` ou `admin` para DELETE.

### 3.8 MÉDIO — translate-content, legal-api, mirror-run sem Auth

Menor risco — por design, acessíveis a utilizadores externos. Considerar rate limiting futuro.

### 3.9 BAIXO — Console.log em Produção — ✅ CORRIGIDO

Removidos `console.log()` de useProfile.ts e useContratos.ts.

---

## 4. O Que Falta Implementar

### 4.1 Notificações por Email
- Framework de notificações existe (tabela `notifications`, `notification_templates`)
- `send-contract-alerts` edge function existe
- Falta: **integração SMTP/Resend**, triggers automáticos para expiração, alertas de compliance

### 4.2 Rate Limiting nas Edge Functions
- Nenhuma edge function tem rate limiting
- Funções AI (parse-contract, contract-chat) podem ser abusadas para gerar custos

### 4.3 Monitorização & Observabilidade
- Sem Sentry, LogRocket, ou similar
- Sem health checks nas edge functions
- Sem métricas de performance (Web Vitals)

### 4.4 Backup & Recovery
- Sem estratégia documentada de backup do Supabase
- Sem point-in-time recovery configurado
- Sem disaster recovery plan

### 4.5 Webhooks & Integrações
- Sem webhooks para eventos de contrato (notificar sistemas externos)
- Sem integração com calendário (prazos, renovações)
- Sem API pública documentada

---

## 5. Recomendações Restantes

### P0 — Pendente

1. **Configurar `ALLOWED_ORIGIN` nos Supabase secrets** (acção pendente desde 2026-03-15)
2. **Configurar Sentry** (ou similar) para error tracking em produção

### P1 — Próximo ciclo

3. **Rate limiting** nas edge functions AI (via Supabase ou middleware)
4. **Notificações email** — SMTP/Resend + triggers automáticos
5. **API pública** com documentação OpenAPI

### Já Corrigido nesta revisão

- ✅ Índices de performance (migration 20260319000001)
- ✅ Política DELETE em eventos_legislativos (migration 20260319000002)
- ✅ Cache invalidation em useEventosLegislativos, useFinanceiro, useImpactos
- ✅ useContrato com maybeSingle()
- ✅ Toasts migrados para i18n (pt.json + en.json)
- ✅ Code splitting com React.lazy() em App.tsx
- ✅ Console.log removidos de produção

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
