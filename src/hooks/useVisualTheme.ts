import { useCallback, useEffect, useState } from 'react';

export type VisualTheme = 'indigo' | 'ardosia' | 'ameixa';

const STORAGE_KEY = 'cca-visual-theme';
const DEFAULT: VisualTheme = 'indigo';

export const VISUAL_THEMES = [
  {
    id: 'indigo' as const,
    name: 'Índigo & Argila',
    tagline: 'Índigo profundo · porcelana · terracota-coral',
    swatch: { bg: '#F4F5F7', sidebar: '#161B2B', accent: '#C75B45' },
  },
  {
    id: 'ardosia' as const,
    name: 'Ardósia & Sálvia',
    tagline: 'Ardósia · papel quente · verde-sálvia',
    swatch: { bg: '#F6F5F1', sidebar: '#1C2529', accent: '#4F7A69' },
  },
  {
    id: 'ameixa' as const,
    name: 'Ameixa & Névoa',
    tagline: 'Ameixa · névoa · violeta sóbrio',
    swatch: { bg: '#F3F2F4', sidebar: '#241A2E', accent: '#6E5AA6' },
  },
];

function readStored(): VisualTheme {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'ardosia' || v === 'ameixa' ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function applyToRoot(theme: VisualTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === DEFAULT) {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/** Apply the stored theme as early as possible (called from main.tsx before render). */
export function bootstrapVisualTheme() {
  applyToRoot(readStored());
}

/**
 * Manage the visual theme (Âmbar / Terracota / Cobre).
 * Persists in localStorage and toggles `data-theme` on `<html>`.
 * Orthogonal to next-themes (which handles light/dark via `class`).
 */
export function useVisualTheme() {
  const [theme, setThemeState] = useState<VisualTheme>(readStored);

  useEffect(() => {
    applyToRoot(theme);
  }, [theme]);

  const setTheme = useCallback((next: VisualTheme) => {
    setThemeState(next);
    try {
      if (next === DEFAULT) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // localStorage unavailable — apply still works in-memory
    }
  }, []);

  return { theme, setTheme, themes: VISUAL_THEMES };
}
