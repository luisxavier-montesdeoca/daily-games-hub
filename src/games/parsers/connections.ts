import { cells, gridRows, parseNumber } from './grid';
import type { Parser } from './types';

/*
 * Connections
 * Puzzle #523
 * 🟨🟨🟨🟨
 * 🟩🟦🟩🟩   ← mixed row = one mistake
 * ...
 * A row of 4 identical colors is a solved group. Win = 4 solved groups. 4 mistakes = loss.
 */
const TITLE = /^\s*Connections\s*$/im;
const PUZZLE = /Puzzle\s*#\s*([\d.,]+)/i;
const MAX_MISTAKES = 4;

export const connections: Parser = {
  gameId: 'connections',
  detect: (text) => TITLE.test(text) && PUZZLE.test(text),
  parse: (text) => {
    const rows = gridRows(text).filter((r) => cells(r).length === 4);
    if (rows.length === 0) return null;
    const solved = rows.filter((r) => new Set(cells(r)).size === 1).length;
    const mistakes = rows.length - solved;
    if (solved > 4 || mistakes > MAX_MISTAKES) return null;
    const win = solved === 4;
    if (!win && mistakes < MAX_MISTAKES) return null; // unfinished game
    return {
      puzzleNumber: parseNumber(text.match(PUZZLE)![1]),
      outcome: win ? 'win' : 'loss',
      value: mistakes,
      grid: rows.join('\n'),
    };
  },
};
