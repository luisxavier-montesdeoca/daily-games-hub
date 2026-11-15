import { useSyncExternalStore } from 'react';

/** 'system' follows the OS setting. Stored in localStorage (absent = system). */
export type ThemePref = 'system' | 'light' | 'dark';

const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem('theme');
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let pref = readPref();

function apply() {
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  listeners.forEach((l) => l());
}

media.addEventListener('change', () => pref === 'system' && apply());

export function setThemePref(next: ThemePref) {
  pref = next;
  try {
    if (next === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', next);
  } catch {
    /* storage unavailable */
  }
  apply();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Current preference and whether dark mode is in effect. */
export function useTheme(): { pref: ThemePref; dark: boolean } {
  const p = useSyncExternalStore(subscribe, () => pref);
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'));
  return { pref: p, dark };
}
