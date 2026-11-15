import { emojiRows, lines, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Noillirk #32 · 8,840m
 * Everest Height
 * 🟡🟡🟠🔵🟡🟠🟠🟡⚪🟡
 * Mind Reader
 *
 * Value = meters. The text lines (milestone, rank) go in the note.
 */
const HEADER = /^\s*Noillirk\s*#\s*([\d.,]+)\s*[·•-]\s*([\d.,]+)\s*m\b/im;

export const noillirk: Parser = {
  gameId: 'noillirk',
  detect: (text) => /^\s*Noillirk\s*#/im.test(text),
  parse: (text) => {
    const m = text.match(HEADER);
    if (!m) return null;
    const rows = emojiRows(text);
    const words = lines(text)
      .slice(1)
      .filter((l) => emojiRows(l).length === 0 && !/^https?:/.test(l));
    return {
      puzzleNumber: parseNumber(m[1]),
      outcome: 'n/a',
      value: parseNumber(m[2]),
      grid: rows.length ? rows.join('\n') : undefined,
      note: words.length ? words.join(' · ') : undefined,
    };
  },
};
