// App root with Tweaks panel

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "ambar",
  "screen": "inicio",
  "collapsed": false
}/*EDITMODE-END*/;

const App = () => {
  const [t, setT] = useState(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useState(false);
  const theme = window.THEMES[t.theme] || window.THEMES.ambar;

  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || !e.data.type) return;
      if (e.data.type === '__activate_edit_mode') setEditMode(true);
      if (e.data.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setKey = (k, v) => {
    setT(prev => {
      const next = { ...prev, [k]: v };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  const [collapsed, setCollapsed] = useState(t.collapsed);
  useEffect(() => setCollapsed(t.collapsed), [t.collapsed]);

  const Screen = {
    inicio: window.Inicio,
    contratos: window.Screens.Contratos,
    documentos: window.Screens.Documentos,
    insights: window.Screens.LegalInsights,
    legalbi: window.Screens.LegalBI,
    notificacoes: window.Inicio,
    conta: window.Inicio,
    novidades: window.Inicio,
    politicas: window.Inicio,
    utilizadores: window.Inicio,
    organizacao: window.Inicio,
  }[t.screen] || window.Inicio;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg, color: theme.ink, fontFamily: theme.sans }}>
      <window.Shell.Sidebar theme={theme} active={t.screen} setActive={(s) => setKey('screen', s)}
        collapsed={collapsed} setCollapsed={(c) => setKey('collapsed', c)}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <window.Shell.Topbar theme={theme} client="Grupo Aurora, SGPS"/>
        <main><Screen theme={theme}/></main>
      </div>
      {editMode && <TweaksPanel theme={theme} t={t} setKey={setKey}/>}
    </div>
  );
};

const TweaksPanel = ({ theme, t, setKey }) => {
  const themes = Object.values(window.THEMES);
  const screens = [
    { id: 'inicio', label: 'Início' },
    { id: 'legalbi', label: 'LegalBI' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'insights', label: 'Insights' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000, width: 280,
      background: '#0E0E10', color: '#ECE6D9', border: '1px solid #28272A',
      borderRadius: 10, padding: 18, fontFamily: 'Inter Tight, sans-serif',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#D4B77A', fontWeight: 500, marginBottom: 14 }}>Tweaks</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#B5B0A5', marginBottom: 8 }}>Direção visual</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {themes.map(th => (
            <button key={th.id} onClick={() => setKey('theme', th.id)} style={{
              padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
              background: t.theme === th.id ? '#D4B77A' : 'transparent',
              color: t.theme === th.id ? '#0E0E10' : '#ECE6D9',
              border: `1px solid ${t.theme === th.id ? '#D4B77A' : '#28272A'}`,
              borderRadius: 6, fontFamily: 'inherit', fontSize: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
            }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{th.name}</span>
              <span style={{ opacity: 0.7, fontSize: 10.5 }}>{th.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#B5B0A5', marginBottom: 8 }}>Ecrã</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {screens.map(s => (
            <button key={s.id} onClick={() => setKey('screen', s.id)} style={{
              padding: '8px 10px', cursor: 'pointer',
              background: t.screen === s.id ? '#D4B77A' : 'transparent',
              color: t.screen === s.id ? '#0E0E10' : '#ECE6D9',
              border: `1px solid ${t.screen === s.id ? '#D4B77A' : '#28272A'}`,
              borderRadius: 6, fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
            }}>{s.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
