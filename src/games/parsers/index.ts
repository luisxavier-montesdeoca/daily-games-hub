import { connections } from './connections';
import { palabraDelDia } from './palabraDelDia';
import { strands } from './strands';
import type { Parsed, Parser } from './types';
import { wordle } from './wordle';
import { minuteCryptic } from './minuteCryptic';
import { krillion } from './krillion';
import { noillirk } from './noillirk';
import { farflung } from './farflung';
import { atrapa, game301, pop } from './juegoDiario301';
import { sizeItUp } from './sizeItUp';

export type { Parsed, Parser };

/**
 * All parsers. Order matters for detection: more specific first
 * (Palabra del Día before Wordle, in case its share text mentions "Wordle").
 * To add a parser: write src/games/parsers/<game>.ts + a test, then add it here.
 */
export const PARSERS: Parser[] = [
  palabraDelDia,
  wordle,
  connections,
  strands,
  minuteCryptic,
  krillion,
  noillirk,
  farflung,
  game301,
  pop,
  atrapa,
  sizeItUp,
];

export const PARSER_BY_GAME: Record<string, Parser> = Object.fromEntries(PARSERS.map((p) => [p.gameId, p]));

/** Which game a pasted text came from, if any parser recognizes it. */
export function detectGame(text: string): { gameId: string; parsed: Parsed | null } | null {
  for (const p of PARSERS) {
    if (p.detect(text)) return { gameId: p.gameId, parsed: p.parse(text) };
  }
  return null;
}
