import { describe, expect, it } from 'vitest';
import type { Game, SharePattern } from '../types';
import { buildSlot, defaultDetect, gridEmoji, matchesDetect, parseFlexNumber, parseWithPattern, tokenize } from './pattern';

/** Index of the n-th number token whose text is `value` (what the user clicks on). */
function tag(text: string, value: string, nth = 0): number {
  const idx = tokenize(text)
    .map((t, i) => (t.kind === 'number' && t.text === value ? i : -1))
    .filter((i) => i >= 0)[nth];
  if (idx === undefined) throw new Error(`no number ${value}`);
  return idx;
}

/** Teach from `sample` like the editor does: tag the score (and puzzle) numbers. */
function teach(sample: string, score: string, puzzle?: string, extra: Partial<SharePattern> = {}): SharePattern {
  return {
    detect: defaultDetect(sample),
    score: { from: 'number', slot: buildSlot(sample, tag(sample, score)) },
    puzzle: puzzle ? buildSlot(sample, tag(sample, puzzle)) : undefined,
    grid: true,
    sample,
    ...extra,
  };
}

const SCORE: Pick<Game, 'hasWinLoss' | 'resultKind'> = { hasWinLoss: false, resultKind: 'score' };

describe('parseFlexNumber', () => {
  it.each([
    ['305', 305],
    ['8,840', 8840],
    ['1.612', 1612],
    ['144,053', 144053],
    ['12.34', 12.34],
    ['2,5', 2.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
  ])('%s → %d', (s, n) => expect(parseFlexNumber(s)).toBe(n));
});

describe('tokenize', () => {
  it('treats keycap digits as emoji, not numbers', () => {
    const nums = tokenize('Daily Quordle 1012\n6️⃣5️⃣\n8️⃣4️⃣').filter((t) => t.kind === 'number');
    expect(nums.map((t) => t.text)).toEqual(['1012']);
  });
});

describe('defaultDetect', () => {
  it.each([
    ['Minute Cryptic - 15 November, 2026\n…', 'Minute Cryptic'],
    ['Krillion #123 🦐\n305', 'Krillion'],
    ['301 · Día #33\nRanking…', '301 · Día'],
    ['Size It Up\n#98', 'Size It Up'],
    ['Daily Quordle [1012]', 'Daily Quordle'],
    ['Costcodle #512\nOff by $12.34', 'Costcodle'],
    ['#waffle1234 4/5\n🟩⭐🟩\nwafflegame.net', '#waffle'],
  ])('%s → %s', (text, want) => expect(defaultDetect(text)).toBe(want));

  it('matches at the start of any line, ignoring case', () => {
    expect(matchesDetect('  krillion #9 🦐\n100', 'Krillion')).toBe(true);
    expect(matchesDetect('I love Krillion', 'Krillion')).toBe(false);
  });
});

describe('taught from one sample, read on another day', () => {
  it('Krillion: score alone on a line, puzzle after #', () => {
    const p = teach('Krillion #123 🦐\n305\n\n⬛🏮🦑🦑🐟🫧🦑', '305', '123');
    expect(parseWithPattern('Krillion #124 🦐\n512\n\n🦑🦑🐟🫧🦑⬛🏮', p, SCORE)).toEqual({
      outcome: 'n/a',
      value: 512,
      puzzleNumber: 124,
      grid: '🦑🦑🐟🫧🦑⬛🏮',
    });
  });

  it('Minute Cryptic: hints after an emoji; the date and other words change', () => {
    const sample = `Minute Cryptic - 15 November, 2026
"Red Sox lost 11-1, reeling after debut of rookie Yankee" (4)
⚪️⚪️🟡🟡🟡🟡🟣
🏋 6 hints – 4 over the community par (144,053 solvers so far).
https://www.minutecryptic.com/?utm_source=share`;
    const p = teach(sample, '6', undefined, { lossIf: 'reveal' });
    const next = `Minute Cryptic - 2 December, 2026
"Some other clue with 3 numbers 7-8" (6)
⚪️🟡🟡🟣
🏋 2 hints – 1 under the community par (90,001 solvers so far).`;
    const game = { hasWinLoss: true, resultKind: 'solved' as const };
    expect(parseWithPattern(next, p, game)).toEqual({ outcome: 'win', value: 2, grid: '⚪🟡🟡🟣' });
    expect(parseWithPattern(next.replace('2 hints – 1 under', '3 hints – answer revealed –'), p, game)).toMatchObject({
      outcome: 'loss',
      value: 3,
    });
  });

  it('301: number-first name, "quedan" score', () => {
    const p = teach(
      '301 · Día #33\nRanking de los países por tasa de fertilidad (hijos por mujer)\n🎯💥🎯💥💥 → quedan 7\n301juegodiario.com',
      '7',
      '33',
    );
    expect(p.detect).toBe('301 · Día');
    expect(
      parseWithPattern('301 · Día #34\nOtra categoría con 5 cosas\n💥🎯🎯🎯🎯 → quedan 120\n301juegodiario.com', p, SCORE),
    ).toMatchObject({ value: 120, puzzleNumber: 34 });
  });

  it('Size It Up: "Score: N/500", grid rows with trailing numbers', () => {
    const sample = 'Size It Up\n#98\n\nScore: 215/500\n\n⬜⬜⬜⬜⬜ 9\n🟥🟥🟥🟥🟥 100\n\nhttps://magnitudle.com/size-it-up';
    const p = teach(sample, '215', '98');
    expect(parseWithPattern('Size It Up\n#99\n\nScore: 480/500\n\n🟥🟥🟥🟥⬜ 80\n🟥🟥🟥🟥🟥 100', p, SCORE)).toEqual({
      outcome: 'n/a',
      value: 480,
      puzzleNumber: 99,
      grid: '🟥🟥🟥🟥⬜\n🟥🟥🟥🟥🟥',
    });
  });

  it('Noillirk: thousands separator and a unit glued to the number', () => {
    const p = teach('Noillirk #32 · 8,840m\nEverest Height\n🟡🟡🟠🔵🟡🟠🟠🟡⚪🟡\nMind Reader', '8,840', '32');
    expect(parseWithPattern('Noillirk #33 · 12,050m\nK2 Height\n🟡🟡\nNovice', p, SCORE)).toMatchObject({
      value: 12050,
      puzzleNumber: 33,
    });
  });

  it('Costcodle-style: dollars with decimals (lower is better is set on the game, not here)', () => {
    const p = teach('Costcodle #512\nOff by $12.34\n🟥⬆️🟨⬇️🟩\ncostcodle.com', '12.34', '512');
    expect(parseWithPattern('Costcodle #513\nOff by $3.07\n🟩\ncostcodle.com', p, SCORE)).toMatchObject({
      value: 3.07,
      puzzleNumber: 513,
    });
  });

  it('Wordle-style: score next to another number, loss rule for X/6', () => {
    const p = teach('Wordle 1,612 3/6\n\n⬛🟨⬛⬛⬛\n🟩🟩⬛🟩⬛\n🟩🟩🟩🟩🟩', '3', '1,612', { lossIf: 'X/' });
    const game = { hasWinLoss: true, resultKind: 'guesses' as const };
    expect(parseWithPattern('Wordle 1,613 5/6\n\n🟩🟩🟩🟩🟩', p, game)).toMatchObject({
      outcome: 'win',
      value: 5,
      puzzleNumber: 1613,
    });
    const lost = parseWithPattern('Wordle 1,614 X/6\n\n⬛⬛⬛⬛⬛', p, game);
    expect(lost).toMatchObject({ outcome: 'loss', puzzleNumber: 1614 });
    expect(lost?.value).toBeUndefined();
  });

  it('takes the right one when the anchors match twice ("N/7" twice)', () => {
    const p = teach('Game #1\nRound 3/7\nTotal 5/7', '5');
    expect(parseWithPattern('Game #2\nRound 2/7\nTotal 6/7', p, SCORE)?.value).toBe(6);
  });

  it('score = count of an emoji (Strands 💡), or number of grid rows', () => {
    const sample = 'Strands #250\n“Theme”\n💡🔵🔵\n🟡🔵💡';
    expect(gridEmoji(sample)).toEqual(['💡', '🔵', '🟡']);
    const hints: SharePattern = { detect: 'Strands', score: { from: 'emojiCount', emoji: '💡' }, grid: true, sample };
    expect(parseWithPattern('Strands #251\n“X”\n🔵💡🔵\n💡🟡💡', hints, SCORE)?.value).toBe(3);
    const rows: SharePattern = { ...hints, score: { from: 'gridRows' } };
    expect(parseWithPattern('Strands #251\n🔵\n🔵\n🟡', rows, SCORE)?.value).toBe(3);
  });

  it('returns null when the score is missing, so the user is told it could not be read', () => {
    const p = teach('Krillion #123 🦐\n305', '305');
    expect(parseWithPattern('Krillion #123 🦐\nno score here', p, SCORE)).toBeNull();
  });

  it('keeps keycap rows (Quordle) as the grid', () => {
    const p: SharePattern = { detect: 'Daily Quordle', grid: true, sample: '' };
    expect(parseWithPattern('Daily Quordle 1012\n6️⃣5️⃣\n8️⃣4️⃣', p, SCORE)?.grid).toBe('6⃣5⃣\n8⃣4⃣');
  });
});

describe('game setup codes', async () => {
  const { encodeGameCode, decodeGameCode } = await import('./shareCode');
  const sample = 'Costcodle #512\nOff by $12.34\n🟥⬆️🟨⬇️🟩';
  const game: Game = {
    id: 'custom-costcodle-abc',
    name: 'Costcodle',
    url: 'https://costcodle.com',
    lang: 'en',
    resultKind: 'score',
    hasWinLoss: false,
    lowerIsBetter: true,
    unitLabel: '$',
    unitPrefix: true,
    decimals: 2,
    tags: ['estimation'],
    icon: '🛒',
    custom: true,
    pattern: teach(sample, '12.34', '512'),
  };

  it('round-trips a taught game (without the custom flag)', () => {
    const back = decodeGameCode(encodeGameCode(game));
    const { custom: _c, ...want } = game;
    expect(back).toMatchObject(want);
    expect(back.custom).toBeUndefined();
    expect(parseWithPattern('Costcodle #600\nOff by $0.99', back.pattern!, back)?.value).toBe(0.99);
  });

  it('rejects junk and unsafe fields', () => {
    expect(() => decodeGameCode('hello')).toThrow('badCode');
    expect(() => decodeGameCode('DGH1.!!!')).toThrow('badCode');
    const evil = encodeGameCode({ ...game, url: 'javascript:alert(1)' });
    expect(() => decodeGameCode(evil)).toThrow('badCode');
    // Unknown anchor kinds (e.g. a raw regex) are dropped, not used.
    const raw = { ...game, pattern: { ...game.pattern, puzzle: { before: { kind: 'regex', text: '(a+)+$' }, after: { kind: 'edge' }, occurrence: 0 } } };
    expect(decodeGameCode(encodeGameCode(raw as unknown as Game)).pattern?.puzzle).toBeUndefined();
  });
});
