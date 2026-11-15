import { parseNumber } from './grid';
import type { Parser } from './types';
import { parseWordleLike } from './wordleLike';

/**
 * La Palabra del Día: BEST EFFORT. The exact share format hasn't been confirmed with a real sample.
 * Accepts things like:
 *   "La palabra del día #1234 4/6"
 *   "#LaPalabraDelDía 1234 X/6"
 * If no "n/6" is present, the result is inferred from the emoji grid.
 * Replace with an exact parser once a real sample is available, and add it to the tests.
 */
const NAME = /(?:la\s*)?palabra\s*del\s*d[ií]a/i;
const NUMBER = /#\s*(\d[\d.,]*)|(?:palabra\s*del\s*d[ií]a)\D{0,5}?(\d[\d.,]*)(?!\s*\/)/i;
const SCORE = /\b([1-6X])\s*\/\s*6\b/i;

export const palabraDelDia: Parser = {
  gameId: 'palabra-del-dia',
  detect: (text) => NAME.test(text),
  parse: (text) => {
    const n = text.match(NUMBER);
    const s = text.match(SCORE);
    return parseWordleLike(text, {
      puzzleNumber: n ? parseNumber(n[1] ?? n[2]) : undefined,
      score: s?.[1],
    });
  },
};
