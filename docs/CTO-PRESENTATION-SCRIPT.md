# Guião de Apresentação — CCA Legal Hub

## Para: Novo CTO | Duração estimada: 45–60 min

---

## PARTE 1 — VISÃO GERAL (5 min)

### O que é

O CCA Legal Hub é uma **plataforma SPA multi-tenant de gestão de contratos e compliance regulatório**, desenvolvida para a CCA - Sociedade de Advogados. Combina gestão documental, análise por IA e conformidade legal numa única aplicação web.

### Problema que resolve

- Escritórios de advogados gerem centenas de contratos em Excel/pastas partilhadas
- Alterações legislativas passam despercebidas até ser tarde
- Revisão manual de cláusulas é lenta e propensa a erros
- Clientes externos não têm visibilidade sobre o estado dos seus contratos

### Proposta de valor

| Para | Valor |
|------|-------|
| Advogados CCA | Análise automática de contratos, alertas de expiração, compliance com IA |
| Clientes externos | Portal self-service com visibilidade sobre contratos e financeiro |
| Gestão CCA | Dashboard de KPIs, analytics de portfolio, BI legal |

---

## PARTE 2 — ARQUITECTURA TÉCNICA (10 min)

### Stack tecnológico

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  React 18 + TypeScript 5.8 + Vite 5 (SWC)          │
│  Tailwind CSS 3 + shadcn/ui (Radix)                 │
│  React Router v6 + TanStack React Query v5          │
│  React Hook Form + Zod | react-i18next (PT/EN)      │
│  Deploy: Vercel (SPA rewrite)                       │
├─────────────────────────────────────────────────────┤
│                    BACKEND                          │
│  Supabase (PostgreSQL + Auth + Storage + Realtime)  │
│  31 Edge Functions (Deno runtime)                   │
│  Row-Level Security (RLS) para multi-tenancy        │
├─────────────────────────────────────────────────────┤
│                  INTEGRAÇÕES                        │
│  Anthropic Claude (Sonnet 4.6 + Haiku 4.5)          │
│  Microsoft SharePoint (Graph API)                   │
│  Azure AD (SSO + fotos de perfil)                   │
│  Fontes legais externas (DRE, EUR-Lex, BDP, etc.)  │
└─────────────────────────────────────────────────────┘
```

### Decisões de arquitectura relevantes

1. **Supabase como BaaS** — PostgreSQL gerido, auth integrado, RLS nativo, Edge Functions sem servidor dedicado. Reduz drasticamente custos de infraestrutura.

2. **Edge Functions (Deno)** — 31 funções serverless para lógica de negócio, chamadas AI e integrações. As chaves API (Anthropic, SharePoint) nunca chegam ao browser.

3. **React Query para state management** — Sem Redux/Zustand. Toda a gestão de estado servidor é feita via React Query com invalidação automática de cache após mutations.

4. **Multi-tenancy via RLS** — Cada query é automaticamente filtrada por `organization_id` a nível de base de dados. Utilizadores só vêem dados da sua organização.

5. **Vendor code splitting** — Chunks separados para React, Radix, Supabase, Recharts, i18n e forms. Melhora cache de browser e reduz tempo de carregamento.

### Estrutura do projecto

```
src/
├── components/        # UI (~100 componentes organizados por domínio)
│   ├── ui/            # shadcn/ui (gerados, não editar)
│   ├── contracts/     # AI parser, chat, redline, triagem
│   ├── compliance/    # Analisador de impacto legislativo
│   ├── layout/        # AppLayout, Sidebar, Header
│   └── home/widgets/  # 9 widgets configuráveis para dashboard
├── hooks/             # 61 hooks customizados (CRUD, AI, integrações)
├── contexts/          # 5 contexts (Auth, Cliente, Impersonation, etc.)
├── pages/             # ~25 páginas/rotas
├── lib/               # Utilidades (state machine, export, cache)
├── i18n/locales/      # Traduções PT + EN
└── integrations/      # Cliente Supabase + tipos auto-gerados
supabase/
├── functions/         # 31 Edge Functions
└── migrations/        # 103 migrations SQL
```

---

## PARTE 3 — FUNCIONALIDADES POR MÓDULO (15 min)

### 3.1 Gestão de Contratos (core)

- **CRUD completo** — criar, editar, listar, arquivar/restaurar contratos
- **Upload em massa** — até 10 ficheiros simultâneos com extracção AI
- **State machine** — 8 estados (`rascunho` → `activo` → `expirado`/`rescindido`) com transições validadas por máquina de estados
- **Tipos suportados** — NDA, prestação de serviços, SaaS, trabalho, arrendamento, licenciamento, parceria, consultoria, outros
- **Exportação CSV** — com BOM para compatibilidade Excel

### 3.2 IA e Análise Documental

| Funcionalidade | Modelo AI | Descrição |
|----------------|-----------|-----------|
| **Parse de contratos** | Sonnet 4.6 | Extrai 40+ campos de PDF/Word/texto com score de confiança |
| **Compliance check** | Sonnet 4.6 | Cruza contratos com eventos legislativos, identifica gaps |
| **Redline** | Sonnet 4.6 | Análise cláusula a cláusula: favorável/standard/atenção/risco |
| **Triagem** | Sonnet 4.6 | Score global de risco + análise por cláusula |
| **Chat contextual** | Haiku → Sonnet* | Q&A sobre contratos com routing inteligente |
| **Sumário executivo** | Haiku 4.5 | Resumo em linguagem simples para não-juristas |
| **Análise de portfolio** | Sonnet 4.6 | Perguntas transversais (contexto 1M tokens) |
| **Geração de contratos** | Sonnet 4.6 | Templates para 8+ tipos de contrato |

*O chat detecta complexidade jurídica (cláusulas, RGPD, rescisão) e escala para Sonnet automaticamente.

#### Pipeline de extracção

```
Upload documento → Edge Function (parse-contract)
    → Extracção com Sonnet 4.6 (40+ campos)
    → Validação 2ª passagem (CCA Agent)
    → Armazenamento em contract_extractions
    → UI mostra resultado + score de confiança
