# Guia de Arquitetura — CCA Legal Hub

Guia simples para quem quer perceber como a aplicação está construída e porquê.

---

## O que é esta aplicação?

O **CCA Legal Hub** é uma plataforma web de gestão de contratos jurídicos. É multi-tenant, ou seja, várias organizações (clientes) partilham a mesma plataforma mas os dados de cada uma estão completamente isolados.

---

## Com o que foi feita?

Não foi feita em Python. Foi feita em **TypeScript** — uma versão mais rigorosa do JavaScript que obriga a declarar os tipos de dados, o que evita muitos bugs em tempo de desenvolvimento.

| Camada | Tecnologia | Porquê |
|--------|-----------|--------|
| Linguagem | TypeScript | Segurança de tipos, erros detectados antes de chegar ao utilizador |
| Interface | React 18 | Biblioteca de componentes reativa, ecossistema maduro e grande comunidade |
| Build | Vite 5 | Arranque em milissegundos em desenvolvimento, bundle optimizado em produção |
| Estilos | Tailwind CSS + shadcn/ui | Design consistente sem escrever CSS à mão; componentes acessíveis por padrão |
| Base de dados | Supabase (PostgreSQL) | Backend completo (DB + Auth + Edge Functions) sem gerir servidores |
| Estado e cache | React Query v5 | Sincroniza dados do servidor com a UI, gere cache e re-fetch automaticamente |
| Formulários | React Hook Form + Zod | Validação declarativa e type-safe sem código repetitivo |
| i18n | i18next | Suporte a PT e EN com troca de idioma em tempo real |
| Testes | Vitest | Rápido, compatível com Vite, sem configuração extra |

---

## O que é o "render" e por que foi escolhido?

### Render = CSR (Client-Side Rendering)

Esta aplicação usa **renderização no lado do cliente** (CSR — Client-Side Rendering). Significa que:

1. O servidor envia apenas um ficheiro HTML quase vazio + os ficheiros JavaScript.
2. O browser descarrega o JavaScript e **é ele próprio que constrói toda a interface**.
3. As navegações entre páginas acontecem sem recarregar a página (SPA — Single-Page Application).

### Por que se escolheu CSR em vez de SSR?

| Critério | CSR (esta app) | SSR (ex: Next.js) |
|----------|---------------|-------------------|
| SEO | Não necessário — app privada com login | Relevante para sites públicos |
| Interatividade | Muito alta — tabelas, filtros, formulários complexos | Adequado para conteúdo estático |
| Estado do cliente | Complexo (multi-tenant, impersonação, permissões) | Mais difícil de gerir no servidor |
| Infraestrutura | Apenas um CDN estático | Requer servidor Node sempre activo |
| Custo | Baixo — ficheiros estáticos são baratos | Mais caro — servidor computacional |

Como o CCA Legal Hub é uma aplicação **privada** (requer login), com **muita interactividade** (formulários, dashboards, filtros em tempo real) e **estado complexo por utilizador** (organização activa, impersonação, permissões por role), o CSR é a escolha natural. Não há necessidade de indexação por motores de busca nem de conteúdo pré-renderizado.

---

## Como os dados chegam ao ecrã?

```
Utilizador abre uma página
        ↓
React Router detecta a rota e carrega o componente (lazy)
        ↓
React Query verifica se já tem dados em cache
        ↓ (se não tiver ou estiverem desactualizados)
Supabase client faz query à base de dados PostgreSQL
        ↓
Row-Level Security (RLS) do Supabase garante que só vêm dados da organização certa
        ↓
React Query guarda em cache (5 min) e entrega ao componente
        ↓
React renderiza a interface
```

---

## Como funciona o multi-tenant?

Cada utilizador pertence a uma **organização**. Todas as queries à base de dados filtram sempre por `organization_id`. O Supabase impõe isso também ao nível da base de dados (RLS), por isso mesmo que houvesse um bug no frontend, os dados de outras organizações nunca seriam devolvidos.

Os utilizadores da CCA (internos) podem ver qualquer organização sem alterar o seu próprio perfil — usam o `ClienteContext` para trocar de "vista de organização".

---

## Onde corre a lógica de servidor?

Em **Edge Functions** do Supabase (TypeScript a correr em Deno, distribuído globalmente). Exemplos:

- `parse-contract` — extrai dados de um contrato usando IA (Claude da Anthropic)
- `analyze-compliance` — verifica conformidade RGPD
- `sync-sharepoint` — sincroniza documentos com o SharePoint do cliente
- `data-retention-cron` — apaga dados expirados (agendado)

Estas funções correm perto do utilizador (edge), reduzindo latência, e são invocadas via HTTP pelo frontend.

---

## Resumo em uma frase

> Aplicação React em TypeScript, renderizada no browser (CSR/SPA), com Supabase como backend completo, React Query para sincronização de dados, e Edge Functions para lógica de servidor e IA.
