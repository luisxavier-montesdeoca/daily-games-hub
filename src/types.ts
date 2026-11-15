/**
 * How a game's daily result is measured.
 * - guesses:  win/loss + number of guesses (lower is better), e.g. Wordle 3/6
 * - mistakes: win/loss + mistakes made (lower is better), e.g. Connections
 * - hints:    always solved; value = hints used (lower is better), e.g. Strands
 * - solved:   solved or revealed; value = hints used, e.g. Minute Cryptic
 * - score:    points (higher is better), e.g. Krillion
 * - generic:  played, optional win/loss, optional number
 */
export type ResultKind = 'guesses' | 'mistakes' | 'hints' | 'solved' | 'score' | 'generic';

export type Lang = 'en' | 'es';

export type Game = {
  id: string;
  name: string;
  url: string;
  lang: Lang;
  resultKind: ResultKind;
  /** Whether the outcome is win/loss (drives win rate and win streak). */
  hasWinLoss: boolean;
  /** Upper bound of `value` when known (6 guesses, 4 mistakes, 700 points). */
  maxValue?: number;
  /** Score games only: lower value is better (301 counts down to 0). Default: higher is better. */
  lowerIsBetter?: boolean;
  /** Score games only: what `value` counts. Default: points. */
  unit?: 'points' | 'questions' | 'meters' | 'km';
  /** Used by Discover (M5) to find similar games. */
  tags: string[];
  /** Emoji shown on the card. */
  icon: string;
  /** Added by the user in Settings (stored in IndexedDB, not in catalog.ts). */
  custom?: boolean;
};

export type Outcome = 'win' | 'loss' | 'n/a';

export type Result = {
  /** `${gameId}:${date}`: one result per game per day. */
  id: string;
  gameId: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  puzzleNumber?: number;
  outcome: Outcome;
  value?: number;
  /** Emoji grid extracted from share text (M2). */
  grid?: string;
  note?: string;
  rawShareText?: string;
  createdAt: number;
  updatedAt: number;
};

/** Per-game user preferences (enable/order). Edited in Settings (M4). */
export type GamePref = {
  gameId: string;
  enabled: boolean;
  order: number;
};
