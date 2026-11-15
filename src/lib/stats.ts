import type { Game, Result } from '../types';
import { addDays } from './date';

/*
 * Pure stats functions (no React, no DB) so they're easy to unit-test.
 *
 * Definitions (REQUIREMENTS FR-11..FR-14):
 * - Play streak: consecutive days with a logged result.
 * - Win streak:  consecutive days with a win (a loss or a missed day breaks it). Only for win/loss games.
 * - A "current" streak is still alive if it ends today OR yesterday (today may not be played yet).
 */

export type Bucket = {
  /** Display label: "1", "X", "0–99"… (translated labels are applied by the UI via `kind`). */
  label: string;
  /** Special buckets that need translated labels. */
  kind?: 'loss' | 'revealed';
  count: number;
};

export type GameStats = {
  played: number;
  wins: number;
  /** 0..1, or undefined for games without win/loss. */
  winRate?: number;
  currentPlayStreak: number;
  bestPlayStreak: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
  /** Average value (guesses on wins, mistakes, hints, points). */
  average?: number;
  /** Best value: lowest for guesses/mistakes/hints (and 301), highest for points. */
  best?: number;
  distribution: Bucket[];
  lastPlayed?: string;
};

export const lowerIsBetter = (game: Game) =>
  game.resultKind === 'score' ? !!game.lowerIsBetter : true;

/** Streaks over a set of dates (any order, duplicates ok). */
export function streaks(dates: Iterable<string>, today: string): { current: number; best: number } {
  const set = new Set(dates);
  if (set.size === 0) return { current: 0, best: 0 };

  // Best: walk sorted dates, counting consecutive calendar days.
  const sorted = [...set].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }

  // Current: count back from today, or from yesterday if today isn't in the set.
  let day = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(day)) {
    current++;
    day = addDays(day, -1);
  }
  return { current, best };
}

/** Round a step up to 1, 2 or 5 × 10^n so score buckets have tidy edges. */
function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Score buckets: fixed range if the max is known, otherwise from the player's own history. */
function scoreBuckets(values: number[], maxValue?: number): Bucket[] {
  if (values.length === 0) return [];
  const lo = maxValue !== undefined ? 0 : Math.min(...values);
  const hi = maxValue ?? Math.max(...values);
  if (lo === hi) return [{ label: String(lo), count: values.length }];
  // Small ranges (Pop: 0–5) get one bar per value.
  if (hi - lo <= 10) return range(lo, hi).map((n) => ({ label: String(n), count: values.filter((v) => v === n).length }));

  // ~7 buckets with tidy edges: [0–100], [101–200], … (first bucket includes its lower edge).
  const step = niceStep((hi - lo) / 7);
  const buckets: Bucket[] = [];
  let from = Math.floor(lo / step) * step;
  let to = from + step;
  while (true) {
    const top = maxValue !== undefined ? Math.min(to, maxValue) : to;
    const f = from;
    buckets.push({ label: f === top ? String(f) : `${f}–${top}`, count: values.filter((v) => v >= f && v <= top).length });
    if (top >= hi) break;
    from = to + 1;
    to += step;
  }
  return buckets;
}

export function distribution(game: Game, results: Result[]): Bucket[] {
  const count = (pred: (r: Result) => boolean) => results.filter(pred).length;
  const losses = count((r) => r.outcome === 'loss');

  switch (game.resultKind) {
    case 'guesses': {
      const max = game.maxValue ?? 6;
      return [
        ...range(1, max).map((n) => ({ label: String(n), count: count((r) => r.outcome === 'win' && r.value === n) })),
        { label: 'X', kind: 'loss' as const, count: losses },
      ];
    }
    case 'mistakes': {
      const max = game.maxValue ?? 4;
      return [
        ...range(0, max - 1).map((n) => ({ label: String(n), count: count((r) => r.outcome === 'win' && r.value === n) })),
        { label: 'X', kind: 'loss' as const, count: losses },
      ];
    }
    case 'hints':
    case 'solved': {
      const solved = game.resultKind === 'solved' ? results.filter((r) => r.outcome !== 'loss') : results;
      const h = (r: Result) => r.value ?? 0;
      const buckets: Bucket[] = [
        { label: '0', count: solved.filter((r) => h(r) === 0).length },
        { label: '1', count: solved.filter((r) => h(r) === 1).length },
        { label: '2', count: solved.filter((r) => h(r) === 2).length },
        { label: '3+', count: solved.filter((r) => h(r) >= 3).length },
      ];
      if (game.resultKind === 'solved') buckets.push({ label: '?', kind: 'revealed', count: losses });
      return buckets;
    }
    case 'score':
      return scoreBuckets(
        results.map((r) => r.value).filter((v): v is number => v !== undefined),
        game.maxValue,
      );
    case 'generic':
      return [];
  }
}

export function computeGameStats(game: Game, results: Result[], today: string): GameStats {
  const mine = results.filter((r) => r.gameId === game.id);
  const wins = mine.filter((r) => r.outcome === 'win');
  const play = streaks(
    mine.map((r) => r.date),
    today,
  );

  // Values that count toward average/best: guesses only on wins; points/mistakes/hints always.
  const values = mine
    .filter((r) => (game.resultKind === 'guesses' || game.resultKind === 'solved' ? r.outcome === 'win' : true))
    .map((r) => r.value)
    .filter((v): v is number => v !== undefined);

  const stats: GameStats = {
    played: mine.length,
    wins: wins.length,
    currentPlayStreak: play.current,
    bestPlayStreak: play.best,
    distribution: distribution(game, mine),
    lastPlayed: mine.map((r) => r.date).sort().at(-1),
  };

  if (values.length) {
    stats.average = values.reduce((a, b) => a + b, 0) / values.length;
    stats.best = lowerIsBetter(game) ? Math.min(...values) : Math.max(...values);
  }

  if (game.hasWinLoss) {
    const decided = mine.filter((r) => r.outcome === 'win' || r.outcome === 'loss').length;
    stats.winRate = decided ? wins.length / decided : undefined;
    const w = streaks(
      wins.map((r) => r.date),
      today,
    );
    stats.currentWinStreak = w.current;
    stats.bestWinStreak = w.best;
  }

  return stats;
}

/**
 * Days on which every one of `gameIds` has a result, and the streak of such days.
 * Uses the currently enabled games, so adding a game doesn't rewrite the past
 * only for days before it had any result; good enough for a personal hub.
 */
export function allGamesStats(gameIds: string[], results: Result[], today: string) {
  if (gameIds.length === 0) return { completeDays: 0, current: 0, best: 0 };
  const want = new Set(gameIds);
  const byDate = new Map<string, Set<string>>();
  for (const r of results) {
    if (!want.has(r.gameId)) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, new Set());
    byDate.get(r.date)!.add(r.gameId);
  }
  const complete = [...byDate].filter(([, s]) => s.size === want.size).map(([d]) => d);
  return { completeDays: complete.length, ...streaks(complete, today) };
}
