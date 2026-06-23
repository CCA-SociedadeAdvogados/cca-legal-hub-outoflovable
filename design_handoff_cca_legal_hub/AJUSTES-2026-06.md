# Ajustes — Sessão de Junho 2026

Pacote pronto para aplicar via **Claude Code** no repo `cca-legal-hub-outoflovable`.
Cobre dois ecrãs: **Login** (`src/pages/auth/Login.tsx`) e **Início / Portal** (`src/pages/Home.tsx`).

> **Como dar ao Claude Code:**
> *"Lê `design_handoff_cca_legal_hub/AJUSTES-2026-06.md` e aplica os dois conjuntos de mudanças. Os ficheiros em `prototype/` (index.html = dashboard, CCA Login.html = login) são a referência visual — abre-os no browser para veres o resultado pretendido. Usa apenas tokens já existentes no nosso `index.css`/`tailwind.config.ts`. Não toques em `src/components/ui/`. Pára depois do Login para eu rever."*

Os tokens necessários (`bg`, `surface`, `ink/soft/mute`, `line/soft`, `brand/soft/strong`, `sidebar-ink/ink-mute`, `.eyebrow`, `rounded-card/control`) **já existem** no repo. Nada de novo a criar.

---

## A) LOGIN — `src/pages/auth/Login.tsx`

Substituir o ficheiro pelo `design_handoff_cca_legal_hub/Login.tsx` (drop-in, toda a lógica preservada).

**Pontos-chave do redesign:**
- Painel esquerdo **escuro** (`bg-sidebar`) com texto marfim — resolve o texto branco-sobre-creme invisível do original.
- Hierarquia de botões: **SSO em preto** (secundário) + **Entrar em laranja** (primário). Antes os dois eram laranja.
- Glow âmbar no fundo do painel, cartão de testemunho com avatar/atribuição, links legais, toggle PT/EN.

**Ajuste de contraste (importante — afinámos depois):** o painel escuro deve usar tons claros para o texto secundário. Garantir que o painel esquerdo usa:
- Fundo do painel: `#12100C` (quase preto, levemente quente)
- Texto principal do painel: `#F3ECDD`
- Texto secundário do painel: `#D8CFBC` (NÃO usar o cinza-mute escuro — falha contraste)
- Glow âmbar superior: `rgba(214,90,30,0.30)` (forte o suficiente para dar profundidade)

Se os tokens `--sidebar-foreground` / `--sidebar-ink-mute` no repo estiverem mais escuros que isto, clarear para estes valores **apenas no contexto do painel de login** (ou globalmente se a sidebar da app também beneficiar).

**Adicionar ao `src/index.css`** (dentro de `@layer base`, a seguir ao `body{}`) — mata o azul de autofill do Chrome nos inputs:

```css
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
select:-webkit-autofill {
  -webkit-text-fill-color: hsl(var(--ink));
  -webkit-box-shadow: 0 0 0 100px hsl(var(--surface)) inset;
  caret-color: hsl(var(--ink));
  transition: background-color 5000s ease-in-out 0s;
}
```

---

## B) INÍCIO / PORTAL — `src/pages/Home.tsx`

Referência visual: `prototype/index.html` (tela Início). Aplicar 5 refinamentos sobre a estrutura existente. **Não reescrever a página** — são ajustes de apresentação.

### B1. Cabeçalho vivo (saudação + data + chip de sessão)

Substituir o título estático por saudação consciente da hora + data por extenso (PT-PT) + chip "última sessão".

```tsx
// helpers (topo do ficheiro ou util partilhado)
const greeting = () => {
  const h = new Date().getHours();
  return h < 13 ? "Bom dia" : h < 20 ? "Boa tarde" : "Boa noite";
};
const dateLong = () => {
  const s = new Date().toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
```

```tsx
<div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
  <div>
    <div className="eyebrow mb-3.5">{dateLong()}</div>
    <h1 className="font-serif text-[40px] font-normal tracking-tight leading-[1.05] text-ink mb-2">
      {greeting()}, <em style={{ color: "hsl(var(--accent-brand))" }}>André</em>.
    </h1>
    <p className="font-serif italic text-[17px] text-ink-soft">
      A sua área de gestão jurídica — contratos, documentos e obrigações num só lugar.
    </p>
  </div>
  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface border border-line rounded-card shadow-card">
    <span className="w-[7px] h-[7px] rounded-full" style={{ background: "hsl(var(--positive))" }} />
    <span className="text-[12px] text-ink-soft">
      Última sessão: <span className="text-ink font-medium">hoje, 08:42</span>
    </span>
  </div>
</div>
```

> Trocar "André" pelo nome real do utilizador autenticado (do `AuthContext`/perfil).

