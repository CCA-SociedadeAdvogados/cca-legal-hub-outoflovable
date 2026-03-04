# CLAUDE.md — CCA Legal Hub

## Project Overview

CCA Legal Hub is a multi-tenant legal contract management SPA for a Portuguese law firm (CCA - Sociedade de Advogados). It provides contract lifecycle management, regulatory compliance tracking, AI-powered document analysis, and GDPR compliance features. The platform is primarily in **Portuguese** with English translation support.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 5 (with SWC plugin for React) |
| **Styling** | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| **Routing** | React Router v6 |
| **State/Data** | TanStack React Query v5 |
| **Backend** | Supabase (Auth, Database, Storage, Edge Functions) |
| **i18n** | react-i18next (PT/EN) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Theme** | next-themes (dark/light/system) |
| **Deployment** | Vercel (SPA rewrite) |
| **Package Manager** | npm (package-lock.json present; bun.lockb also exists) |

---

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

There are **no test commands** configured. No test framework is set up.

---

## Project Structure

```
src/
├── App.tsx                      # Root: routes, providers, query client
├── main.tsx                     # Entry point
├── index.css                    # Global styles + CSS variables (theme tokens)
├── components/
│   ├── ui/                      # shadcn/ui primitives (DO NOT edit manually)
│   ├── layout/                  # AppLayout, Header, Sidebar, PlatformAdminRoute
│   ├── admin/                   # Platform admin: users, departments, configs
│   ├── contracts/               # Contract cards, tables, AI parser, triage, compliance
│   ├── compliance/              # Event impact analyzer (AI)
│   ├── dashboard/               # Stats, charts, lists for overview page
│   ├── home/                    # Home page editor + widget system
│   │   └── widgets/             # 9 configurable home widgets
│   ├── settings/                # Privacy, security, SharePoint settings
│   ├── shared/                  # DocumentUploadWithAI, ImageUploader, ImageCropModal
│   ├── sharepoint/              # SharePoint document browser
│   └── organizations/           # Industry sector selector
├── contexts/
│   ├── AuthContext.tsx           # Supabase auth (user, session, signIn/Out/Up)
│   ├── ImpersonationContext.tsx  # Admin impersonation with audit trail
│   ├── SidebarContext.tsx        # Sidebar collapse state (localStorage)
│   └── IndustrySectorContext.tsx # Org industry sectors
├── hooks/
│   ├── useContratos.ts          # Contract CRUD + bulk ops
│   ├── useProfile.ts            # User profile + avatar upload
│   ├── useOrganizations.ts      # Org CRUD, switching, members
│   ├── useEventosLegislativos.ts # Legislative events CRUD
│   ├── useComplianceAI.ts       # AI compliance analysis (edge functions)
│   ├── useDashboardStats.ts     # Dashboard metrics computation
│   ├── useNotifications.ts      # Notifications with realtime subscriptions
│   ├── useAuditLogs.ts          # Audit log queries with filters
│   ├── usePlatformAdmin.ts      # Platform admin check + global stats
│   ├── useFeatureFlags.ts       # Feature flags management
│   ├── useContentBlocks.ts      # Org-specific content management
│   ├── useHomeConfig.ts         # Home layout draft/publish workflow
│   ├── useUserTheme.ts          # Theme preference (DB-persisted)
│   ├── useEffectiveOrganization.ts # Impersonation-aware org resolution
│   ├── use-mobile.tsx           # Responsive breakpoint (768px)
│   └── use-toast.ts             # Internal toast queue (reducer pattern)
├── lib/
│   ├── utils.ts                 # cn() helper, generateSlug()
│   ├── contractStateMachine.ts  # State transitions + lifecycle events
│   ├── exportUtils.ts           # CSV export with BOM for Excel
│   ├── TranslationService.ts    # 3-layer cache: LRU → IndexedDB → Edge Function
│   ├── LRUCache.ts              # In-memory LRU cache (500 items)
│   ├── IndexedDBCache.ts        # Persistent translation cache
│   ├── ccaAgent.ts              # External CCA validation agent bridge
│   ├── industrySectors.ts       # 24 Portuguese industry sectors
│   ├── defaultHomeLayout.ts     # Default widget layout
│   ├── sectorLayoutTemplates.ts # Sector-specific home layouts
│   ├── cropImage.ts             # Canvas-based image cropping
│   └── imageProcessor.ts        # Image processing utilities
├── pages/                       # Route-level page components
│   ├── auth/                    # Login, SSOCallback
│   └── *.tsx                    # ~25 page components
├── integrations/supabase/
│   ├── client.ts                # Supabase client init (typed)
│   └── types.ts                 # Auto-generated DB types (~36K tokens)
├── types/
│   ├── contracts.ts             # Contract enums, interfaces, display labels
│   └── index.ts                 # General app types (User, Event, Policy, etc.)
├── i18n/
│   ├── index.ts                 # i18next config (default: PT)
│   └── locales/
│       ├── pt.json              # Portuguese translations (~52KB)
│       └── en.json              # English translations (~50KB)
└── assets/                      # Static assets
```

