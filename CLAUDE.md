# CLAUDE.md — CCA Legal Hub

## Project Overview

CCA Legal Hub — SPA multi-tenant de gestão de contratos para escritório de advogados português (CCA - Sociedade de Advogados). Contratos, compliance regulatório, análise documental com IA, GDPR. Plataforma primariamente em **Português** com suporte a Inglês.

**Supabase Project ID**: `scjxhhkutsiswsgsuiqo`
**Supabase URL**: `https://scjxhhkutsiswsgsuiqo.supabase.co`

> O repo contém "outoflovable" por razões históricas. **Não existem dependências Lovable no projecto.** Nunca adicionar referências a `lovable`, `gptengineer` ou `lovable_ai` em código novo.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 + SWC |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix) |
| Routing | React Router v6 |
| State/Data | TanStack React Query v5 |
| Backend | Supabase (Auth, DB, Storage, Edge Functions) |
| i18n | react-i18next (PT/EN, default PT) |
| Forms | React Hook Form + Zod |
| Deployment | Vercel (SPA rewrite) |

---

## Commands

```bash
npm run dev           # Dev server na porta 8080
npm run build         # Build de produção
npm run lint          # ESLint check
npm run format        # Prettier em todo o src/
npm run format:check  # Só verifica, não altera
npm run analyze       # Bundle visualizer (HTML report)
npm run gen:types     # Regenera src/integrations/supabase/types.ts (requer supabase login)
npm run env:pull      # Sincroniza .env.local com o Vercel
```

Não há framework de testes configurado. Validar com `npm run build` + `npm run lint`.

---

## Project Structure

```
src/
├── App.tsx                      # Rotas, providers, query client
├── components/
│   ├── ui/                      # shadcn/ui — NÃO editar manualmente
│   ├── layout/                  # AppLayout, Header, Sidebar, CCAOrgSwitcher
│   ├── contracts/               # Cards, tabelas, AI parser, triagem
│   ├── compliance/              # Analisador de impacto (AI)
│   ├── home/widgets/            # 9 widgets configuráveis
│   └── shared/                  # DocumentUploadWithAI, ImageUploader
├── contexts/
│   ├── AuthContext.tsx           # Supabase auth
│   ├── ClienteContext.tsx        # Cliente em visualização (regime CCA)
│   ├── ImpersonationContext.tsx  # Impersonation com audit trail
│   └── SidebarContext.tsx
├── hooks/
│   ├── useContratos.ts          # CRUD de contratos
│   ├── useOrganizations.ts      # Orgs, memberships, seleção CCA
│   ├── useFinanceiro.ts         # Módulo financeiro (RPCs por actor)
│   ├── useProfile.ts            # Perfil + avatar
│   ├── useEventosLegislativos.ts
│   ├── useComplianceAI.ts
│   ├── usePlatformAdmin.ts
│   └── useFeatureFlags.ts
├── lib/
│   ├── contractStateMachine.ts  # Máquina de estados dos contratos
│   └── exportUtils.ts           # CSV com BOM para Excel
├── pages/                       # Componentes de rota (~25 páginas)
├── integrations/supabase/
│   ├── client.ts                # Cliente Supabase (tipado)
│   └── types.ts                 # NUNCA editar — regenerar com gen:types
├── i18n/locales/
│   ├── pt.json                  # Traduções PT (primário)
│   └── en.json                  # Traduções EN
└── types/                       # Tipos da app (contracts.ts, index.ts)
```

---

## CRÍTICO: Dois Sistemas de Toast

O projecto usa **dois sistemas distintos**. Misturá-los causa erros silenciosos.

```typescript
// Sistema 1: @/hooks/use-toast (reducer-based)
// Ficheiros: useContratos, useProfile, useEventosLegislativos, useAuditLogs, useContentBlocks, useFeatureFlags
import { toast } from '@/hooks/use-toast';
toast({ title: 'Contrato criado' });
toast({ title: 'Erro', description: error.message, variant: 'destructive' });

// Sistema 2: sonner (library externa)
// Ficheiros: useOrganizations, useNotifications, usePlatformAdmin, useFinanceiro
import { toast } from 'sonner';
toast.success('Criado com sucesso!');
toast.error(error.message || 'Erro genérico');
```

**Regra**: Usar o sistema já importado no ficheiro. Para hooks novos, preferir `@/hooks/use-toast`.

---

## Ordem de Imports

```typescript
// 1. React + libs externas
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
// 2. React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// 3. Supabase
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
// 4. Contexts
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/contexts/ClienteContext';
// 5. Hooks customizados
import { useContratos } from '@/hooks/useContratos';
// 6. Toast (ver secção acima)
import { toast } from '@/hooks/use-toast'; // ou sonner
// 7. Componentes shadcn/ui
import { Button } from '@/components/ui/button';
// 8. Ícones
import { Plus, Loader2 } from 'lucide-react';
// 9. Utils
import { cn } from '@/lib/utils';
```

