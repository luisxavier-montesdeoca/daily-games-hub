import { lines, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Farflung #42 · 140/500 km
 * Farflung · Miss · Common · Miss · Miss
 * https://farflung.game/s/jgjhq7?e=42
 *
 * Value = km (out of 500). The per-round line goes in the note.
 */
const HEADER = /^\s*Farflung\s*#\s*([\d.,]+)\s*[·•-]\s*([\d.,]+)\s*\/\s*([\d.,]+)\s*km/im;

export const farflung: Parser = {
  gameId: 'farflung',
  detect: (text) => /^\s*Farflung\s*#/im.test(text),
  parse: (text) => {
    const m = text.match(HEADER);
    if (!m) return null;
    const rounds = lines(text).find((l, i) => i > 0 && l.includes('·') && !/^https?:/.test(l));
    return {
      puzzleNumber: parseNumber(m[1]),
      outcome: 'n/a',
      value: parseNumber(m[2]),
      note: rounds,
    };
  },
};
