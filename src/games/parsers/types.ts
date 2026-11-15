import type { Outcome } from '../../types';

/** What a parser extracts from a game's share text. */
export type Parsed = {
  puzzleNumber?: number;
  outcome: Outcome;
  value?: number;
  /** Emoji grid rows joined by '\n'. */
  grid?: string;
  note?: string;
};

export type Parser = {
  gameId: string;
  /** Cheap check: does this text look like it came from this game? */
  detect: (text: string) => boolean;
  /** Full parse; null if the text looks right but can't be read. */
  parse: (text: string) => Parsed | null;
};
