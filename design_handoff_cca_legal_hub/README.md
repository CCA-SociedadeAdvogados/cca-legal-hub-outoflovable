# Handoff: CCA Legal Hub — Redesign do Layout

## Para o agente (Claude Code) ler primeiro

Este pacote contém:
1. **`prototype/`** — protótipo HTML+React standalone com 3 direcções visuais (Âmbar / Terracota / Cobre). É **referência visual**, não código de produção.
2. **`README.md`** (este ficheiro) — instruções concretas para aplicar o redesign neste codebase específico.

O codebase de produção é o repositório actual:
- **Stack:** Vite 5 + React 18 + TypeScript + Tailwind 3 + shadcn/ui + Supabase + React Query v5 + react-i18next (PT primário).
- **Design tokens:** HSL via CSS variables em `src/index.css`, expostas em `tailwind.config.ts` como `bg-primary`, `bg-sidebar`, etc.
- **Componentes shadcn:** **não editar** `src/components/ui/` (regra crítica do CLAUDE.md).

## Estratégia de implementação

**Não reescrever páginas.** O redesign é predominantemente uma mudança de **design tokens** (cores, tipografia, sidebar) + ajustes pontuais em layouts de cards/headers. Seguir esta ordem:

### Fase 1 — Tokens (`src/index.css`)
Substituir o bloco `:root` por estes valores. Manter a estrutura HSL existente (Tailwind/shadcn dependem dela). **O laranja CCA fica preservado (`--primary`), o que muda é a sidebar deixar de ser coral-sobre-coral.**

```css
:root {
  /* Canvas — marfim quente em vez de branco puro */
  --background: 40 30% 97%;            /* #FAF7F1 */
  --foreground: 0 0% 7%;                /* #121010 */

  --card: 0 0% 100%;
  --card-foreground: 0 0% 7%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 7%;

  /* Primary — laranja CCA ajustado (menos néon, mais âmbar maduro) */
  --primary: 18 78% 42%;                /* #BD4E18 */
  --primary-foreground: 40 30% 97%;

  --secondary: 38 25% 92%;              /* #F2EDE2 */
  --secondary-foreground: 0 0% 7%;

  --muted: 38 25% 92%;
  --muted-foreground: 30 6% 53%;        /* #8B857D */

  --accent: 18 78% 42%;
  --accent-foreground: 40 30% 97%;

  --destructive: 8 60% 38%;             /* #9A3B25 */
  --destructive-foreground: 40 30% 97%;

  --border: 40 25% 84%;                 /* #E2DACB */
  --input: 40 25% 84%;
  --ring: 18 78% 42%;

  --radius: 0.375rem;                   /* 6px — era 0.5rem */

  /* Sidebar — preto profundo, não mais coral.
     O laranja CCA aparece apenas no item activo. */
  --sidebar-background: 30 16% 5%;      /* #0D0B09 */
  --sidebar-foreground: 38 30% 88%;     /* #EDE6D7 */
  --sidebar-primary: 18 78% 45%;        /* #C9591E — item activo */
  --sidebar-primary-foreground: 30 16% 5%;
  --sidebar-accent: 30 16% 9%;          /* hover row */
  --sidebar-accent-foreground: 38 30% 88%;
  --sidebar-border: 30 8% 14%;
  --sidebar-ring: 18 78% 45%;

  /* Risk/Status — mantidos semanticamente, mas tons mais terra */
  --risk-high: 8 60% 45%;
  --risk-medium: 30 65% 50%;
  --risk-low: 90 30% 38%;
  --status-pending: 30 65% 50%;
  --status-active: 90 30% 38%;
  --status-completed: 90 30% 38%;
  --status-expired: 8 60% 45%;

  /* Gradients e shadows — afinar */
  --gradient-hero: linear-gradient(135deg, hsl(38 25% 96%) 0%, hsl(0 0% 100%) 100%);
  --gradient-card: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(40 30% 98%) 100%);
  --gradient-sidebar: linear-gradient(180deg, hsl(30 16% 5%) 0%, hsl(30 16% 7%) 100%);

  --shadow-card: 0 1px 2px 0 hsl(30 16% 5% / 0.04), 0 1px 3px -1px hsl(30 16% 5% / 0.06);
  --shadow-elevated: 0 8px 24px -8px hsl(30 16% 5% / 0.12);
}

.dark { /* opcional — pode manter as variáveis existentes, sidebar dark já bate com a nova */ }
```

### Fase 2 — Tipografia (`tailwind.config.ts` + `src/index.css`)

Trocar o import de Google Fonts e a fontFamily:

