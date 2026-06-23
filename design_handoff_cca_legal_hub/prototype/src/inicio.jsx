// Início — the main dashboard screen

// Time-aware greeting + long date (PT-PT)
window.ccaGreeting = () => {
  const h = new Date().getHours();
  if (h < 13) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
};
window.ccaDateLong = () => {
  try {
    const s = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (e) { return 'Início'; }
};

const UI = {};

UI.Eyebrow = ({ theme, children }) => (
  <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: theme.inkMute, fontWeight: 500, fontFamily: theme.sans, display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ width: 16, height: 1, background: theme.accent }}/>
    {children}
  </div>
);

UI.Card = ({ theme, children, style, ...rest }) => (
  <div {...rest} style={{
    background: theme.surface, border: `1px solid ${theme.line}`,
    borderRadius: theme.radiusCard,
    boxShadow: '0 1px 2px rgba(43,22,11,0.04), 0 8px 20px -10px rgba(43,22,11,0.07)',
    ...style,
  }}>{children}</div>
);

UI.SectionLabel = ({ theme, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '44px 0 0' }}>
    <span style={{ fontFamily: theme.sans, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.inkMute, fontWeight: 500 }}>{children}</span>
    <span style={{ flex: 1, height: 1, background: theme.lineSoft }}/>
  </div>
);

