// Three elegant directions — each centered on CCA orange, handled with restraint.

const THEMES = {
  // 1) TERRACOTA — laranja queimado em paleta creme/barro. Editorial, italiano, sofisticado.
  //    Laranja é acento de personalidade, não protagonista; fica "quente" sem ser gritante.
  terracota: {
    id: 'terracota',
    name: 'Terracota',
    tagline: 'Creme quente · laranja queimado · serifa editorial',
    bg: '#F6F0E6',
    bgAlt: '#EFE7D8',
    surface: '#FCF7EC',
    sidebar: '#1F1612',
    sidebarInk: '#F2E7D2',
    sidebarInkMute: '#9A8B74',
    sidebarActive: '#C25A22',        // terracota, menos saturado
    sidebarActiveInk: '#FCF7EC',
    ink: '#1B1510',
    inkSoft: '#5A4A3C',
    inkMute: '#8F8271',
    line: '#D8CBB0',
    lineSoft: '#E8DEC8',
    accent: '#B85022',                // terra cotta mais contido
    accentSoft: '#B8502214',
    accentStrong: '#A0421A',
    positive: '#5A6E3F',
    warn: '#B4702A',
    danger: '#8B3622',
    display: '"Fraunces", "EB Garamond", Georgia, serif',
    serif: '"EB Garamond", Georgia, serif',
    sans: '"Inter Tight", "Helvetica Neue", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    radius: 2,
    radiusCard: 4,
  },

  // 2) ÁMBAR — preto profundo + âmbar quente (o laranja CCA amadurecido).
  //    Sidebar preto, canvas branco quase puro. Laranja só nos moments que importam.
  ambar: {
    id: 'ambar',
    name: 'Âmbar',
    tagline: 'Preto & branco-marfim · laranja em acentos precisos',
    bg: '#FAF7F1',
    bgAlt: '#F2EDE2',
    surface: '#FFFFFF',
    sidebar: '#0D0B09',
    sidebarInk: '#EDE6D7',
    sidebarInkMute: '#8A8274',
    sidebarActive: '#C9591E',        // laranja CCA ajustado — menos néon
    sidebarActiveInk: '#0D0B09',
    ink: '#121010',
    inkSoft: '#4A4540',
    inkMute: '#8B857D',
    line: '#E2DACB',
    lineSoft: '#EDE7D9',
    accent: '#BD4E18',                // âmbar quente, maduro
    accentSoft: '#BD4E1810',
    accentStrong: '#9F3F12',
    positive: '#4F6B3D',
    warn: '#C87828',
    danger: '#9A3B25',
    display: '"Fraunces", Georgia, serif',
    serif: '"Fraunces", Georgia, serif',
    sans: '"Inter Tight", "Helvetica Neue", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    radius: 3,
    radiusCard: 6,
  },

  // 3) COBRE — monocromo quente. Toda a paleta em tons de cobre/laranja/terracota.
  //    Laranja é o DNA — controlado com escala de valores (claro, médio, escuro).
  cobre: {
    id: 'cobre',
    name: 'Cobre',
    tagline: 'Monocromia quente · laranja como sistema completo',
    bg: '#FBF4EA',
    bgAlt: '#F3E8D6',
    surface: '#FEF9EF',
    sidebar: '#2A160B',                // laranja escuríssimo, quase castanho
    sidebarInk: '#F6E4CC',
    sidebarInkMute: '#A48770',
    sidebarActive: '#D0661F',        // cobre quente sem estridência
    sidebarActiveInk: '#2A160B',
    ink: '#2A160B',
    inkSoft: '#6B4C35',
    inkMute: '#9A7C63',
    line: '#E3CEA8',
    lineSoft: '#EEDEBD',
    accent: '#B85018',                // cobre escurecido
    accentSoft: '#B8501814',
    accentStrong: '#8F3C10',
    positive: '#6B7A3D',
    warn: '#C8772A',
    danger: '#8B3622',
    display: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
    serif: '"Cormorant Garamond", Georgia, serif',
    sans: '"Inter Tight", "Helvetica Neue", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    radius: 2,
    radiusCard: 3,
  },
};

window.THEMES = THEMES;