---

## Architecture & Patterns

### Authentication & Authorization

Three protection layers wrap routes in `App.tsx`:

1. **ProtectedRoute** — Checks Supabase auth session; redirects to `/login` or `/onboarding`
2. **OnboardingRoute** — Ensures onboarding is complete; auto-completes for SSO users
3. **PlatformAdminRoute** — Checks `is_platform_admin()` RPC; redirects non-admins to `/`

**User roles** (org-level): `owner > admin > editor > viewer`
**Auth methods**: CCA SSO (Keycloak OAuth2), email/password, demo login (feature-flagged)

### Data Fetching

All data fetching uses **TanStack React Query** with Supabase client:

- **Query keys** follow pattern: `['entity', orgId?, additionalFilters?]`
- **Global config**: staleTime 5min, gcTime 10min, retry 1, no refetchOnWindowFocus
- **Hook-level overrides**: contracts use 30s staleTime with refetchOnWindowFocus
- **Mutations** invalidate related queries on success and show toast notifications
- **Organization scoping**: most queries filter by `organization_id` from profile or impersonation context

### State Management

- **Server state**: React Query (no Redux/Zustand)
- **Auth state**: AuthContext (Supabase session)
- **UI state**: SidebarContext (localStorage), ImpersonationContext (sessionStorage)
- **Theme**: next-themes + DB persistence via useUserTheme

### Contract State Machine

Defined in `src/lib/contractStateMachine.ts`:

```
rascunho → em_revisao → em_aprovacao → enviado_para_assinatura → activo → expirado/denunciado/rescindido
```

Lifecycle events (criacao, assinatura, renovacao, adenda, rescisao, denuncia, etc.) can trigger automatic state transitions.

### Impersonation System

Platform admins can impersonate organizations or individual users. The system:
- Creates audit trails in `impersonation_sessions` table
- Persists in sessionStorage
- Invalidates caches on start/stop
- Affects which organization's data is loaded via `useEffectiveOrganization()`

### Translation System

`src/lib/TranslationService.ts` implements a 3-layer caching architecture:
1. **LRU Memory Cache** (500 items, instant)
2. **IndexedDB** (persistent, survives reload, 7-day TTL)
3. **Supabase Edge Function** `translate-content` (fallback for cache misses)

This is separate from the i18n static translations (which use react-i18next JSON files).

---

## Supabase Backend

### Database

- **~58 tables** covering contracts, regulatory events, organizations, users, audit, SharePoint, etc.
- **15+ custom enums** (estado_contrato, tipo_contrato, departamento, etc.)
- **73 migrations** in `supabase/migrations/`
- **Key views**: `contratos_safe`, `profiles_safe` (restricted column access)
- **RPC functions**: `create_organization`, `is_platform_admin`, `get_user_org_role`, `log_audit_event`, etc.

### Edge Functions (21 total)

| Function | Auth | Purpose |
|----------|------|---------|
| `analyze-compliance` | JWT | AI compliance analysis |
| `analyze-document` | JWT | AI document analysis |
| `triage-contract` | Public | Contract risk triage |
| `validate-contract` | JWT | Contract validation via CCA agent |
| `parse-contract` | Public | Extract contract structured data |
| `legal-api` | Public | Legal document search |
| `match-legislation` | JWT | Contract-legislation linking |
| `sso-cca` | Public | CCA SSO OAuth2 flow |
| `secure-login` | Public | Secure login endpoint |
| `demo-login` | Public | Demo user authentication |
| `admin-create-user` | Public | Admin user creation |
| `admin-delete-user` | Public | Admin user deletion |
| `admin-update-user-email` | Public | Admin email update |
| `translate-content` | Public | Dynamic content translation |
| `send-contract-alerts` | JWT | Email notifications |
| `sync-sharepoint` | Public | SharePoint sync |
| `sync-nav-excel` | Public | Financial nav from Excel |
| `user-data-export` | Public | GDPR data export |
| `user-data-deletion` | Public | GDPR data deletion |
| `data-retention-cron` | Public | Data retention cleanup |
| `mirror-run` | Public | Legal document mirroring |

### Environment Variables

```env
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
```

Only frontend-safe variables are exposed. Backend secrets are managed in Supabase dashboard.

---

## Routing Map

### Public Routes
- `/login` — Multi-method auth (SSO, email/password, demo)
- `/auth/sso-callback` — OAuth2 callback handler

