import { describe, expect, it } from 'vitest';
import { GAMES_BY_ID } from '../games/catalog';
import type { Outcome, Result } from '../types';
import { addDays } from './date';
import { allGamesStats, computeGameStats, streaks } from './stats';

const TODAY = '2026-11-13';

function r(gameId: string, date: string, outcome: Outcome, value?: number): Result {
  return { id: `${gameId}:${date}`, gameId, date, outcome, value, createdAt: 0, updatedAt: 0 };
}

describe('addDays', () => {
  it('crosses month, year and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // US DST end
  });
});

describe('streaks', () => {
  it('is empty with no dates', () => {
    expect(streaks([], TODAY)).toEqual({ current: 0, best: 0 });
  });

  it('counts a run ending today', () => {
    expect(streaks(['2026-11-11', '2026-11-12', '2026-11-13'], TODAY)).toEqual({ current: 3, best: 3 });
  });

  it('keeps the streak alive if today is not played yet', () => {
    expect(streaks(['2026-11-11', '2026-11-12'], TODAY).current).toBe(2);
  });

  it('breaks the current streak after a missed day', () => {
    expect(streaks(['2026-11-10', '2026-11-11'], TODAY)).toEqual({ current: 0, best: 2 });
  });

  it('finds the best run in the past', () => {
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-13'];
    expect(streaks(dates, TODAY)).toEqual({ current: 1, best: 4 });
  });

  it('crosses a month boundary', () => {
    expect(streaks(['2026-10-31', '2026-11-01'], '2026-11-01').current).toBe(2);
  });
});

describe('computeGameStats: wordle', () => {
  const g = GAMES_BY_ID['wordle'];
  const results = [
    r('wordle', '2026-11-10', 'win', 4),
    r('wordle', '2026-11-11', 'loss'),
    r('wordle', '2026-11-12', 'win', 3),
    r('wordle', '2026-11-13', 'win', 2),
    r('connections', '2026-11-13', 'win', 0), // other game: ignored
  ];
  const s = computeGameStats(g, results, TODAY);

  it('counts plays, wins and win rate', () => {
    expect(s.played).toBe(4);
    expect(s.wins).toBe(3);
    expect(s.winRate).toBeCloseTo(0.75);
  });

  it('separates play streak from win streak', () => {
    expect(s.currentPlayStreak).toBe(4);
    expect(s.currentWinStreak).toBe(2);
    expect(s.bestWinStreak).toBe(2);
  });

  it('averages guesses on wins only; best is the lowest', () => {
    expect(s.average).toBeCloseTo(3);
    expect(s.best).toBe(2);
  });

  it('builds a 1–6 + X distribution', () => {
    expect(s.distribution.map((b) => [b.label, b.count])).toEqual([
      ['1', 0],
      ['2', 1],
      ['3', 1],
      ['4', 1],
      ['5', 0],
      ['6', 0],
      ['X', 1],
    ]);
  });
});

