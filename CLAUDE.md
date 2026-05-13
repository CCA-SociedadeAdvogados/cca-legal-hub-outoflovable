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

## Claude for Legal (plugins jurídicos)

Marketplace oficial da Anthropic com plugins por área de prática (commercial, corporate, litigation, employment, privacy, regulatory, ip, etc.). São ferramentas **pessoais** de cada jurista da CCA, instaladas no Claude Code CLI **local** — não afectam este repositório.

Setup completo e lista de plugins recomendados para a CCA: [`docs/CLAUDE_FOR_LEGAL_PLUGINS.md`](docs/CLAUDE_FOR_LEGAL_PLUGINS.md).

Resumo rápido (correr no Claude Code CLI local, **não** em sessões web):

```text
/plugin marketplace add https://github.com/anthropics/claude-for-legal
/plugin install commercial-legal@claude-for-legal
# … reiniciar CLI …
/commercial-legal:cold-start-interview
```
