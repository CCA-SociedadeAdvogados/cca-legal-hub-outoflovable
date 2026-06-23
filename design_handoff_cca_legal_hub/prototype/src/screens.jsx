// Secondary screens: Contratos, Documentos, Insights, LegalBI

const Contratos = ({ theme }) => (
  <div style={{ padding: '28px 32px 64px', maxWidth: 1520 }}>
    <UI.Eyebrow theme={theme}>Meus Contratos</UI.Eyebrow>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, marginBottom: 24 }}>
      <h1 style={{ fontFamily: theme.display, fontSize: 36, fontWeight: 400, color: theme.ink, margin: 0, letterSpacing: '-0.02em' }}>
        Contratos <em style={{ color: theme.accent }}>em vigor</em>
      </h1>
      <div style={{ display: 'flex', gap: 10 }}>
        <GhostButton theme={theme}>Exportar</GhostButton>
        <GoldButton theme={theme}>Novo contrato</GoldButton>
      </div>
    </div>

    {/* Filters */}
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
      {['Todos', 'Activos', 'A expirar', 'Em revisão', 'Arquivados'].map((f, i) => (
        <div key={f} style={{
          padding: '8px 16px', fontSize: 12, fontFamily: theme.sans,
          border: `1px solid ${i === 0 ? theme.accent : theme.line}`,
          background: i === 0 ? theme.accentSoft : 'transparent',
          color: i === 0 ? theme.accent : theme.inkSoft,
          borderRadius: theme.radius, cursor: 'pointer', fontWeight: 500,
        }}>{f}</div>
      ))}
      <div style={{ flex: 1 }}/>
      <div style={{ fontSize: 12, color: theme.inkMute, fontFamily: theme.sans }}>
        23 contratos · <span style={{ color: theme.accent }}>€ 482 K</span> em valor activo
      </div>
    </div>

    {/* Table */}
    <UI.Card theme={theme} style={{ padding: 0 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '90px 2fr 1.2fr 110px 120px 110px 40px',
        gap: 16, padding: '14px 22px', borderBottom: `1px solid ${theme.line}`,
        fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.inkMute, fontWeight: 500,
        background: theme.bgAlt,
      }}>
        <div>Ref.</div><div>Designação</div><div>Contraparte</div><div>Estado</div><div>Renovação</div><div style={{textAlign:'right'}}>Valor</div><div></div>
      </div>
      {window.CCA.CONTRACTS.map((c, i) => (
        <div key={c.id} style={{
          display: 'grid', gridTemplateColumns: '90px 2fr 1.2fr 110px 120px 110px 40px',
          gap: 16, padding: '16px 22px', alignItems: 'center',
          borderBottom: i === window.CCA.CONTRACTS.length - 1 ? 'none' : `1px solid ${theme.lineSoft}`,
          cursor: 'pointer',
        }}>
          <div style={{ fontFamily: theme.mono, fontSize: 11, color: theme.accent }}>{c.id}</div>
          <div style={{ fontFamily: theme.display, fontSize: 14, color: theme.ink, fontWeight: 500, letterSpacing: '-0.005em' }}>{c.title}</div>
          <div style={{ fontSize: 12, color: theme.inkSoft }}>{c.vendor}</div>
          <div><UI.Pill theme={theme} tone={c.status === 'Activo' ? 'active' : 'warn'}>{c.status}</UI.Pill></div>
          <div style={{ fontFamily: theme.mono, fontSize: 11.5, color: theme.inkSoft }}>{c.renews}</div>
          <div style={{ fontFamily: theme.display, fontSize: 14, color: theme.ink, textAlign: 'right', fontWeight: 500 }}>{c.value}</div>
          <Icon name="chevron" size={13} color={theme.inkMute}/>
        </div>
      ))}
    </UI.Card>
  </div>
);

