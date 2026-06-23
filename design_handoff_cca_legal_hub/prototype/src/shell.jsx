// Shell: sidebar + topbar + main area. Theme-driven.

const Monogram = ({ theme, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect x="1" y="1" width="38" height="38" rx={theme.radius} fill="none" stroke={theme.sidebarActive} strokeWidth="1"/>
    <text x="20" y="26" textAnchor="middle" fontFamily={theme.display} fontSize="15" fontWeight="500" fill={theme.sidebarActive} letterSpacing="0.5">CCA</text>
  </svg>
);

const Sidebar = ({ theme, active, setActive, collapsed, setCollapsed }) => {
  const W = collapsed ? 64 : 244;
  return (
    <aside style={{
      width: W, flexShrink: 0,
      background: theme.sidebar, color: theme.sidebarInk,
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      transition: 'width 220ms ease',
      fontFamily: theme.sans,
    }}>
      {/* brand */}
      <div style={{ padding: collapsed ? '20px 12px' : '20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Monogram theme={theme}/>
        {!collapsed && <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontFamily: theme.display, fontSize: 16, fontWeight: 500, color: theme.sidebarInk, letterSpacing: '0.01em' }}>Legal Hub</div>
          <div style={{ fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.sidebarInkMute, marginTop: 3 }}>by CCA</div>
        </div>}
      </div>

      {!collapsed && <div style={{ padding: '14px 18px', borderTop: `1px solid ${theme.sidebarInkMute}22`, borderBottom: `1px solid ${theme.sidebarInkMute}22` }}>
        <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: theme.sidebarInkMute, marginBottom: 4 }}>Área reservada</div>
        <div style={{ fontFamily: theme.display, fontSize: 14, color: theme.sidebarInk }}>CCA · Sociedade de Advogados</div>
      </div>}

      <nav style={{ flex: 1, overflow: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {window.CCA.NAV.map(item => (
          <NavItem key={item.id} theme={theme} item={item} active={active === item.id} collapsed={collapsed}
            onClick={() => !item.locked && setActive(item.id)}/>
        ))}
      </nav>

      <div style={{ borderTop: `1px solid ${theme.sidebarInkMute}22`, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {window.CCA.NAV_SECONDARY.map(item => (
          <NavItem key={item.id} theme={theme} item={item} collapsed={collapsed} secondary
            onClick={() => item.id === 'collapse' && setCollapsed(!collapsed)}/>
        ))}
      </div>
    </aside>
  );
};

const NavItem = ({ theme, item, active, collapsed, onClick, secondary }) => {
  const [hover, setHover] = React.useState(false);
  const dim = item.locked;
  const showActive = active;
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: collapsed ? '10px 12px' : '9px 14px',
        cursor: dim ? 'not-allowed' : 'pointer',
        background: showActive ? theme.sidebarActive : (hover && !dim ? `${theme.sidebarInkMute}15` : 'transparent'),
        color: showActive ? theme.sidebarActiveInk : (dim ? `${theme.sidebarInkMute}99` : (secondary ? theme.sidebarInkMute : theme.sidebarInk)),
        borderRadius: theme.radius,
        fontSize: 13, fontWeight: showActive ? 500 : 400,
        transition: 'all 140ms',
        position: 'relative',
      }}>
      <Icon name={item.icon} size={17} color="currentColor"/>
      {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
      {!collapsed && item.locked && <Icon name="lock" size={12}/>}
      {!collapsed && item.chevron && <Icon name="chevron" size={12}/>}
    </div>
  );
};

const Topbar = ({ theme, client, setClient }) => (
  <header style={{
    height: 60, borderBottom: `1px solid ${theme.line}`, background: theme.bg,
    display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px',
    position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(8px)',
  }}>
    {/* search */}
    <div style={{
      flex: 1, maxWidth: 440, display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', background: theme.surface,
      border: `1px solid ${theme.line}`, borderRadius: theme.radius,
    }}>
      <Icon name="search" size={15} color={theme.inkMute}/>
      <input placeholder="Pesquisar contratos, políticas, eventos…" style={{
        flex: 1, background: 'transparent', border: 'none', outline: 'none',
        fontFamily: theme.sans, fontSize: 13, color: theme.ink,
      }}/>
      <kbd style={{ fontFamily: theme.mono, fontSize: 10, color: theme.inkMute, padding: '2px 6px', border: `1px solid ${theme.line}`, borderRadius: 3 }}>⌘ K</kbd>
    </div>

    <div style={{ flex: 1 }}/>

    {/* client tab */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 10px',
      border: `1px solid ${theme.line}`, background: theme.surface, borderRadius: theme.radius,
      fontSize: 12, color: theme.inkSoft,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent }}/>
      <span style={{ fontFamily: theme.mono, color: theme.ink, fontWeight: 500 }}>C.0001</span>
      <span style={{ color: theme.inkMute }}>—</span>
      <span>{client}</span>
      <Icon name="chevron" size={12} color={theme.inkMute}/>
    </div>

    {/* selector */}
    <button style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
      background: 'transparent', border: `1px solid ${theme.line}`,
      fontFamily: theme.sans, fontSize: 12, color: theme.ink, cursor: 'pointer',
      borderRadius: theme.radius, fontWeight: 500,
    }}>
      <Icon name="search" size={13}/>
      Seleccionar cliente
    </button>

    {/* icons */}
    <IconBtn theme={theme} icon="sparkle"/>
    <IconBtn theme={theme} icon="bell_s" badge/>

    {/* user */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', background: theme.accent, color: theme.accentSoft.includes('#') ? theme.ink : theme.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: theme.display, fontSize: 14, fontWeight: 500,
        color: theme.id === 'obsidian' ? '#0E0E10' : '#FBF8F1',
      }}>A</div>
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 12.5, color: theme.ink, fontWeight: 500 }}>André Silva</div>
        <div style={{ fontSize: 10.5, color: theme.inkMute }}>asilva@cca.law</div>
      </div>
    </div>
  </header>
);

const IconBtn = ({ theme, icon, badge }) => {
  const [h, setH] = React.useState(false);
  return (
    <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      position: 'relative', width: 36, height: 36, borderRadius: theme.radius,
      border: `1px solid ${h ? theme.accent : theme.line}`, background: h ? theme.surface : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: theme.ink, cursor: 'pointer', transition: 'all 160ms',
    }}>
      <Icon name={icon} size={15}/>
      {badge && <span style={{
        position: 'absolute', top: 7, right: 7, width: 6, height: 6,
        borderRadius: '50%', background: theme.accent,
      }}/>}
    </button>
  );
};

window.Shell = { Sidebar, Topbar, Monogram };
