# CCA Legal Hub

SPA multi-tenant de gestão de contratos (React 18, TypeScript, Vite 5, Tailwind/shadcn, Supabase, React Query v5, react-i18next PT/EN). Supabase ID: `scjxhhkutsiswsgsuiqo`.

## Commands

```bash
npm run dev          # porta 8080
npm run build        # produção
npm run lint         # ESLint
npm run test         # Vitest
npm run typecheck    # tsc --noEmit
npm run gen:types    # regenera supabase/types.ts
```

## Critical Rules

1. **Dois sistemas de toast** — usar o que já existe no ficheiro; novos hooks preferem `@/hooks/use-toast`
2. **Nunca editar** `src/components/ui/` nem `src/integrations/supabase/types.ts`
3. **Scopar queries por organização** — sempre filtrar por `organization_id`
4. **`created_by_id` + `updated_by_id`** obrigatórios em insert/update
5. **`maybeSingle()`** quando registo pode não existir
6. **`canTransitionTo()`** antes de mudar estado do contrato
7. **i18n** — chaves em ambos `pt.json` e `en.json`; PT é primário
8. **Imports** — usar `@/` path aliases, nunca relativos
9. **Financeiro** — sempre via RPCs `fn_get_*_for_actor`, nunca tabelas directas
10. **CCA internos** — usar `ClienteContext.viewingOrganizationId`, nunca trocar `profiles.current_organization_id`
11. **Zero referências** a `lovable`/`gptengineer` em código novo
12. **Edge Functions** — CORS via `_shared/cors.ts`, nunca hardcode `"*"`
13. **Query keys** — usar factory em `src/lib/queryKeys.ts`
14. **Conventional Commits** — `feat|fix|refactor(scope): msg`
15. **Direito PT/EU only** — prompts de IA e outputs referem apenas direito português ou comunitário (Código Civil, Código Comercial, CPC, RJUE, RGPD, eIDAS); **nunca** FRE, IRAC, state/federal, CCPA, MBE, common law, U.S.C., UCC. Skills/prompts importados de `claude-for-legal` são reescritos antes de port — referências US são substituídas por equivalentes PT/EU ou removidas. Lista `jurisdictions_allowed` da org define o âmbito permitido (default `['PT','EU']`).

## Claude for Legal (referência de design)

[`anthropics/claude-for-legal`](https://github.com/anthropics/claude-for-legal) é usado **só como referência de design** para evoluir as funcionalidades de IA do Hub. **Os plugins não são instalados em máquinas de advogados** — todas as skills relevantes são portadas para Edge Functions do Hub e expostas na UI (tab "IA" em `ContratoDetalhe.tsx`, action bar, etc.).

Toda a portabilidade segue a regra #15 (PT/EU only). Outputs de IA são sempre **minuta para revisão por advogado**, nunca afirmação final.

### Padrão "playbook"

Cada organização tem o seu playbook na tabela `org_playbooks` (per-org, per-scope), lido por `_shared/playbook.ts:loadPlaybook(orgId, scope)` e injectado no system prompt de todas as Edge Functions de IA via `buildSystemPrompt()`. Regras de aprovação, thresholds de risco e escalation chain vivem aqui — nunca hardcoded.

### Plugin skill → Hub feature

| Plugin / skill (origem) | Hub | Implementação |
|---|---|---|
| `commercial-legal:review` | ✅ | `redline-contract` + `validate-contract` |
| `commercial-legal:renewal-tracker` | 🟡 | `send-contract-alerts` (cron) — falta tabela `renewal_register` |
| `commercial-legal:escalation-flagger` | ❌ | Edge Function nova (Fase 1) |
| `commercial-legal:amendment-history` | ❌ | comparador `anexos_contrato` (Fase 1) |
| `commercial-legal:playbook-monitor` | ❌ | depende de `org_playbooks` |
| `commercial-legal:stakeholder-summary` | ✅ | `executive-summary` |
| `privacy-legal:dsar-response` | ❌ | RGPD art. 15.º (Fase 2) |
| `privacy-legal:dpa-review` | ❌ | RGPD art. 28.º (Fase 2) |
| `privacy-legal:pia-generation` | ❌ | RGPD art. 35.º (Fase 2) |
| `corporate-legal:*` (M&A) | ❌ | due-diligence PT (Fase 3) |
| `employment-legal`, `regulatory-legal`, `ai-governance-legal`, `product-legal` | ❌ | Fase 4 |
| `litigation-legal`, `ip-legal` | 🚫 | **não portar** — desenhar de raiz em torno do CPC e da Lei da Propriedade Industrial PT, quando necessário |

Roadmap detalhado: `docs/plugin-roadmap.md`.