const Documentos = ({ theme }) => (
  <div style={{ padding: '28px 32px 64px', maxWidth: 1520 }}>
    <UI.Eyebrow theme={theme}>Documentos</UI.Eyebrow>
    <h1 style={{ fontFamily: theme.display, fontSize: 36, fontWeight: 400, color: theme.ink, margin: '14px 0 24px', letterSpacing: '-0.02em' }}>
      Biblioteca <em style={{ color: theme.accent }}>documental</em>
    </h1>
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
      {/* Folders */}
      <UI.Card theme={theme} style={{ padding: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.inkMute, marginBottom: 12, fontWeight: 500 }}>Pastas</div>
        {['Todos', 'Corporate', 'Contratos', 'Fiscalidade', 'M&A', 'Compliance', 'Arquivo'].map((f, i) => (
          <div key={f} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
            borderRadius: theme.radius, fontSize: 13,
            background: i === 0 ? theme.accentSoft : 'transparent',
            color: i === 0 ? theme.accent : theme.inkSoft, fontWeight: i === 0 ? 500 : 400,
            cursor: 'pointer', marginBottom: 2,
          }}>
            <Icon name="folder" size={14}/>
            <span style={{ flex: 1 }}>{f}</span>
            <span style={{ fontSize: 11, color: theme.inkMute, fontFamily: theme.mono }}>{i === 0 ? 127 : Math.floor(Math.random()*30)+3}</span>
          </div>
        ))}
      </UI.Card>

      {/* Grid */}
      <UI.Card theme={theme} style={{ padding: 0 }}>
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${theme.line}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="filter" size={14} color={theme.inkMute}/>
          <span style={{ fontSize: 12, color: theme.inkSoft }}>Ordenar por</span>
          <span style={{ fontSize: 12, color: theme.ink, fontWeight: 500 }}>Modificado recentemente</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: theme.inkMute }}>127 documentos</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[...window.CCA.DOCUMENTS, ...window.CCA.DOCUMENTS.slice(0,2)].map((d, i) => (
            <div key={i} style={{
              padding: 18, background: theme.bgAlt, border: `1px solid ${theme.lineSoft}`,
              borderRadius: theme.radius, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 40, border: `1px solid ${theme.line}`, background: theme.surface, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="doc" size={15} color={theme.accent}/>
                </div>
                <UI.Pill theme={theme} tone="accent">{d.folder}</UI.Pill>
              </div>
              <div style={{ fontFamily: theme.display, fontSize: 15, color: theme.ink, fontWeight: 500, marginBottom: 10, lineHeight: 1.3, letterSpacing: '-0.005em' }}>
                {d.title}
              </div>
              <div style={{ fontSize: 11, color: theme.inkMute, display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${theme.lineSoft}` }}>
                <span>{d.author}</span>
                <span>{d.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </UI.Card>
    </div>
  </div>
);

const LegalInsights = ({ theme }) => (
  <div style={{ padding: '28px 32px 64px', maxWidth: 1520 }}>
    <UI.Eyebrow theme={theme}>Legal Insights</UI.Eyebrow>
    <h1 style={{ fontFamily: theme.display, fontSize: 40, fontWeight: 400, color: theme.ink, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
      Análises & <em style={{ color: theme.accent }}>jurisprudência</em>
    </h1>
    <p style={{ fontFamily: theme.serif, fontSize: 16, color: theme.inkSoft, margin: '0 0 32px', fontStyle: 'italic' }}>
      Artigos e pareceres curados pela equipa jurídica CCA.
    </p>

    {/* Featured */}
    <UI.Card theme={theme} style={{ padding: 0, display: 'grid', gridTemplateColumns: '1.2fr 1fr', overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <UI.Pill theme={theme} tone="accent">{window.CCA.INSIGHTS[0].cat} · em destaque</UI.Pill>
        <h2 style={{ fontFamily: theme.display, fontSize: 34, fontWeight: 500, color: theme.ink, margin: '18px 0 14px', lineHeight: 1.1, letterSpacing: '-0.015em' }}>
          {window.CCA.INSIGHTS[0].title}
        </h2>
        <p style={{ fontFamily: theme.serif, fontSize: 15, color: theme.inkSoft, margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
          Uma leitura aprofundada sobre as alterações legislativas e o seu impacto operacional nas estruturas empresariais familiares.
        </p>
        <div style={{ marginTop: 22, display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: theme.inkMute, letterSpacing: '0.08em' }}>
          <span>Por Dra. Helena Cunha</span><span>·</span><span>{window.CCA.INSIGHTS[0].date}</span><span>·</span><span>{window.CCA.INSIGHTS[0].read}</span>
        </div>
      </div>
      <div style={{
        background: `linear-gradient(135deg, ${theme.ink} 0%, ${theme.accent} 100%)`,
        position: 'relative', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox="0 0 200 200" style={{ width: '70%', opacity: 0.5 }}>
          <circle cx="100" cy="100" r="90" fill="none" stroke={theme.surface} strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="70" fill="none" stroke={theme.surface} strokeWidth="0.5"/>
          <text x="100" y="112" textAnchor="middle" fontFamily={theme.display} fontSize="48" fill={theme.surface} opacity="0.9">§</text>
        </svg>
      </div>
    </UI.Card>

    {/* Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
      {window.CCA.INSIGHTS.slice(1).map((art, i) => (
        <UI.Card key={i} theme={theme} style={{ padding: 24, cursor: 'pointer' }}>
          <UI.Pill theme={theme} tone="accent">{art.cat}</UI.Pill>
          <h3 style={{ fontFamily: theme.display, fontSize: 20, fontWeight: 500, color: theme.ink, margin: '16px 0 14px', lineHeight: 1.25, letterSpacing: '-0.005em' }}>
            {art.title}
          </h3>
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${theme.lineSoft}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.inkMute, letterSpacing: '0.08em' }}>
            <span>{art.date}</span><span>{art.read}</span>
          </div>
        </UI.Card>
      ))}
    </div>
  </div>
);

const LegalBI = ({ theme }) => (
  <div style={{ padding: '28px 32px 64px', maxWidth: 1520 }}>
    <UI.Eyebrow theme={theme}>LegalBI</UI.Eyebrow>
    <h1 style={{ fontFamily: theme.display, fontSize: 36, fontWeight: 400, color: theme.ink, margin: '14px 0 24px', letterSpacing: '-0.02em' }}>
      Indicadores <em style={{ color: theme.accent }}>jurídicos</em>
    </h1>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
      {window.CCA.KPIS.map((k, i) => <KPIBig key={i} theme={theme} kpi={k}/>)}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <UI.Card theme={theme}>
        <UI.CardHeader theme={theme} title="Valor contratual por trimestre" icon="chart"/>
        <div style={{ padding: 24, height: 280 }}>
          <BarChart theme={theme}/>
        </div>
      </UI.Card>
      <UI.Card theme={theme}>
        <UI.CardHeader theme={theme} title="Distribuição por área" icon="spark"/>
        <div style={{ padding: 24 }}>
          {[
            { label: 'Fiscalidade', pct: 32 },
            { label: 'M&A', pct: 24 },
            { label: 'Corporate', pct: 18 },
            { label: 'Regulatório', pct: 14 },
            { label: 'Laboral', pct: 8 },
            { label: 'Outros', pct: 4 },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontFamily: theme.sans }}>
                <span style={{ color: theme.ink, fontWeight: 500 }}>{row.label}</span>
                <span style={{ color: theme.inkMute, fontFamily: theme.mono }}>{row.pct}%</span>
              </div>
              <div style={{ height: 4, background: theme.bgAlt, borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: theme.accent }}/>
              </div>
            </div>
          ))}
        </div>
      </UI.Card>
    </div>
  </div>
);

const KPIBig = ({ theme, kpi }) => (
  <UI.Card theme={theme} style={{ padding: 26 }}>
    <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.inkMute, fontWeight: 500, marginBottom: 14 }}>{kpi.label}</div>
    <div style={{ fontFamily: theme.display, fontSize: 44, fontWeight: 400, color: theme.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{kpi.value}</div>
    <div style={{ marginTop: 12 }}>
      <UI.Pill theme={theme} tone={kpi.trend === 'up' ? 'active' : kpi.trend === 'warn' ? 'warn' : 'default'}>{kpi.delta}</UI.Pill>
    </div>
  </UI.Card>
);

const BarChart = ({ theme }) => {
  const data = [62, 78, 54, 88, 94, 72, 108, 124];
  const labels = ['Q1/24', 'Q2/24', 'Q3/24', 'Q4/24', 'Q1/25', 'Q2/25', 'Q3/25', 'Q4/25'];
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: '100%', paddingBottom: 24, position: 'relative' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{
              width: '100%', height: `${(v/max)*100}%`,
              background: i === data.length - 1 ? theme.accent : theme.inkSoft, opacity: i === data.length - 1 ? 1 : 0.4,
              borderRadius: 2,
            }}/>
          </div>
          <div style={{ fontFamily: theme.mono, fontSize: 9.5, color: theme.inkMute, letterSpacing: '0.08em' }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
};

window.Screens = { Contratos, Documentos, LegalInsights, LegalBI };
