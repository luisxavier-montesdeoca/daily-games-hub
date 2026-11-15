import { gridRows, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Size It Up
 * #98
 *
 * Score: 215/500
 *
 * ⬜⬜⬜⬜⬜ 9
 * 🟥🟥🟥🟥🟥 100
 * ...
 * https://magnitudle.com/size-it-up
 *
 * Value = score (out of 500). The per-round numbers are dropped from the grid.
 */
const HEADER = /^\s*(?:Magnitudle:?\s*)?Size It Up\s*$/im;

export const sizeItUp: Parser = {
  gameId: 'size-it-up',
  detect: (text) => HEADER.test(text) || /magnitudle\.com\/size-it-up/i.test(text),
  parse: (text) => {
    const score = text.match(/Score:\s*([\d.,]+)\s*\/\s*([\d.,]+)/i);
    if (!score) return null;
    const num = text.match(/^\s*#\s*([\d.,]+)\s*$/m);
    const rows = gridRows(text.replace(/[ \t]+\d+[ \t]*$/gm, ''));
    return {
      puzzleNumber: num ? parseNumber(num[1]) : undefined,
      outcome: 'n/a',
      value: parseNumber(score[1]),
      grid: rows.length ? rows.join('\n') : undefined,
    };
  },
};
