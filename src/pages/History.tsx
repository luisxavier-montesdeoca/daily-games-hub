import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEnabledGames, useResultsBetween } from '../db';
import { localDate, parseLocalDate, useToday } from '../lib/date';
import { formatResult } from '../lib/format';
import ResultDialog from '../components/ResultDialog';
import type { Game, Result } from '../types';

/** Sequential single-hue ramp (light → dark) for "share of games played". */
function cellClass(fraction: number): string {
  if (fraction <= 0) return 'bg-stone-100 text-stone-500 dark:bg-stone-900 dark:text-stone-500';
  if (fraction <= 0.25) return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200';
  if (fraction <= 0.5) return 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100';
  if (fraction <= 0.75) return 'bg-emerald-400 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50';
  if (fraction < 1) return 'bg-emerald-600 text-white dark:bg-emerald-600';
  // Every game done: darkest step in light mode, brightest in dark mode.
  return 'bg-emerald-800 text-white dark:bg-emerald-400 dark:text-emerald-950';
}
const LEGEND_STEPS = [0, 0.2, 0.4, 0.7, 0.9, 1];

/** Month grid: Monday-first weeks covering the whole month. */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // 0 = Monday
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(localDate(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default function History() {
  const { t, i18n } = useTranslation();
  const today = useToday();
  const games = useEnabledGames();

  const [cursor, setCursor] = useState(() => {
    const d = parseLocalDate(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<Game | null>(null);

  const cells = monthGrid(cursor.year, cursor.month);
  const monthStart = localDate(new Date(cursor.year, cursor.month, 1));
  const monthEnd = localDate(new Date(cursor.year, cursor.month + 1, 0));
  // Fetch the visible month plus the selected day (it may be in another month).
  const from = selected < monthStart ? selected : monthStart;
  const to = selected > monthEnd ? selected : monthEnd;
  const results = useResultsBetween(from, to);

  if (!games || !results) return <p className="text-stone-500">{t('today.loading')}</p>;

  const enabled = new Set(games.map((g) => g.id));
  const byDate = new Map<string, Result[]>();
  for (const r of results) {
    if (!enabled.has(r.gameId)) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }

  const lang = i18n.language;
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  // Monday-first weekday names: 2024-01-01 was a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(lang, { weekday: 'short' }),
  );
  const isCurrentMonth = monthEnd >= today && monthStart <= today;

  const shiftMonth = (n: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    const d = parseLocalDate(today);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  const dayResults = new Map((byDate.get(selected) ?? []).map((r) => [r.gameId, r]));
  const selectedLabel = parseLocalDate(selected).toLocaleDateString(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="w-full max-w-lg">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold first-letter:uppercase">{monthLabel}</h2>
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label={t('history.prevMonth')}
              className="rounded-md border border-stone-300 px-3 py-1 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              ←
            </button>
            <button
              onClick={goToday}
              disabled={isCurrentMonth && selected === today}
              className="rounded-md border border-stone-300 px-3 py-1 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              {t('nav.today')}
            </button>
            <button
              onClick={() => shiftMonth(1)}
              disabled={monthEnd >= today}
              aria-label={t('history.nextMonth')}
              className="rounded-md border border-stone-300 px-3 py-1 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel}>
          {weekdays.map((w) => (
            <div key={w} className="pb-1 text-center text-xs text-stone-500" role="columnheader">
              {w}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const played = byDate.get(date)?.length ?? 0;
            const future = date > today;
            const isSel = date === selected;
            const day = Number(date.slice(8));
            return (
              <button
                key={date}
                role="gridcell"
                disabled={future}
                onClick={() => setSelected(date)}
                aria-selected={isSel}
                title={t('history.cellTooltip', { date, played, total: games.length })}
                className={`flex aspect-square flex-col items-center justify-center rounded-md text-sm tabular-nums transition ${
                  future ? 'bg-transparent text-stone-300 dark:text-stone-700' : cellClass(played / games.length)
                } ${isSel ? 'ring-2 ring-stone-900 ring-offset-2 ring-offset-stone-50 dark:ring-stone-100 dark:ring-offset-stone-950' : ''} ${
                  date === today ? 'font-bold' : ''
                } ${future ? 'cursor-default' : 'hover:brightness-95'}`}
              >
                <span>{day}</span>
                {!future && played > 0 && <span className="text-[10px] leading-none opacity-80">{played}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
          <span>{t('history.legendLess')}</span>
          {LEGEND_STEPS.map((f) => (
            <span key={f} className={`h-4 w-4 rounded ${cellClass(f)}`} aria-hidden />
          ))}
          <span>{t('history.legendMore', { total: games.length })}</span>
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold first-letter:uppercase">{selectedLabel}</h2>
        <p className="mb-3 text-sm text-stone-500">
          {t('history.dayProgress', { done: dayResults.size, total: games.length })}
        </p>
        <ul className="flex flex-col divide-y divide-stone-200 rounded-lg border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
          {games.map((g) => {
            const r = dayResults.get(g.id);
            return (
              <li key={g.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span aria-hidden>{g.icon}</span>
                <span className="flex-1 font-medium">{g.name}</span>
                <span
                  className={
                    r
                      ? r.outcome === 'loss'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                      : 'text-stone-400'
                  }
                >
                  {r ? formatResult(g, r, t) : t('card.notPlayed')}
                </span>
                <button
                  onClick={() => setEditing(g)}
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  {r ? t('card.edit') : t('history.add')}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {editing && (
        <ResultDialog
          key={`${editing.id}:${selected}`}
          game={editing}
          date={selected}
          existing={dayResults.get(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
