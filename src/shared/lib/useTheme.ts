/**
 * Theme hook — shared between Board, HomeScreen, etc.
 * Stores preference in a cookie.
 */

import { useState, useEffect, useCallback } from 'react';

function getThemeCookie(): 'dark' | 'light' {
  const match = document.cookie.match(/(?:^|; )bg-theme=(dark|light)/);
  return (match?.[1] as 'dark' | 'light') || 'light';
}

function setThemeCookie(theme: 'dark' | 'light') {
  document.cookie = `bg-theme=${theme};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getThemeCookie);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    setThemeCookie(theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggle };
}
