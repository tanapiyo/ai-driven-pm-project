'use client';

/**
 * @layer shared
 * @segment providers
 * @what テーマ管理プロバイダー - ダーク/ライト/システムモードの切り替えと永続化
 */

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'app:theme';
const validThemes: Theme[] = ['light', 'dark', 'system'];

function isValidTheme(value: string | null): value is Theme {
  return value !== null && validThemes.includes(value as Theme);
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(defaultTheme)
  );
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isValidTheme(stored)) {
        setThemeState(stored);
        const resolved = resolveTheme(stored);
        setResolvedTheme(resolved);
        applyTheme(resolved);
      } else {
        // Apply default theme
        const resolved = resolveTheme(defaultTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    } catch {
      // localStorage might be unavailable (private browsing)
      const resolved = resolveTheme(defaultTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
  }, [defaultTheme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      applyTheme(newResolvedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (!isValidTheme(newTheme)) return;

      setThemeState(newTheme);
      const resolved = resolveTheme(newTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);

      if (mounted) {
        try {
          localStorage.setItem(STORAGE_KEY, newTheme);
        } catch {
          // localStorage might be unavailable
        }
      }
    },
    [mounted]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