UI.CardHeader = ({ theme, title, action, icon }) => (
  <div style={{
    padding: '18px 22px', borderBottom: `1px solid ${theme.lineSoft}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && <Icon name={icon} size={15} color={theme.accent}/>}
      <h3 style={{ fontFamily: theme.display, fontSize: 19, fontWeight: 500, color: theme.ink, margin: 0, letterSpacing: '-0.005em' }}>{title}</h3>
    </div>
    {action && <span style={{ fontFamily: theme.sans, fontSize: 11, color: theme.accent, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer' }}>{action} →</span>}
  </div>
);

UI.Pill = ({ theme, tone = 'default', children }) => {
  const tones = {
    default: { bg: 'transparent', fg: theme.inkSoft, border: theme.line },
    active: { bg: `${theme.positive}18`, fg: theme.positive, border: theme.positive },
    warn: { bg: `${theme.warn}18`, fg: theme.warn, border: theme.warn },
    accent: { bg: theme.accentSoft, fg: theme.accent, border: theme.accent },
  };
  const t = tones[tone] || tones.default;
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', fontFamily: theme.sans, fontSize: 11, fontWeight: 500,
    color: t.fg, background: t.bg, border: `1px solid ${t.border}`,
    borderRadius: 100, letterSpacing: '0.04em',
  }}>{children}</span>;
};

const Inicio = ({ theme }) => {
  return (
    <div className="dash-enter" style={{ padding: '28px 32px 64px', maxWidth: 1520 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <UI.Eyebrow theme={theme}>{window.ccaDateLong()}</UI.Eyebrow>
          <h1 style={{
            fontFamily: theme.display, fontSize: 40, fontWeight: 400,
            color: theme.ink, margin: '14px 0 8px', letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            {window.ccaGreeting()}, <em style={{ color: theme.accent }}>André</em>.
          </h1>
          <p style={{ fontFamily: theme.serif, fontSize: 17, color: theme.inkSoft, margin: 0, fontStyle: 'italic' }}>
            A sua área de gestão jurídica — contratos, documentos e obrigações num só lugar.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: theme.surface, border: `1px solid ${theme.line}`, borderRadius: theme.radiusCard, boxShadow: '0 1px 2px rgba(43,22,11,0.04)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme.positive }}/>
          <span style={{ fontFamily: theme.sans, fontSize: 12, color: theme.inkSoft }}>
            Última sessão: <span style={{ color: theme.ink, fontWeight: 500 }}>hoje, 08:42</span>
          </span>
        </div>
      </div>

      {/* Welcome banner — the hero moment */}
      <WelcomeBanner theme={theme}/>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 28 }}>
        {window.CCA.KPIS.map((k, i) => <KPI key={i} theme={theme} kpi={k}/>)}
      </div>

      {/* Main grid */}
      <UI.SectionLabel theme={theme}>A sua carteira</UI.SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginTop: 16 }}>
        <ContractsCard theme={theme}/>
        <OrgCard theme={theme}/>
      </div>

      <UI.SectionLabel theme={theme}>Conhecimento &amp; novidades</UI.SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 16 }}>
        <DocumentsCard theme={theme}/>
        <InsightsCard theme={theme}/>
        <NewsCard theme={theme}/>
      </div>

      <UI.SectionLabel theme={theme}>Atividade &amp; atalhos</UI.SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginTop: 16 }}>
        <ActivityCard theme={theme}/>
        <QuickActions theme={theme}/>
      </div>
    </div>
  );
};

const WelcomeBanner = ({ theme }) => (
  <div style={{
    position: 'relative', overflow: 'hidden',
    background: `linear-gradient(110deg, ${theme.bgAlt} 0%, ${theme.surface} 100%)`,
    border: `1px solid ${theme.line}`,
    borderRadius: theme.radiusCard,
    padding: '32px 36px',
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center',
  }}>
    {/* Ornament */}
    <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -30, top: -40, width: 260, height: 260, opacity: 0.08, pointerEvents: 'none' }}>
      <circle cx="100" cy="100" r="98" fill="none" stroke={theme.accent} strokeWidth="0.5"/>
      <circle cx="100" cy="100" r="78" fill="none" stroke={theme.accent} strokeWidth="0.5"/>
      <circle cx="100" cy="100" r="58" fill="none" stroke={theme.accent} strokeWidth="0.5"/>
      <text x="100" y="110" textAnchor="middle" fontFamily={theme.display} fontSize="52" fill={theme.accent}>CCA</text>
    </svg>
    <div style={{ position: 'relative', maxWidth: 720 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: theme.accent, fontWeight: 500, marginBottom: 10 }}>
        ✦ Resumo do dia
      </div>
      <h2 style={{ fontFamily: theme.display, fontSize: 26, fontWeight: 500, color: theme.ink, margin: '0 0 10px', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
        Tem <span style={{ color: theme.accent }}>3 contratos</span> a expirar nos próximos 30 dias e <span style={{ color: theme.accent }}>5 novos documentos</span> à sua espera.
      </h2>
      <p style={{ fontFamily: theme.sans, fontSize: 13.5, color: theme.inkSoft, margin: 0, lineHeight: 1.55 }}>
        Utilize o menu lateral para navegar entre secções e gerir contratos, documentos e obrigações legais.
      </p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
      <GoldButton theme={theme}>Rever contratos</GoldButton>
      <GhostButton theme={theme}>Ver agenda</GhostButton>
    </div>
  </div>
);

const GoldButton = ({ theme, children, onClick }) => (
  <button onClick={onClick} style={{
    padding: '11px 22px', background: theme.accent,
    color: theme.id === 'obsidian' ? '#0E0E10' : '#FBF8F1',
    border: 'none', borderRadius: theme.radius,
    fontFamily: theme.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center',
    whiteSpace: 'nowrap',
  }}>{children} <Icon name="arrow" size={13}/></button>
);

const GhostButton = ({ theme, children, onClick }) => (
  <button onClick={onClick} style={{
    padding: '11px 22px', background: 'transparent',
    color: theme.ink, border: `1px solid ${theme.line}`, borderRadius: theme.radius,
    fontFamily: theme.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center',
    whiteSpace: 'nowrap',
  }}>{children}</button>
);

const KPI = ({ theme, kpi }) => {
  const [h, setH] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: theme.surface, border: `1px solid ${h ? theme.accent : theme.line}`,
        borderRadius: theme.radiusCard, padding: '20px 22px 22px',
        position: 'relative', overflow: 'hidden', cursor: 'default',
        transform: h ? 'translateY(-3px)' : 'none',
        boxShadow: h
          ? '0 2px 4px rgba(43,22,11,0.05), 0 16px 30px -12px rgba(43,22,11,0.14)'
          : '0 1px 2px rgba(43,22,11,0.04), 0 8px 20px -10px rgba(43,22,11,0.07)',
        transition: 'transform 200ms cubic-bezier(.2,.7,.2,1), box-shadow 200ms, border-color 200ms',
      }}>
      {/* top accent rule */}
      <span style={{
        position: 'absolute', top: 0, left: 0, height: 2,
        width: h ? '100%' : '28px', background: theme.accent,
        transition: 'width 260ms cubic-bezier(.2,.7,.2,1)',
      }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.inkMute, fontWeight: 500, fontFamily: theme.sans }}>
          {kpi.label}
        </div>
        <UI.Pill theme={theme} tone={kpi.trend === 'up' ? 'active' : kpi.trend === 'warn' ? 'warn' : 'default'}>
          {kpi.delta}
        </UI.Pill>
      </div>
      <div style={{ fontFamily: theme.display, fontSize: 38, fontWeight: 400, color: theme.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {kpi.value}
      </div>
    </div>
  );
};

const ContractsCard = ({ theme }) => (
  <UI.Card theme={theme}>
    <UI.CardHeader theme={theme} title="Contratos Recentes" icon="doc" action="Ver todos"/>
    <div>
      {window.CCA.CONTRACTS.slice(0, 4).map((c, i) => <ContractRow key={c.id} theme={theme} c={c} last={i === 3}/>)}
    </div>
  </UI.Card>
);

const ContractRow = ({ theme, c, last }) => {
  const [h, setH] = React.useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      padding: '16px 22px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
      alignItems: 'center',
      borderBottom: last ? 'none' : `1px solid ${theme.lineSoft}`,
      background: h ? theme.bgAlt : 'transparent', cursor: 'pointer', transition: 'background 140ms',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: theme.display, fontSize: 15, color: theme.ink, fontWeight: 500, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.005em' }}>
          {c.title}
        </div>
        <div style={{ fontSize: 12, color: theme.inkMute, fontFamily: theme.sans }}>{c.vendor}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: theme.mono, fontSize: 11.5, color: theme.inkSoft }}>{c.renews}</div>
        <div style={{ fontFamily: theme.display, fontSize: 13, color: theme.ink, fontWeight: 500, marginTop: 2 }}>{c.value}</div>
      </div>
      <UI.Pill theme={theme} tone={c.status === 'Activo' ? 'active' : 'warn'}>{c.status}</UI.Pill>
    </div>
  );
};

const OrgCard = ({ theme }) => (
  <UI.Card theme={theme} style={{ padding: 0 }}>
    <UI.CardHeader theme={theme} title="A Nossa Organização" icon="building"/>
    <div style={{ padding: '24px 22px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: theme.radius,
          background: theme.ink, color: theme.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: theme.display, fontSize: 18, fontWeight: 500, letterSpacing: '0.04em',
        }}>CCA</div>
        <div>
          <div style={{ fontFamily: theme.display, fontSize: 18, color: theme.ink, fontWeight: 500 }}>CCA</div>
          <div style={{ fontSize: 12, color: theme.inkMute, marginTop: 2 }}>Sociedade de Advogados · Lisboa</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '16px 0', borderTop: `1px solid ${theme.lineSoft}`, borderBottom: `1px solid ${theme.lineSoft}` }}>
        <Stat theme={theme} label="Advogados" value="28"/>
        <Stat theme={theme} label="Utilizadores" value="14"/>
        <Stat theme={theme} label="Clientes" value="42"/>
        <Stat theme={theme} label="Áreas" value="9"/>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: theme.inkMute, fontFamily: theme.sans, lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span>Advogado associado</span>
          <span style={{ color: theme.ink }}>Dra. Helena Cunha</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span>Plano</span>
          <span style={{ color: theme.accent }}>Enterprise</span>
        </div>
      </div>
    </div>
  </UI.Card>
);

const Stat = ({ theme, label, value }) => (
  <div>
    <div style={{ fontFamily: theme.display, fontSize: 24, color: theme.ink, fontWeight: 400, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: theme.inkMute, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 6, fontWeight: 500 }}>{label}</div>
  </div>
);

const DocumentsCard = ({ theme }) => (
  <UI.Card theme={theme}>
    <UI.CardHeader theme={theme} title="Documentos Recentes" icon="folder" action="Ver"/>
    <div>
      {window.CCA.DOCUMENTS.slice(0, 4).map((d, i) => (
        <div key={d.id} style={{
          padding: '14px 22px', borderBottom: i === 3 ? 'none' : `1px solid ${theme.lineSoft}`,
          cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{
            width: 32, height: 36, border: `1px solid ${theme.line}`, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: theme.bgAlt, flexShrink: 0,
          }}><Icon name="doc" size={14} color={theme.accent}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: theme.sans, fontSize: 13, color: theme.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
            <div style={{ fontSize: 11, color: theme.inkMute, marginTop: 2 }}>{d.folder} · {d.updated}</div>
          </div>
        </div>
      ))}
    </div>
  </UI.Card>
);

const InsightsCard = ({ theme }) => {
  const feat = window.CCA.INSIGHTS[0];
  return (
    <UI.Card theme={theme}>
      <UI.CardHeader theme={theme} title="Legal Insights" icon="spark" action="Explorar"/>
      <div style={{ padding: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <UI.Pill theme={theme} tone="accent">{feat.cat}</UI.Pill>
        </div>
        <div style={{ fontFamily: theme.display, fontSize: 19, color: theme.ink, fontWeight: 500, lineHeight: 1.25, letterSpacing: '-0.005em' }}>
          {feat.title}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${theme.lineSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.inkMute, letterSpacing: '0.08em' }}>
          <span>{feat.date}</span>
          <span>{feat.read} leitura</span>
        </div>
      </div>
    </UI.Card>
  );
};

const NewsCard = ({ theme }) => (
  <UI.Card theme={theme}>
    <UI.CardHeader theme={theme} title="Novidades CCA" icon="news" action="Ver"/>
    <div>
      {window.CCA.NEWS_CCA.map((n, i) => (
        <div key={i} style={{
          padding: '14px 22px', borderBottom: i === window.CCA.NEWS_CCA.length - 1 ? 'none' : `1px solid ${theme.lineSoft}`,
          display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer',
        }}>
          <div style={{
            minWidth: 46, padding: '6px 4px', border: `1px solid ${theme.line}`, borderRadius: 2,
            textAlign: 'center', background: theme.bgAlt,
          }}>
            <div style={{ fontFamily: theme.display, fontSize: 14, color: theme.ink, fontWeight: 500, lineHeight: 1 }}>{n.date.split(' ')[0]}</div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.accent, marginTop: 3, fontWeight: 500 }}>{n.date.split(' ')[1]}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: theme.sans, fontSize: 13, color: theme.ink, fontWeight: 500, lineHeight: 1.35 }}>{n.title}</div>
            <div style={{ marginTop: 6 }}><UI.Pill theme={theme} tone="accent">{n.tag}</UI.Pill></div>
          </div>
        </div>
      ))}
    </div>
  </UI.Card>
);

const ActivityCard = ({ theme }) => (
  <UI.Card theme={theme}>
    <UI.CardHeader theme={theme} title="Actividade Recente" icon="chart"/>
    <div style={{ padding: '8px 22px 14px' }}>
      {window.CCA.RECENT_ACTIVITY.map((a, i) => (
        <div key={i} style={{
          display: 'flex', gap: 14, alignItems: 'flex-start',
          padding: '14px 0',
          borderBottom: i === window.CCA.RECENT_ACTIVITY.length - 1 ? 'none' : `1px solid ${theme.lineSoft}`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: theme.bgAlt,
            border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.accent, flexShrink: 0,
          }}>
            <Icon name={a.type === 'doc' ? 'doc' : a.type === 'contract' ? 'check' : a.type === 'message' ? 'bell' : 'spark'} size={13}/>
          </div>
          <div style={{ flex: 1, fontFamily: theme.sans, fontSize: 13, color: theme.inkSoft, lineHeight: 1.5 }}>
            <span style={{ color: theme.ink, fontWeight: 500 }}>{a.who}</span> {a.what}{' '}
            <span style={{ color: theme.ink, fontStyle: 'italic', fontFamily: theme.serif }}>"{a.obj}"</span>
            <span style={{ color: theme.inkMute, marginLeft: 8, fontSize: 11 }}>· {a.when}</span>
          </div>
        </div>
      ))}
    </div>
  </UI.Card>
);

const QuickActions = ({ theme }) => {
  const actions = [
    { icon: 'doc', label: 'Contratos' },
    { icon: 'folder', label: 'Documentos' },
    { icon: 'calendar', label: 'Eventos' },
    { icon: 'shield', label: 'Normativos' },
  ];
  return (
    <UI.Card theme={theme}>
      <UI.CardHeader theme={theme} title="Atalhos Rápidos" icon="sparkle"/>
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {actions.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: theme.bgAlt, border: `1px solid ${theme.lineSoft}`,
            borderRadius: theme.radius, cursor: 'pointer',
            transition: 'all 140ms',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.background = theme.surface; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.lineSoft; e.currentTarget.style.background = theme.bgAlt; }}>
            <Icon name={a.icon} size={16} color={theme.accent}/>
            <span style={{ fontFamily: theme.sans, fontSize: 13, color: theme.ink, fontWeight: 500 }}>{a.label}</span>
          </div>
        ))}
      </div>
    </UI.Card>
  );
};

window.Inicio = Inicio;
window.UI = UI;
window.GoldButton = GoldButton;
window.GhostButton = GhostButton;