```

### 3.3 Compliance e Legislação

- **Eventos legislativos** — registo e monitorização de alterações regulatórias
- **Análise de impacto** — IA identifica contratos afectados por cada evento
- **Normativos** — base de dados de legislação com fontes externas (DRE, EUR-Lex, BDP, ASF, CMVM)
- **Legal Mirror** — web crawling automático de sites legislativos
- **Políticas internas** — gestão com workflow (rascunho → revisão → aprovado → arquivado)

### 3.4 Dashboard e Analytics

- **Home configurável** — 9 widgets drag-and-drop (admin pode personalizar layout)
- **Dashboard executivo** — KPIs, contratos por estado/tipo/departamento, alertas de expiração (30/60/90 dias)
- **Legal BI** — analytics de portfolio, estatísticas RGPD, durações, renovações
- **Gráficos interactivos** — Recharts com dados em tempo real

### 3.5 Multi-tenancy e Gestão Organizacional

- **Cada cliente = uma organização** isolada por RLS
- **CCA como super-organização** — staff CCA navega transversalmente entre clientes
- **Regime dual** — identidade (org CCA) vs. visualização (org do cliente)
- **Roles** — `owner`, `admin`, `editor`, `viewer` por organização
- **Impersonation** — admins podem simular sessão de qualquer utilizador (com audit trail)
- **Grupos económicos** — owners vêem todas as orgs do grupo

### 3.6 Integrações Externas

- **SharePoint** — sincronização bidireccional de documentos, provisionamento automático de sites por cliente
- **Azure AD** — SSO para staff CCA, sincronização de fotos de perfil
- **Assinatura digital** — tracking de estado (pendente → enviado → assinado → recusado → expirado)
- **NAV/Excel** — importação de dados financeiros

### 3.7 GDPR e Compliance de Dados

- **Exportação de dados** — CSV/JSON por pedido do utilizador
- **Direito ao esquecimento** — eliminação em cascata de dados pessoais
- **Retenção automática** — cron job para purga de dados expirados
- **Audit trail** — logging de impersonation e operações sensíveis

### 3.8 Módulo Financeiro

- **Acesso controlado por RPCs** — nunca acesso directo às tabelas
- **Visão por actor** — dados filtrados por papel (CCA vs. cliente)
- **Resumo financeiro, items, resumo por entidade** — via funções SQL dedicadas

### 3.9 Internacionalização

- **Português (primário) + Inglês**
- **react-i18next** — todas as strings via `t()`
- **Chaves hierárquicas** — `common.*`, `nav.*`, `contracts.*`, `dashboard.*`, `financial.*`

---

## PARTE 4 — SEGURANÇA E INFRA (5 min)

### Medidas implementadas

| Medida | Estado |
|--------|--------|
| TypeScript + Zod (validação compile + runtime) | ✅ Activo |
| Row-Level Security (org-scoped) | ✅ Activo |
| API keys isoladas em Edge Functions | ✅ Activo |
| Signed URLs com expiração 1h | ✅ Activo |
| Account lockout (5 tentativas, 15 min) | ✅ Activo |
| Validação de redirect SSO (allowlist Microsoft) | ✅ Activo |
| CORS via env var (não hardcoded `*`) | ✅ Corrigido 2026-03 |
| Emails CCA internos em tabela DB (não hardcoded) | ✅ Corrigido 2026-03 |
| `.env` removido do git tracking | ✅ Corrigido 2026-03 |
| Audit trail de impersonation | ✅ Activo |
| Senhas fortes obrigatórias | ✅ Activo |

### Áreas de melhoria identificadas

| Item | Prioridade | Descrição |
|------|-----------|-----------|
| Content Security Policy | Média | Adicionar CSP headers no Vercel |
| Rate limiting em endpoints auth | Média | Limitar tentativas login/SSO |
| Validação magic bytes em uploads | Alta | Além de MIME + tamanho |
| 2FA para operações sensíveis | Alta | Feature flag já preparada |
| RLS mais granular em `contract_extractions` | Alta | Políticas org-scoped |

### Pipeline de qualidade

```
Pre-commit (Husky + lint-staged)
    → ESLint (TypeScript + React + a11y + TanStack Query)
    → Prettier (formatação)