---

## React Query — Padrão de Hook

Estrutura obrigatória: query + mutations com `onSuccess`/`onError` + `queryClient.invalidateQueries`.

```typescript
export const useContratos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => { /* ... */ },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const createContrato = useMutation({
    mutationFn: async (contrato: ContratoInsert) => { /* ... */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar contrato', description: error.message, variant: 'destructive' });
    },
  });

  return { contratos, isLoading, createContrato };
};
```

### Query Keys (usar exactamente estas)

```typescript
['contratos']                        // lista
['contrato', id]                     // detalhe
['profile', user?.id]
['organizations', user?.id]
['current-organization', user?.id]
['user-memberships', user?.id]
['organization-members', organizationId]
['eventos_legislativos']
['notifications']
['audit-logs', filters]
['feature-flags']
['contentBlocks', organizationId]
['homeConfig', organizationId]
['cca-internal-authorized', user?.id]
['financial-summary', userId, organizationId]
['financial-items', userId, organizationId]
['financial-by-entity', userId, organizationId]
['organization-financial-info', userId, organizationId]
['cca-client-search', debouncedSearch]
```

---

## Modelo Multi-tenant & Regime CCA

### Arquitectura de organizações

- Cada cliente activado = uma organização autónoma em `organizations`
- A CCA é o cliente interno base (`client_code = C.0000`)
- `organizations.client_code` = `organizations_legacy.client_code` = `financeiro_nav_items.jvris_id`

### Interface ClienteJvris (ClienteContext)

```typescript
interface ClienteJvris {
  organizationId: string;   // chave principal — usar sempre
  nome: string;
  clientCode: string;       // client_code (era jvrisId — nome antigo descontinuado)
  groupCode?: string | null;
}
```

**NUNCA usar `jvrisId` em código novo** — o campo foi renomeado para `clientCode`.

### Separação identitária vs visualização (utilizadores CCA internos)

- `profiles.current_organization_id` = organização identitária (a CCA) — **nunca trocar para navegar entre clientes**
- `ClienteContext.viewingOrganizationId` = cliente actualmente em visualização
- `isCCAInternalAuthorized` (de `useOrganizations`) = utilizador CCA com acesso transversal

```typescript
const { isCCAInternalAuthorized, viewingOrganizationId, selectViewingClient } = useOrganizations();
const { cliente } = useCliente(); // cliente.clientCode, cliente.organizationId
```

### RPCs financeiras por actor

Todas as queries financeiras usam estas funções — **nunca aceder directamente às tabelas**:

```typescript
supabase.rpc('fn_is_cca_internal_authorized', { p_user_id })
supabase.rpc('fn_get_client_home_for_actor', { p_user_id, p_viewing_organization_id })
supabase.rpc('fn_get_financial_summary_for_actor', { p_user_id, p_viewing_organization_id })
supabase.rpc('fn_get_financial_items_for_actor', { p_user_id, p_viewing_organization_id })
supabase.rpc('fn_get_financial_summary_by_entity_for_actor', { p_user_id, p_viewing_organization_id })
```

### Componentes CCA

- **`CCAOrgSwitcher`** — selector no header (dropdown com pesquisa debounced 300ms)
- **`ClienteSelectorCCA`** — selector popover (antigo `ClienteSelectorJvris`, alias mantido)
- Ambos usam `searchCCAClients(term)` de `useOrganizations` → `vw_cca_client_catalog_overview`

---

## Roles e Autorização

```typescript
const { user } = useAuth();
const { isPlatformAdmin } = usePlatformAdmin();
const { legalHubProfile, isCCAUser, isOrgManager, isOrgUser, isLocal } = useLegalHubProfile();
const { isCCAInternalAuthorized } = useOrganizations();
// isLocal = true para org_user/org_manager (clientes externos)
// isCCAUser = true para staff interno CCA
```

- Utilizadores externos vêem apenas a sua organização
- Utilizadores externos `owner` vêem o grupo económico completo
- Utilizadores CCA autorizados navegam transversalmente sem onboarding por cliente

---

## Contract State Machine

```typescript
import { canTransitionTo, getValidEventsForState, getStateChangeForEvent } from '@/lib/contractStateMachine';

// SEMPRE verificar antes de mudar estado
if (!canTransitionTo(currentState, newState)) throw new Error('Transição inválida');

// Eventos que mudam estado automaticamente
getStateChangeForEvent('rescisao')  // → 'rescindido'
getStateChangeForEvent('expiracao') // → 'expirado'
getStateChangeForEvent('renovacao') // → 'activo'
```

Estados terminais: `denunciado`, `rescindido` (sem transições possíveis).

