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
  /** Score games: unit shown next to the value, e.g. "$", "km", "pts". Overrides `unit`. */
  unitLabel?: string;
  /** Show the unit before the number ("$12.34") instead of after ("140 km"). */
  unitPrefix?: boolean;
  /** Decimal places allowed in the value (0 = whole numbers). */
  decimals?: number;
  /** Share-text format taught in the app. Takes priority over a built-in parser. */
  pattern?: SharePattern;
};

/**
 * Where a number sits in a share text, described by what's right before and after it.
 * Stored as data (never as a regex) so imported game setups can't inject code.
 */
export type Anchor =
  | { kind: 'text'; text: string } // a literal word/punctuation, e.g. "Score:" or "/"
  | { kind: 'edge' } // start or end of the line
  | { kind: 'emoji' } // any emoji
  | { kind: 'number' }; // another number

export type NumberSlot = {
  before: Anchor;
  after: Anchor;
  /** Which match to take when the anchors match several times (0 = first). */
  occurrence: number;
};

export type ScoreSource =
  | { from: 'number'; slot: NumberSlot }
  | { from: 'emojiCount'; emoji: string } // e.g. count 💡 for hints
  | { from: 'gridRows' }; // e.g. guesses = rows in a Wordle grid

/** A share-text format learned from one example (see lib/pattern.ts). */
export type SharePattern = {
  /** Text a line starts with that identifies the game, e.g. "Minute Cryptic". Case-insensitive. */
  detect: string;
  score?: ScoreSource;
  puzzle?: NumberSlot;
  /** If the text contains this, the result is a loss (or "revealed"). Case-insensitive. */
  lossIf?: string;
  /** Keep emoji-only lines as the result grid. */
  grid: boolean;
  /** The example it was taught with (shown again when editing). */
  sample: string;
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
