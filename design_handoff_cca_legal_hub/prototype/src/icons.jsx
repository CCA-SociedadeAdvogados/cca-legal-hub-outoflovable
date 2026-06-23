// Icons — simple stroked SVG set
const Icon = ({ name, size = 16, color = 'currentColor' }) => {
  const s = { width: size, height: size, stroke: color, fill: 'none', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const P = {
    home: 'M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V10z',
    bell: 'M6 8a6 6 0 1 1 12 0v5l2 3H4l2-3V8zM10 19a2 2 0 0 0 4 0',
    wallet: 'M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7V5a2 2 0 0 1 2-2h11v4M16 13h3',
    chart: 'M4 20V4M4 20h16M8 16V10M12 16V6M16 16v-8M20 16v-4',
    doc: 'M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M8 12h8M8 16h8M8 8h3',
    folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
    news: 'M4 5h13a2 2 0 0 1 2 2v11a2 2 0 0 0 2-2V6H7M4 5v13a2 2 0 0 0 2 2h10V7a2 2 0 0 0-2-2H4zM8 10h5M8 14h5',
    shield: 'M12 3l8 3v6c0 4.5-3.3 8.5-8 10-4.7-1.5-8-5.5-8-10V6l8-3z',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 10h5M10 14h4M12 7v10',
    book: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4zM5 20a3 3 0 0 1 3-3h10',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M17 11a3 3 0 0 0 0-6M23 21v-1a4 4 0 0 0-4-4h-1',
    building: 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-4h4v4',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
    gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M18 18h2M14 4v4M6 10v4M14 16v4',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    collapse: 'M9 4v16M15 4v16M6 8l-3 4 3 4',
    search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3',
    plus: 'M12 5v14M5 12h14',
    arrow: 'M5 12h14M13 5l7 7-7 7',
    chevron: 'M9 6l6 6-6 6',
    lock: 'M6 11h12v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9zM8 11V8a4 4 0 0 1 8 0v3',
    dot: 'M12 12h.01',
    sparkle: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
    check: 'M4 12l5 5L20 6',
    bell_s: 'M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3V8zM10 19a2 2 0 0 0 4 0',
    external: 'M14 5h5v5M19 5l-8 8M5 5h6M5 5v14h14v-6',
    calendar: 'M7 3v3M17 3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    filter: 'M3 5h18M6 12h12M10 19h4',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  };
  return (
    <svg viewBox="0 0 24 24" style={{ ...s, flexShrink: 0 }}>
      <path d={P[name] || P.dot} />
    </svg>
  );
};
window.Icon = Icon;