---

## Provider Hierarchy (App.tsx)

```
ThemeProvider → QueryClientProvider → AuthProvider → ImpersonationProvider
  → SidebarProvider → TooltipProvider → BrowserRouter → Routes
```

---

## Supabase

### Enums principais

```typescript
estado_contrato: 'rascunho' | 'em_revisao' | 'em_aprovacao' | 'enviado_para_assinatura' | 'activo' | 'expirado' | 'denunciado' | 'rescindido'
tipo_contrato:   'nda' | 'prestacao_servicos' | 'fornecimento' | 'saas' | 'arrendamento' | 'trabalho' | 'licenciamento' | 'parceria' | 'consultoria' | 'outro'
app_role:        'owner' | 'admin' | 'editor' | 'viewer'
nivel_risco:     'baixo' | 'medio' | 'alto'
```

### Padrões obrigatórios

```typescript
// maybeSingle() quando o registo pode não existir
const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

// Sempre definir created_by_id e updated_by_id nas mutations
{ ...contrato, created_by_id: user.id, updated_by_id: user.id, organization_id: orgId }

// RPC para operações que contornam RLS
const { data } = await supabase.rpc('create_organization', { p_name, p_slug });
```

---

## i18n

- Todas as strings visíveis ao utilizador via `t()` — nunca hardcode PT/EN
- Adicionar chaves a **ambos** `pt.json` E `en.json`
- PT é primário — escrever PT primeiro
- Chaves hierárquicas: `common.*`, `nav.*`, `contracts.*`, `dashboard.*`, `financial.*`

---

## CSS Tokens relevantes

```css
/* Brand: Coral CCA — HSL 20 100% 63% (#FF7F41) */
/* Risco */
text-risk-high, bg-risk-high/20, text-risk-medium, text-risk-low
/* Estado */
text-status-pending, text-status-active, text-status-completed, text-status-expired
```

---

## Git Workflow

### Commit messages (Conventional Commits)

```
feat(contracts): adicionar filtro por estado na listagem
fix(auth): corrigir redirect após SSO callback
refactor(hooks): extrair lógica de paginação
chore(deps): atualizar shadcn/ui components
```

Scopes: `contracts`, `auth`, `admin`, `compliance`, `dashboard`, `i18n`, `edge-fn`, `db`, `financial`

### Branches

```
main (produção — protegida)
feat/CCA-XX-descricao    fix/CCA-XX-descricao    refactor/descricao
```

Nunca push directo para `main`. Máx ~200-300 linhas alteradas por PR.

---

## Regras Críticas

1. **Nunca misturar sistemas de toast** — verificar qual o import existente no ficheiro
2. **Nunca editar `src/components/ui/`** — usar `npx shadcn-ui@latest add <component>`
3. **Nunca editar `src/integrations/supabase/types.ts`** — regenerar com `npm run gen:types`
4. **Sempre scopar queries por organização** — usar `getCurrentOrganizationId()` ou `useEffectiveOrganization()`
5. **Sempre definir `created_by_id` e `updated_by_id`** em insert/update
6. **Usar `maybeSingle()`** quando o registo pode não existir (não `single()`)
7. **Sempre invalidar query cache** após mutations — UI fica stale sem isto
8. **Usar `canTransitionTo()`** antes de mudar estado do contrato
9. **Adicionar chaves i18n a ambos os ficheiros** — `pt.json` e `en.json`
10. **Usar `@/` path aliases** — nunca imports relativos `../../`
11. **Datas**: `format(date, pattern, { locale: pt })` de `date-fns`
12. **Nunca usar `jvrisId` em código novo** — o campo é `clientCode` em `ClienteJvris`
13. **Nunca trocar `profiles.current_organization_id` para utilizadores CCA internos** — usar `ClienteContext.viewingOrganizationId`
14. **Consultas financeiras sempre via RPCs** `fn_get_*_for_actor` — nunca directo às tabelas `financeiro_nav_*`
15. **`ClienteSelectorCCA`** é o nome correcto do componente (não `ClienteSelectorJvris`)
16. **Zero referências ao Lovable** — `lovable`, `gptengineer`, `lovable_ai` proibidos em código novo
17. **Self-healing**: usar `maybeSingle()` + criar registo se ausente (padrão de `useProfile`, `useOrganizations`)
18. **Feature flags**: verificar `useFeatureFlags()` antes de adicionar features condicionais (SSO, 2FA, demo login)
19. **Supabase Project ID é `scjxhhkutsiswsgsuiqo`** — usar este ID em referências ao projecto
20. **Protecção do CLAUDE.md**: qualquer alteração a este ficheiro requer confirmação explícita do utilizador, listagem das secções afectadas e descrição do impacto. Nunca alterar silenciosamente.
