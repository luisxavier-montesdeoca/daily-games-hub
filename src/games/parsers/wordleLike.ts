import { gridRows, isAllCorrect } from './grid';
import type { Parsed } from './types';

/**
 * Shared logic for Wordle-style games.
 * `scoreMatch` is the result of a regex whose groups are (puzzleNumber?, score), where score is "1".."6" or "X".
 * If the score isn't in the text, it falls back to reading the grid.
 */
export function parseWordleLike(
  text: string,
  scoreMatch: { puzzleNumber?: number; score?: string },
  maxGuesses = 6,
): Parsed | null {
  const rows = gridRows(text);
  const grid = rows.length ? rows.join('\n') : undefined;
  const { puzzleNumber, score } = scoreMatch;

  if (score) {
    if (score.toUpperCase() === 'X') return { puzzleNumber, outcome: 'loss', grid };
    const n = Number(score);
    if (n >= 1 && n <= maxGuesses) return { puzzleNumber, outcome: 'win', value: n, grid };
    return null;
  }

  // Fallback: infer from the grid.
  if (rows.length === 0 || rows.length > maxGuesses) return null;
  if (isAllCorrect(rows[rows.length - 1])) return { puzzleNumber, outcome: 'win', value: rows.length, grid };
  if (rows.length === maxGuesses) return { puzzleNumber, outcome: 'loss', grid };
  return null; // unfinished game
}
