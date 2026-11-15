import { emojiRows, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Minute Cryptic - 15 November, 2026
 * "Red Sox lost 11-1, reeling after debut of rookie Yankee" (4)
 * ⚪️⚪️🟡🟡🟡🟡🟣
 * 🏋 6 hints – 4 over the community par (144,053 solvers so far).
 * https://www.minutecryptic.com/?utm_source=share
 *
 * Value = hints used. A revealed answer counts as a loss (assumed wording: "reveal").
 */
const HEADER = /^\s*Minute Cryptic\b/im;
const HINTS = /\b(\d+|no)\s+hints?\b/i;
const PAR = /hints?\s*[–—-]\s*([^(\n]*\bpar\b)/i;

export const minuteCryptic: Parser = {
  gameId: 'minute-cryptic',
  detect: (text) => HEADER.test(text),
  parse: (text) => {
    if (!HEADER.test(text)) return null;
    const h = text.match(HINTS);
    const rows = emojiRows(text);
    if (!h && rows.length === 0) return null;
    return {
      outcome: /\breveal/i.test(text) ? 'loss' : 'win',
      value: h ? (h[1].toLowerCase() === 'no' ? 0 : parseNumber(h[1])) : undefined,
      grid: rows.length ? rows.join('\n') : undefined,
      note: text.match(PAR)?.[1]?.trim(),
    };
  },
};
