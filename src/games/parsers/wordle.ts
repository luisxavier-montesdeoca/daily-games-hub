import { parseNumber } from './grid';
import type { Parser } from './types';
import { parseWordleLike } from './wordleLike';

// "Wordle 1,612 3/6*"  (the * means hard mode; the number may use , or . separators)
const HEADER = /^\s*Wordle\s+([\d.,  ]*\d)\s+([1-6X])\/6\*?/im;

export const wordle: Parser = {
  gameId: 'wordle',
  detect: (text) => HEADER.test(text),
  parse: (text) => {
    const m = text.match(HEADER);
    if (!m) return null;
    return parseWordleLike(text, { puzzleNumber: parseNumber(m[1]), score: m[2] });
  },
};