### Protected Routes (require auth + completed onboarding)
- `/` and `/home` — Configurable widget dashboard
- `/contratos` — Contract list with search/filter/export
- `/contratos/novo` — Create contract (multi-tab form + AI)
- `/contratos/:id` — Contract detail (tabs: general, parties, financial, compliance, history)
- `/contratos/:id/editar` — Edit contract
- `/contratos/visao-geral` — Contract analytics dashboard
- `/contratos/upload-massa` — Bulk contract upload
- `/contratos/triagem` — Contract triage/screening
- `/eventos` — Legislative events management
- `/normativos` — Regulatory requirements list
- `/normativos/:id` — Regulation detail
- `/impactos` — Impact analysis
- `/politicas` — Company policies
- `/assinatura-digital` — Digital signature hub
- `/documentos` — Global document repository
- `/perfil` — User profile
- `/organizacao` — Organization management
- `/minha-organizacao` — Organization overview
- `/meu-departamento` — Department view
- `/utilizadores-org` — Organization users
- `/definicoes` — Settings (general, privacy, security, signatures, AI, notifications)
- `/notificacoes` — Notification preferences
- `/legalbi` — Legal BI dashboard
- `/financeiro` — Financial management
- `/novidades-cca` — CCA news/updates

### Admin-Only Routes (require platform_admin)
- `/admin` — Platform admin panel (users, orgs, audit, stats)

### Redirects (deprecated routes)
- `/requisitos`, `/templates`, `/auditoria` → `/contratos/visao-geral`
- `/contratos/documentos` → `/assinatura-digital`
- `/utilizadores` → `/admin?tab=users`

---

## Coding Conventions

### General
- **Language**: TypeScript strict-ish (noImplicitAny: false, strictNullChecks: false)
- **Path aliases**: `@/*` maps to `./src/*`
- **Components**: Functional components with hooks, no class components
- **Exports**: Named exports preferred; `export default` for pages
- **Unused vars**: Prefix with `_` to suppress ESLint warnings

### Styling
- **Tailwind CSS** with CSS variables for theming (HSL-based color tokens)
- **cn()** utility from `src/lib/utils.ts` for conditional class merging
- **shadcn/ui** components in `src/components/ui/` — auto-generated, do not manually edit
- **Dark mode**: `class` strategy via `next-themes`
- **Fonts**: Inter (sans), Playfair Display (serif for headings/numbers)
- **Custom tokens**: `risk-high/medium/low`, `status-pending/active/completed/expired`

### Data Layer
- **All DB queries** go through the typed Supabase client (`@/integrations/supabase/client`)
- **Never call Supabase directly in components** — use hooks from `src/hooks/`
- **Mutations** must invalidate related query keys and show toast feedback
- **Organization scoping**: always filter by `organization_id` unless it's a platform-admin global query

### i18n
- **All user-facing strings** should use `t()` from `useTranslation()`
- **Translation keys** are hierarchical: `section.subsection.key`
- **Add translations** to both `pt.json` and `en.json` simultaneously
- **Portuguese is primary** — always write PT first, then EN

### Forms
- Use **React Hook Form** with **Zod** schemas for validation
- Form components use shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`

---

## Key Business Domain Concepts

| PT Term | EN Meaning | Context |
|---------|-----------|---------|
| Contrato | Contract | Core entity |
| Evento Legislativo | Legislative Event | Regulatory change tracking |
| Normativo | Regulation/Standard | Legal requirement |
| Impacto | Impact | Effect of regulation on contracts |
| Triagem | Triage/Screening | AI-based contract risk assessment |
| Parte A/B | Party A/B | Contract counterparties |
| NIF | Tax ID (Portugal) | Portuguese fiscal number |
| RGPD | GDPR | Data protection regulation |
| DPA | Data Processing Agreement | GDPR requirement |
| Rascunho | Draft | Contract initial state |
| Adenda | Addendum | Contract amendment |
| Rescisão | Termination | Contract ended by party |
| Denúncia | Notice of non-renewal | Contract not renewed |
| Vigência | Validity period | Contract active period |

---

## Important Notes for Development

1. **No tests exist** — there's no test framework configured. Consider adding Vitest if tests are needed.
2. **TypeScript is lenient** — `strictNullChecks: false` and `noImplicitAny: false`. Be careful with null/undefined.
3. **DB types are auto-generated** — `src/integrations/supabase/types.ts` should be regenerated with `supabase gen types` after schema changes, not manually edited.
4. **Feature flags** control SSO, 2FA, demo login, and document translation via the `feature_flags` table.
5. **The `components/ui/` directory** contains shadcn/ui components — add new ones via `npx shadcn-ui@latest add <component>`, do not edit manually.
6. **Contract state transitions** are validated by `contractStateMachine.ts` — always use `canTransitionTo()` before changing contract state.
7. **Impersonation** affects data scoping globally — `useEffectiveOrganization()` resolves the active org considering impersonation state.
8. **Self-healing patterns** exist in `useProfile` and `useOrganizations` — they create missing records automatically.
9. **Edge functions** are in `supabase/functions/` — some require JWT auth, others are public (see config.toml).
10. **CSV export** includes BOM for UTF-8 Excel compatibility — maintain this in `exportUtils.ts`.
