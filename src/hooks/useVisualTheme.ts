import { useCallback, useEffect, useState } from 'react';

export type VisualTheme = 'ambar' | 'terracota' | 'cobre';

const STORAGE_KEY = 'cca-visual-theme';
const DEFAULT: VisualTheme = 'ambar';

export const VISUAL_THEMES = [
  {
    id: 'ambar' as const,
    name: 'Âmbar',
    tagline: 'Marfim · preto · laranja em acentos',
    swatch: { bg: '#FAF7F1', sidebar: '#0D0B09', accent: '#BD4E18' },
  },
  {
    id: 'terracota' as const,
    name: 'Terracota',
    tagline: 'Creme quente · laranja queimado',
    swatch: { bg: '#F6F0E6', sidebar: '#1F1612', accent: '#B85022' },
  },
  {
    id: 'cobre' as const,
    name: 'Cobre',
    tagline: 'Monocromia quente',
    swatch: { bg: '#FBF4EA', sidebar: '#2A160B', accent: '#B85018' },
  },
];

function readStored(): VisualTheme {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'terracota' || v === 'cobre' ? v : DEFAULT;
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
