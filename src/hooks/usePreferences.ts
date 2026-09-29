import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PREFERENCES, type Preferences } from '../types/settings';
import { useMediaQuery } from './useMediaQuery';

const KEY = 'mde:preferences';

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    const out = { ...DEFAULT_PREFERENCES };
    for (const key of Object.keys(DEFAULT_PREFERENCES) as Array<keyof Preferences>) {
      if (typeof parsed[key] === typeof DEFAULT_PREFERENCES[key]) (out as Record<string, unknown>)[key] = parsed[key];
    }
    return out;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(load);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isDark = preferences.uiTheme === 'dark' || (preferences.uiTheme === 'system' && systemDark);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(preferences));
    } catch {
      // Preferences are best-effort when storage is unavailable.
    }
  }, [preferences]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const update = useCallback((patch: Partial<Preferences>) => setPreferences((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setPreferences(DEFAULT_PREFERENCES), []);

  return { preferences, update, reset, isDark };
}