### B2. KPI cards — filete de acento + hover lift

Cada card de KPI ganha um filete laranja no topo (cresce no hover), elevação subtil e sombra mais profunda no hover.

```tsx
function KpiCard({ label, value, delta, trend }: KpiProps) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      className="relative overflow-hidden bg-surface border rounded-card px-[22px] pt-5 pb-[22px] transition-all duration-200"
      style={{
        borderColor: h ? "hsl(var(--accent-brand))" : "hsl(var(--line))",
        transform: h ? "translateY(-3px)" : "none",
        boxShadow: h
          ? "0 2px 4px rgba(43,22,11,0.05), 0 16px 30px -12px rgba(43,22,11,0.14)"
          : "0 1px 2px rgba(43,22,11,0.04), 0 8px 20px -10px rgba(43,22,11,0.07)",
      }}
    >
      <span
        className="absolute top-0 left-0 h-0.5 transition-all duration-300"
        style={{ width: h ? "100%" : "28px", background: "hsl(var(--accent-brand))" }}
      />
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10.5px] tracking-[0.18em] uppercase text-ink-mute font-medium">{label}</span>
        {/* pill de delta — usar Badge/pill existente, tom positive/warn/neutro */}
      </div>
      <div className="font-serif text-[38px] font-normal tracking-tight leading-none text-ink">{value}</div>
    </div>
  );
}
```

### B3. Sombras suaves em todos os cards

Adicionar a sombra de card a TODOS os cards do dashboard (não só KPIs). Se usam o `shadow-card` token, garantir que está definido assim no `index.css`:

```css
--shadow-card: 0 1px 2px 0 hsl(var(--ink) / 0.05), 0 8px 20px -10px hsl(var(--ink) / 0.07);
```

E aplicar `className="… shadow-card"` (ou `card-elevated`) aos cards de Contratos, Organização, Documentos, Insights, Novidades, Atividade, Atalhos.

### B4. Rótulos de secção (ritmo editorial)

Inserir um rótulo + filete entre os grupos de cards, para dar hierarquia:

```tsx
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mt-11 mb-4">
      <span className="text-[11px] tracking-[0.2em] uppercase text-ink-mute font-medium">{children}</span>
      <span className="flex-1 h-px bg-line-soft" />
    </div>
  );
}
```

Ordem das secções no Início:
1. (banner "Resumo do dia" + KPIs — sem rótulo, logo após o cabeçalho)
2. `<SectionLabel>A sua carteira</SectionLabel>` → grid `[1.4fr_1fr]`: Contratos Recentes + A Nossa Organização
3. `<SectionLabel>Conhecimento & novidades</SectionLabel>` → grid 3 col: Documentos + Legal Insights + Novidades CCA
4. `<SectionLabel>Atividade & atalhos</SectionLabel>` → grid `[1.4fr_1fr]`: Atividade Recente + Atalhos Rápidos

### B5. Animação de entrada escalonada

Adicionar ao `src/index.css` (dentro de `@layer utilities`):

```css
.dash-enter > * { animation: dashIn 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.dash-enter > *:nth-child(1) { animation-delay: 0.02s; }
.dash-enter > *:nth-child(2) { animation-delay: 0.07s; }
.dash-enter > *:nth-child(3) { animation-delay: 0.12s; }
.dash-enter > *:nth-child(4) { animation-delay: 0.17s; }
.dash-enter > *:nth-child(5) { animation-delay: 0.22s; }
.dash-enter > *:nth-child(6) { animation-delay: 0.27s; }
.dash-enter > *:nth-child(7) { animation-delay: 0.32s; }
@keyframes dashIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .dash-enter > * { animation: none; } }
```

E pôr `className="dash-enter"` no container raiz do conteúdo do Início (o `<div>` que envolve cabeçalho + banner + secções).

---

## Banner "Resumo do dia" (referência)

Já existe no protótipo; se ainda não estiver no Home.tsx, é um card com gradiente `from-secondary to-card`, ornamento SVG concêntrico "CCA" à direita (opacity 0.08), eyebrow "✦ Resumo do dia" em `accent`, e título serif 26px com os números (3 contratos / 5 documentos) em `accent`. Botões: "Rever contratos" (laranja) + "Ver agenda" (ghost).

---

## Checklist de conformidade (CLAUDE.md)
- [ ] Não editar `src/components/ui/`
- [ ] PT-PT ("Activo", "selecção", "Definições")
- [ ] Imports com `@/`
- [ ] Nome do utilizador vem do AuthContext (não hardcode "André")
- [ ] Conventional Commits — ex: `feat(home): refinar dashboard com saudação, KPIs e ritmo de secções`
