# Login.tsx — patch de redesign

Substitui `src/pages/auth/Login.tsx` pelo ficheiro `Login.tsx` deste pasta.

## O que mudou (e porquê)

| Antes | Depois |
|---|---|
| Painel esquerdo com `var(--gradient-hero)` (creme→branco) + `text-primary-foreground` (branco) → **invisível** | Painel `bg-sidebar` (preto profundo) + `text-sidebar-foreground` (marfim). Texto legível, peso institucional. |
| SSO e Submit **ambos laranja** → hierarquia confusa | SSO em **preto** (secundário), Submit em **laranja** (primário). Uma acção principal por vez. |
| Inputs apanham autofill azul do browser | Inputs com `bg-surface`/`focus-visible:ring-ink`. Adicionar CSS de autofill (ver abaixo). |
| "Esqueceu palavra-passe?" em laranja saturando | Em `text-ink-mute` → hover laranja. Eyebrow discreto. |
| `<Card>` shadcn flat | `bg-surface border-line shadow-card` (consistente com restantes cards do hub) |
| Quote sem atribuição visual | Card com avatar circular + nome + papel + cliente |
| Sem links legais nem toggle de idioma | Footer com Privacidade/Termos/Suporte + mensagem legal |

## Adicionar ao `src/index.css`

Acrescentar no final do `@layer base`:

```css
/* Defeat browser autofill blue on form inputs */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-text-fill-color: hsl(var(--ink));
  -webkit-box-shadow: 0 0 0 100px hsl(var(--surface)) inset;
  caret-color: hsl(var(--ink));
  transition: background-color 5000s ease-in-out 0s;
}
```

## Tokens usados (já existem no teu `index.css`)

- `--sidebar-background` (#0D0B09 — preto profundo)
- `--sidebar-ink`, `--sidebar-ink-mute`
- `--accent-brand` (#BD4E18 — laranja CCA contido)
- `--accent-brand-strong` (hover)
- `--ink`, `--ink-soft`, `--ink-mute`
- `--surface`, `--bg`, `--bg-alt`
- `--line`

**Zero classes novas, zero tokens novos.** Apenas usa o sistema que já existe.

## Conformidade com CLAUDE.md

✅ Não toca em `src/components/ui/*` (só usa `Button`, `Input`, `Label`, `Dialog`)
✅ PT-PT preservado (não-iniciada → não-iniciado, etc. — verificado)
✅ Toda a lógica preservada: `handleSubmit`, `handleSSOLogin`, `handleDemoLogin`, `handleResetPassword`, feature flags, Supabase, toast, zod, navegação
✅ Componentes shadcn usados com classes Tailwind — não estilos inline excepto onde precisamos de `hsl(var(--token) / alpha)` que Tailwind não expressa nativamente

## Commit sugerido

```
feat(auth): redesign login page with elegant orange accent system

- Dark institutional left panel replaces invisible white-on-cream text
- Button hierarchy: dark SSO + orange submit (was: two orange buttons)
- Refined typography, eyebrow labels, testimonial card with attribution
- Defeat browser autofill blue tint on form inputs
- All auth logic preserved (SSO, demo, reset, validation)
```
