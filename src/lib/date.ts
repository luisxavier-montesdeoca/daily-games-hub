import { useEffect, useState } from 'react';

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local date (midnight). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add n calendar days to a YYYY-MM-DD date (DST-safe: works on calendar fields, not milliseconds). */
export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Today's local date; re-renders at local midnight and when the tab regains focus. */
export function useToday(): string {
  const [today, setToday] = useState(localDate);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(localDate()), midnight.getTime() - now.getTime() + 1000);
    // Timers can be throttled in background tabs; re-check on focus too.
    const onFocus = () => setToday(localDate());
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [today]);

  return today;
}