```css
/* topo do index.css */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

```ts
// tailwind.config.ts
fontFamily: {
  sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
  serif: ['Fraunces', 'Georgia', 'serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
},
```

**Headings** (h1-h6) continuam em serif (`font-serif`), mas com letter-spacing mais apertado:
```css
h1, h2, h3, h4, h5, h6 {
  font-family: 'Fraunces', Georgia, serif;
  @apply font-medium tracking-tight;
  letter-spacing: -0.015em;
}
```

### Fase 3 — Sidebar

Localizar o componente em `src/components/layout/` (provavelmente `Sidebar.tsx` ou similar). Ajustes:

- Fundo: `bg-sidebar` (já vai ser preto após Fase 1)
- Item activo: `bg-sidebar-primary text-sidebar-primary-foreground` (laranja)
- Item hover: `bg-sidebar-accent`
- **Adicionar bloco "Área reservada / CCA · Sociedade de Advogados"** entre o monograma e o menu, separado por `border-t border-b border-sidebar-border/40`
- Items locked (Impostos, Legislação): aplicar `opacity-50 cursor-not-allowed` + ícone `Lock` (lucide) à direita
- **Manter a ordem do menu existente** (regra do utilizador)
- Padding por item: `py-2.5 px-3.5`, gap `gap-3`, `text-[13px]`, `rounded-sm`
- Largura 244px; collapsed 64px com transição 220ms

### Fase 4 — Topbar

Componente em `src/components/layout/`. Estrutura:
- Altura `h-[60px]`, `border-b`, `bg-background`, sticky com `backdrop-blur`
- **Esquerda:** search com `cmdk` (já há `cmdk` no package.json) — input com ícone, placeholder `"Pesquisar contratos, políticas, eventos…"`, kbd `⌘ K`
- **Centro:** Cliente activo — pill com bullet `bg-primary`, código mono, nome (usar `ClienteContext.viewingOrganization`)
- **Direita:** botão `Seleccionar cliente` (ghost), botões-ícone (sparkle + bell com badge), avatar circular 34px com inicial

### Fase 5 — Página Início / Home

Ficheiro: `src/pages/Home.tsx`. Aplicar a estrutura do protótipo (`prototype/src/inicio.jsx`):
1. **Eyebrow** "Início" — `text-xs tracking-[0.22em] uppercase text-muted-foreground` com filete antes (`<span className="block w-4 h-px bg-primary mr-2.5"/>`)
2. **H1** "Bem-vindo, *André*." — `font-serif text-4xl font-normal tracking-tight`, primeiro nome em italic + `text-primary`
3. **Subtítulo** italic serif `text-lg text-muted-foreground`
4. **Welcome Banner** — gradient `bg-gradient-to-r from-secondary to-card`, padding `p-8 lg:p-9`, grid 1fr auto com ornamento SVG concêntrico à direita (opacity 0.08)
5. **KPI Row** — 4 cards grid (`grid-cols-4 gap-4`), cada um com label uppercase + pill delta + valor `font-serif text-4xl`
6. **Grids** — 1.4fr/1fr (Contratos / Organização), depois 1/1/1 (Documentos / Insights / Novidades), depois 1.4fr/1fr (Actividade / Atalhos)

### Fase 6 — Páginas internas

Aplicar o **mesmo padrão de page header** (Eyebrow + H1 com palavra-chave em italic+primary) a todas as páginas existentes. Layouts internos preservados — apenas refrescar cards (border `border-border`, radius `rounded-md`, padding consistente).

Páginas a revisitar (por prioridade):
- `LegalBi.tsx` — bar chart (recharts já está instalado), KPIs grandes
- `Contratos.tsx` — tabela com filter pills no topo
- `DocumentosGlobal.tsx` — sidebar de pastas + grid de documentos
- `Dashboard.tsx` — pode ser fundido com `Home.tsx` ou tratado como variante

## Design Tokens — referência rápida

| Token | Valor | Uso |
|---|---|---|
| Primary (CCA orange) | `#BD4E18` / `hsl(18 78% 42%)` | Botões CTA, item sidebar activo, links de acção, números destacados |
| Sidebar bg | `#0D0B09` | Sidebar fundo |
| Sidebar ink | `#EDE6D7` | Texto sidebar |
| Background | `#FAF7F1` | Canvas |
| Surface (card) | `#FFFFFF` | Cards |
| Border | `#E2DACB` | Divisórias, borders de cards |
| Ink | `#121010` | Texto principal |
| Muted fg | `#8B857D` | Labels, meta |
| Radius | `0.375rem` (6px) | Cards |
| Radius sm | `0.125rem` (2px) | Inputs/pills |

## Tipografia

| Uso | Família | Tamanho | Peso | Tracking |
|---|---|---|---|---|
| H1 página | Fraunces | 36–40px | 400 | -0.02em |
| H2 card title | Fraunces | 19–26px | 500 | -0.005em |
| KPI value | Fraunces | 38–44px | 400 | -0.02em |
| Body | Inter Tight | 13px | 400 | — |
| Label | Inter Tight | 12px | 500 | — |
| Eyebrow | Inter Tight | 10–10.5px | 500 | 0.18–0.24em / uppercase |
| Mono (IDs, datas) | JetBrains Mono | 11–12px | 400 | — |

## Direcções alternativas

O protótipo inclui mais duas direcções (Terracota e Cobre) caso a sócia/director queira comparar. Para já, implementar **Âmbar** como default; as outras podem ficar atrás de uma flag de tema (`next-themes` já está instalado).

## Regras a respeitar (do CLAUDE.md do repo)

- Não tocar em `src/components/ui/`
- Não tocar em `src/integrations/supabase/types.ts`
- i18n: chaves em `pt.json` e `en.json`, PT-PT primário (ex: "Activo", "selecção", "Definições")
- Imports com aliases `@/`
- Conventional Commits (`refactor(ui): aplicar tema Âmbar`)
- Zero referências a `lovable`/`gptengineer`

## Files no prototype/
- `index.html` — entry point standalone (abrir num browser para ver)
- `src/themes.jsx` — 3 themes em JSON
- `src/data.jsx` — mock data PT-PT
- `src/icons.jsx` — set de ícones SVG (no codebase real usar `lucide-react`)
- `src/shell.jsx` / `inicio.jsx` / `screens.jsx` / `app.jsx`
