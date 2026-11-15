import { cells, gridRows, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Strands #250
 * “Theme words”
 * 💡🔵🔵🔵
 * 🟡🔵🔵
 * 🔵 = theme word, 🟡 = spangram, 💡 = hint used. Strands is always solved; the value is hints used.
 */
const HEADER = /^\s*Strands\s*#\s*([\d.,]+)/im;
const THEME = /[“"]([^”"\n]+)[”"]/;

export const strands: Parser = {
  gameId: 'strands',
  detect: (text) => HEADER.test(text),
  parse: (text) => {
    const m = text.match(HEADER);
    const rows = gridRows(text);
    if (!m || rows.length === 0) return null;
    const hints = rows.flatMap(cells).filter((c) => c === '💡').length;
    return {
      puzzleNumber: parseNumber(m[1]),
      outcome: 'n/a',
      value: hints,
      grid: rows.join('\n'),
      note: text.match(THEME)?.[1]?.trim(),
    };
  },
};
