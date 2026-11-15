import type { DiscoverGame } from '../games/discover';
import type { Game } from '../types';

/** host + path without "www." or a trailing slash, to spot the same game under another id. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export type Suggestion = {
  game: DiscoverGame;
  score: number;
  /** Tags it shares with my games, most common first. */
  sharedTags: string[];
  /** Up to 2 of my games that share the most tags with it ("because you play …"). */
  because: string[];
};

/**
 * Rank Discover games by similarity to my enabled games (FR-22).
 * Each tag weighs as many points as the number of my games that have it,
 * so tags I play a lot (e.g. "word") count more than a tag only one game has.
 * Games already in my hub (same id or same URL) and dismissed games are left out.
 */
export function rankSuggestions(
  candidates: DiscoverGame[],
  myGames: Game[],
  allMyGames: Game[],
  dismissed: Set<string>,
): Suggestion[] {
  const weight = new Map<string, number>();
  for (const g of myGames) for (const tag of g.tags) weight.set(tag, (weight.get(tag) ?? 0) + 1);

  // Exclude anything already in the hub, even if turned off.
  const haveIds = new Set(allMyGames.map((g) => g.id));
  const haveUrls = new Set(allMyGames.map((g) => normalizeUrl(g.url)));

  return candidates
    .filter((c) => !dismissed.has(c.id) && !haveIds.has(c.id) && !haveUrls.has(normalizeUrl(c.url)))
    .map((c) => {
      const sharedTags = c.tags.filter((t) => weight.has(t)).sort((a, b) => weight.get(b)! - weight.get(a)!);
      const score = sharedTags.reduce((s, t) => s + weight.get(t)!, 0);
      const because = myGames
        .map((g) => ({ name: g.name, n: g.tags.filter((t) => c.tags.includes(t)).length }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 2)
        .map((x) => x.name);
      return { game: c, score, sharedTags, because };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name));
}

/** Discover entry → a custom game for the hub. */
export function toCustomGame(d: DiscoverGame): Game {
  const { description: _d, checked: _c, ...game } = d;
  return { ...game, custom: true };
}