Build validation: npm run build + npm run lint
Testes: Vitest (jsdom) — em expansão
Deploy: Vercel (automático via git push)
```

---

## PARTE 5 — BASE DE DADOS (5 min)

### Modelo simplificado

```
organizations ──< contratos
    │                  │
    │                  ├──< contract_extractions (AI)
    │                  ├──< contract_compliance_analyses
    │                  ├──< contract_triage_analyses
    │                  └──< contract_attachments
    │
    ├──< organization_members ──> profiles
    ├──< organization_settings
    ├──< eventos_legislativos
    ├──< politicas
    └──< financeiro_nav_items
```

- **103 migrations** — evolução desde Dezembro 2025
- **Enums nativos PostgreSQL** — `estado_contrato`, `tipo_contrato`, `app_role`, `nivel_risco`
- **JSONB para dados flexíveis** — extraction_data, análises de cláusulas
- **Views materializadas** — `vw_cca_client_catalog_overview` para pesquisa

---

## PARTE 6 — PERGUNTAS ANTECIPADAS DO CTO (FAQ)

### Arquitectura e Stack

**P: Porquê Supabase e não um backend custom (Node/Python)?**
> R: Supabase oferece PostgreSQL gerido, auth integrado, RLS nativo, storage e Edge Functions num único serviço. Reduz a necessidade de um backend dedicado para 80% dos casos. As Edge Functions (Deno) cobrem a lógica que precisa de server-side (chamadas AI, integrações). O trade-off é menor controlo sobre a infraestrutura, mas o ganho em velocidade de desenvolvimento e custos operacionais compensa para o estágio actual.

**P: Porquê React Query em vez de Redux/Zustand?**
> R: O estado da aplicação é maioritariamente servidor-side (contratos, perfis, organizações). React Query gere cache, invalidação, polling e deduplição de requests automaticamente. Não temos estado client-side complexo que justifique um store global. Os 5 contextos React cobrem auth, sidebar e multi-tenancy.

**P: Como é feito o deploy?**
> R: Frontend no Vercel com SPA rewrite (push para main = deploy automático). Edge Functions via Supabase CLI (`supabase functions deploy`). Migrations via `supabase db push`. Não há CI/CD pipeline formal — é uma área de melhoria.

**P: Qual o custo estimado de infraestrutura?**
> R: Supabase (Pro plan) + Vercel (Pro) + Anthropic API (usage-based). O maior custo variável é a API Anthropic — cada parse de contrato usa Sonnet 4.6 (~$0.003-0.015/call). O chat usa Haiku para queries simples (~$0.0035/call). Não temos monitoring detalhado de custos AI — seria bom implementar.

**P: Existe um ambiente de staging?**
> R: Actualmente não há staging formal. O build é validado localmente (`npm run build`). Seria recomendável configurar preview deployments no Vercel por branch e um projecto Supabase separado para staging.

### IA e Processamento

**P: Que modelos AI são usados e porquê?**
> R: Claude Sonnet 4.6 para análise complexa (parsing, compliance, redline) — contexto de 1M tokens permite analisar contratos longos inteiros. Claude Haiku 4.5 para tarefas simples (sumários, chat básico) — 10x mais barato. O chat tem routing inteligente: detecta palavras-chave jurídicas e escala automaticamente de Haiku para Sonnet.

**P: Os dados dos contratos são enviados para APIs externas?**
> R: Sim, o texto dos contratos é enviado para a API Anthropic (Claude) via Edge Functions do Supabase. As chamadas são server-to-server — o browser nunca contacta a Anthropic directamente. É importante que os clientes estejam cientes disto nos termos de serviço. A Anthropic não retém dados de API para treino (policy activa).

**P: Qual a precisão da extracção AI?**
> R: A extracção inclui um score de confiança por campo. Para contratos bem estruturados (PDF nativo), a precisão é elevada (~90%+). Para PDFs digitalizados, depende da qualidade do OCR. Existe uma validação de 2ª passagem (CCA Agent) que enriquece e corrige a extracção inicial.

**P: E se a API da Anthropic ficar indisponível?**
> R: Actualmente não há fallback — as funcionalidades AI ficam indisponíveis. A plataforma continua funcional para CRUD, listagem e gestão manual. Seria prudente implementar um fallback (e.g., OpenAI) ou pelo menos caching agressivo de resultados AI já processados.

### Segurança

**P: Como é feita a autenticação?**
> R: SSO via Azure AD para staff CCA (fluxo OIDC). Email/password para clientes externos com account lockout (5 tentativas). Existe demo login controlado por feature flag. Sessões geridas pelo Supabase Auth com refresh automático de tokens.

**P: Como funciona o multi-tenancy?**
> R: Row-Level Security (RLS) a nível de PostgreSQL. Cada tabela tem políticas que filtram por `organization_id`. Mesmo que houvesse um bug no frontend, a base de dados recusa queries fora do scope. Staff CCA tem acesso transversal via RPCs dedicadas que verificam autorização.

**P: Houve alguma auditoria de segurança?**
> R: Sim, foi feita uma análise em Março 2026 que identificou e corrigiu: CORS wildcard em 23 edge functions, emails hardcoded em SQL, `.env` no git tracking, falta de org scoping em eventos legislativos, e open redirect no SSO. Existem ainda itens pendentes documentados (CSP headers, rate limiting, validação de uploads).

**P: O sistema está conforme com o RGPD?**
> R: Tem funcionalidades de suporte: exportação de dados pessoais (CSV/JSON), direito ao esquecimento (eliminação em cascata), cron de retenção automática, e audit trail. Falta uma avaliação formal de DPIA e a documentação de sub-processadores (Supabase, Anthropic, Vercel).

### Escalabilidade e Manutenção

**P: Quantos utilizadores suporta?**
> R: Não há bottleneck óbvio para centenas de utilizadores. O Supabase Pro suporta conexões pooled, o Vercel serve assets via CDN, e o React Query evita requests duplicados. O ponto de pressão seria as chamadas AI (rate limits da Anthropic) e o custo proporcional.

**P: Como é que as migrações de BD são geridas?**
> R: Via sistema de migrations do Supabase (103 ficheiros SQL sequenciais). Aplicadas com `supabase db push`. Não há rollback automático — cada migration deve ser reversível manualmente se necessário. É uma área que beneficiaria de tooling adicional.

**P: Existe documentação técnica?**
> R: O `CLAUDE.md` na raiz serve como guia técnico abrangente (padrões, regras, arquitectura). Não existe documentação formal de API ou Storybook para componentes. A documentação vive no código (TypeScript tipado + nomes descritivos).

**P: Qual o estado dos testes?**
> R: Vitest está configurado mas a cobertura é limitada. Existem testes para a state machine de contratos e algumas utilidades. Não há testes E2E. A validação principal é `npm run build` + `npm run lint`. Expandir a cobertura de testes é uma prioridade recomendada.

**P: Quantas linhas de código tem o projecto?**
> R: O frontend tem ~25 páginas, ~100 componentes, 61 hooks customizados. O backend tem 31 Edge Functions e 103 migrations. É um projecto de dimensão média-grande para uma SPA.

### Roadmap e Débito Técnico

**P: Qual é o débito técnico principal?**
> R: (1) Cobertura de testes insuficiente. (2) Sem CI/CD pipeline formal. (3) Sem ambiente de staging. (4) Dois sistemas de toast coexistentes. (5) Algumas vulnerabilidades de segurança pendentes (CSP, rate limiting, RLS granular). (6) Sem monitoring/observability (APM, error tracking).

**P: Quais as próximas funcionalidades previstas?**
> R: Feature flags já preparadas para: SSO expandido, 2FA, demo login. Áreas de expansão natural: workflows de aprovação mais complexos, integração com mais fontes legislativas, reporting avançado, mobile app.

**P: A equipa consegue manter isto?**
> R: O código segue padrões consistentes (enforced por ESLint + Prettier + Husky). O CLAUDE.md documenta todas as convenções. Os hooks encapsulam lógica de negócio. O maior risco é conhecimento concentrado — documentação de onboarding e testes ajudariam.

---

## PARTE 7 — DEMO SUGERIDA (10 min)

### Roteiro de demo

1. **Login** — mostrar SSO e login normal
2. **Home** — dashboard com widgets configuráveis
3. **Criar contrato** — upload de PDF, ver extracção AI em acção
4. **Detalhe do contrato** — tabs (info, timeline, compliance, chat, redline)
5. **Chat com contrato** — fazer uma pergunta e mostrar resposta AI
6. **Eventos legislativos** — criar evento e analisar impacto nos contratos
7. **Trocar de cliente** — mostrar o CCAOrgSwitcher e navegação multi-tenant
8. **Dashboard/BI** — KPIs e gráficos
9. **Admin** — gestão de utilizadores e organizações

---

## PARTE 8 — RESUMO EXECUTIVO (2 min)

### Pontos fortes

- **IA integrada de forma profunda** — não é um add-on, é core da plataforma
- **Multi-tenancy robusto** — RLS a nível de BD, não apenas UI
- **Stack moderno e manutenível** — TypeScript end-to-end, padrões enforced
- **Custo operacional baixo** — serverless (Supabase + Vercel), sem servidores a gerir
- **i18n nativo** — PT/EN com possibilidade de expansão

### Pontos de atenção

- **Testes** — cobertura a expandir significativamente
- **CI/CD** — pipeline formal por configurar
- **Staging** — ambiente de teste por criar
- **Observability** — sem APM, error tracking ou monitoring de custos AI
- **Segurança** — itens pendentes documentados (CSP, rate limiting, uploads)

### Números-chave

| Métrica | Valor |
|---------|-------|
| Páginas/rotas | ~25 |
| Componentes React | ~100 |
| Hooks customizados | 61 |
| Edge Functions | 31 |
| Migrations DB | 103 |
| Modelos AI | 2 (Sonnet 4.6 + Haiku 4.5) |
| Idiomas | 2 (PT + EN) |
| Roles de utilizador | 4 (owner, admin, editor, viewer) |

---

*Documento gerado em 2026-04-06 com base na análise do codebase.*
