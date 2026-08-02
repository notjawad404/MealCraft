import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mealcraft-theme';


const readInitial = () =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

export default function useTheme() {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );

  return { theme, toggle };
}
