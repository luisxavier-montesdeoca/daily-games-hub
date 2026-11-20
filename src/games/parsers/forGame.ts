import { patternParser } from '../../lib/pattern';
import type { Game } from '../../types';
import { PARSER_BY_GAME, PARSERS } from './index';
import type { Parsed, Parser } from './types';

/** The parser to use for a game: a format taught in the app wins over the built-in one. */
export function parserFor(game: Game): Parser | undefined {
  return patternParser(game) ?? PARSER_BY_GAME[game.id];
}

/** Which of `games` a pasted text came from. Taught formats are checked first. */
export function detectAmong(text: string, games: Game[]): { game: Game; parsed: Parsed | null } | null {
  for (const g of games) {
    const p = patternParser(g);
    if (p?.detect(text)) return { game: g, parsed: p.parse(text) };
  }
  for (const p of PARSERS) {
    const g = games.find((x) => x.id === p.gameId);
    if (g && !g.pattern && p.detect(text)) return { game: g, parsed: p.parse(text) };
  }
  return null;
}