describe('computeGameStats: score games', () => {
  it('uses fixed buckets when the max is known (Krillion 0–700)', () => {
    const s = computeGameStats(
      GAMES_BY_ID['krillion'],
      [r('krillion', '2026-11-12', 'n/a', 540), r('krillion', '2026-11-13', 'n/a', 700)],
      TODAY,
    );
    expect(s.winRate).toBeUndefined();
    expect(s.best).toBe(700);
    expect(s.average).toBe(620);
    expect(s.distribution.map((b) => b.label)).toEqual([
      '0–100',
      '101–200',
      '201–300',
      '301–400',
      '401–500',
      '501–600',
      '601–700',
    ]);
    expect(s.distribution.at(-1)).toEqual({ label: '601–700', count: 1 });
    expect(s.distribution.reduce((a, b) => a + b.count, 0)).toBe(2);
  });

  it('builds buckets from history when the max is unknown', () => {
    const vals = [1200, 3400, 8200, 5100];
    const s = computeGameStats(
      GAMES_BY_ID['noillirk'],
      vals.map((v, i) => r('noillirk', addDays(TODAY, -i), 'n/a', v)),
      TODAY,
    );
    expect(s.distribution.reduce((a, b) => a + b.count, 0)).toBe(4);
    expect(s.distribution.length).toBeLessThanOrEqual(8);
  });

  it('treats 301 as lower-is-better, 0–301', () => {
    const s = computeGameStats(
      GAMES_BY_ID['301'],
      [r('301', '2026-11-12', 'n/a', 12), r('301', '2026-11-13', 'n/a', 40)],
      TODAY,
    );
    expect(s.best).toBe(12);
    expect(s.distribution[0]).toEqual({ label: '0–50', count: 2 });
    expect(s.distribution.at(-1)?.label).toBe('301');
  });

  it('gives Pop (0–5 solved) one bar per value', () => {
    const s = computeGameStats(
      GAMES_BY_ID['pop-301'],
      [r('pop-301', '2026-11-12', 'n/a', 5), r('pop-301', '2026-11-13', 'n/a', 3)],
      TODAY,
    );
    expect(s.best).toBe(5);
    expect(s.distribution.map((b) => b.label)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(s.distribution[3].count).toBe(1);
  });

  it('handles a single score', () => {
    const s = computeGameStats(GAMES_BY_ID['noillirk'], [r('noillirk', TODAY, 'n/a', 42)], TODAY);
    expect(s.distribution).toEqual([{ label: '42', count: 1 }]);
  });
});

describe('computeGameStats: connections & minute cryptic', () => {
  it('connections: mistakes 0–3 and X', () => {
    const s = computeGameStats(
      GAMES_BY_ID['connections'],
      [r('connections', '2026-11-12', 'win', 1), r('connections', '2026-11-13', 'loss', 4)],
      TODAY,
    );
    expect(s.distribution.map((b) => b.label)).toEqual(['0', '1', '2', '3', 'X']);
    expect(s.winRate).toBe(0.5);
  });

  it('minute cryptic: hints buckets plus revealed', () => {
    const s = computeGameStats(
      GAMES_BY_ID['minute-cryptic'],
      [r('minute-cryptic', '2026-11-12', 'win', 0), r('minute-cryptic', '2026-11-13', 'loss', 2)],
      TODAY,
    );
    expect(s.distribution.map((b) => [b.label, b.count])).toEqual([
      ['0', 1],
      ['1', 0],
      ['2', 0],
      ['3+', 0],
      ['?', 1],
    ]);
  });
});

describe('allGamesStats', () => {
  it('counts only days where every game was played', () => {
    const results = [
      r('wordle', '2026-11-12', 'win', 3),
      r('strands', '2026-11-12', 'n/a', 0),
      r('wordle', '2026-11-13', 'win', 3),
    ];
    expect(allGamesStats(['wordle', 'strands'], results, TODAY)).toEqual({ completeDays: 1, current: 1, best: 1 });
  });
});

describe('decimal, lower-is-better scores (taught games like Costcodle)', () => {
  const game = {
    ...GAMES_BY_ID['krillion'],
    id: 'costcodle',
    maxValue: undefined,
    lowerIsBetter: true,
    decimals: 2,
  };
  it('best is the lowest, and every value lands in a bucket', () => {
    const vals = [3.07, 12.34, 100.5, 7];
    const s = computeGameStats(game, vals.map((v, i) => r('costcodle', addDays(TODAY, -i), 'n/a', v)), TODAY);
    expect(s.best).toBe(3.07);
    expect(s.distribution.reduce((a, b) => a + b.count, 0)).toBe(4);
    // Labels continue from the previous bucket's top: no gaps for decimals.
    const labels = s.distribution.map((b) => b.label);
    for (let i = 1; i < labels.length; i++) expect(labels[i].split('–')[0]).toBe(labels[i - 1].split('–')[1]);
  });
});
