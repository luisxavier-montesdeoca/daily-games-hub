import { describe, expect, it } from 'vitest';
import { CATALOG } from '../games/catalog';
import { DISCOVER, type DiscoverGame } from '../games/discover';
import { normalizeUrl, rankSuggestions, toCustomGame } from './similar';

const mk = (id: string, tags: string[], url = `https://${id}.example`): DiscoverGame => ({
  id,
  name: id,
  url,
  lang: 'en',
  resultKind: 'generic',
  hasWinLoss: false,
  tags,
  icon: '🎲',
  description: { en: '', es: '' },
});

describe('normalizeUrl', () => {
  it('ignores www, trailing slash and case', () => {
    expect(normalizeUrl('https://www.NYTimes.com/games/wordle/')).toBe('nytimes.com/games/wordle');
  });
  it('keeps the path, so different games on one site differ', () => {
    expect(normalizeUrl('https://www.nytimes.com/games/strands')).not.toBe(normalizeUrl('https://www.nytimes.com/games/wordle'));
  });
});

describe('rankSuggestions', () => {
  const mine = CATALOG; // word ×5, spanish ×2, trivia ×3, geography ×1 …

  it('ranks by weighted shared tags', () => {
    const out = rankSuggestions([mk('geo', ['geography']), mk('wordy', ['word', 'deduction'])], mine, mine, new Set());
    expect(out.map((s) => s.game.id)).toEqual(['wordy', 'geo']);
    expect(out[0].sharedTags[0]).toBe('word');
  });

  it('drops games with nothing in common', () => {
    expect(rankSuggestions([mk('x', ['knitting'])], mine, mine, new Set())).toEqual([]);
  });

  it('excludes dismissed games, games already added, and same-URL games', () => {
    const cands = [
      mk('dismissed', ['word']),
      mk('wordle', ['word']), // same id as a catalog game
      mk('dupe', ['word'], 'https://www.nytimes.com/games/wordle/index.html/'), // same URL as Wordle
      mk('ok', ['word']),
    ];
    expect(rankSuggestions(cands, mine, mine, new Set(['dismissed'])).map((s) => s.game.id)).toEqual(['ok']);
  });

  it('counts turned-off games as already added, but not for weights', () => {
    const enabled = mine.filter((g) => g.id !== 'farflung');
    const out = rankSuggestions([mk('farflung', ['geography'])], enabled, mine, new Set());
    expect(out).toEqual([]);
  });

  it('explains with up to two of my games', () => {
    const [s] = rankSuggestions([mk('w', ['word', 'deduction', 'spanish'])], mine, mine, new Set());
    expect(s.because).toEqual(['La Palabra del Día', 'Wordle']);
  });
});

describe('Discover data', () => {
  it('has unique ids that do not clash with the catalog', () => {
    const ids = DISCOVER.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(CATALOG.some((g) => g.id === id)).toBe(false);
  });

  it('has valid https URLs and both descriptions', () => {
    for (const d of DISCOVER) {
      expect(new URL(d.url).protocol).toBe('https:');
      expect(d.description.en && d.description.es).toBeTruthy();
    }
  });

  it('converts to a custom game without Discover-only fields', () => {
    const g = toCustomGame(DISCOVER[0]);
    expect(g.custom).toBe(true);
    expect('description' in g).toBe(false);
  });
});
