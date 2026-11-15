import { emojiRows, lines, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Krillion #123 🦐
 * 305
 *
 * ⬛🏮🦑🦑🐟🫧🦑
 */
const HEADER = /^\s*Krillion\s*#\s*([\d.,]+)/im;

export const krillion: Parser = {
  gameId: 'krillion',
  detect: (text) => HEADER.test(text),
  parse: (text) => {
    const m = text.match(HEADER);
    if (!m) return null;
    // The score is the first line that is only a number.
    const score = lines(text).find((l) => /^[\d.,]+$/.test(l));
    if (!score) return null;
    const rows = emojiRows(text);
    return {
      puzzleNumber: parseNumber(m[1]),
      outcome: 'n/a',
      value: parseNumber(score),
      grid: rows.length ? rows.join('\n') : undefined,
    };
  },
};
