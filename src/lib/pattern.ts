/**
 * "Teach by example": learn a game's share-text format from one pasted sample.
 *
 * The user tags numbers in the sample (score, puzzle #). Each tag is stored as a NumberSlot:
 * the word right before and right after the number, plus which match to take. At paste time
 * those anchors are turned into an escaped regex, so the same spot is found in tomorrow's text
 * even when the numbers, emoji and other lines change.
 */
import { emojiRows } from '../games/parsers/grid';
import type { Parsed, Parser } from '../games/parsers/types';
import type { Anchor, Game, NumberSlot, SharePattern } from '../types';

// ------------------------------------------------------------------ tokens

export type TokenKind = 'number' | 'emoji' | 'text' | 'space';
export type Token = { kind: TokenKind; text: string; start: number; line: number };

// Keycap digits (6️⃣) are emoji, not numbers; they come first so "6️⃣" isn't read as 6.
const TOKEN =
  /([0-9#*]️?⃣)|(\d+(?:[.,]\d+)*)|((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|⃣)+)|([^\S\n]+)|(\n)|([^\s\d\p{Extended_Pictographic}\p{Regional_Indicator}️‍⃣]+)/gu;

/** Split text into numbers, emoji runs, spaces and words. Newlines end a line and aren't tokens. */
export function tokenize(text: string): Token[] {
  const src = text.replace(/\r\n?/g, '\n');
  const out: Token[] = [];
  let line = 0;
  for (const m of src.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (m[5]) {
      line++;
      continue;
    }
    const kind: TokenKind = m[1] || m[3] ? 'emoji' : m[2] ? 'number' : m[4] ? 'space' : 'text';
    out.push({ kind, text: m[0], start, line });
  }
  return out;
}

/** "1,612" / "1.612" → 1612, "12.34" / "12,5" → decimals, "8 840" → 8840. */
export function parseFlexNumber(s: string): number | undefined {
  const t = s.replace(/[\s ]/g, '');
  if (!/^\d+(?:[.,]\d+)*$/.test(t)) return undefined;
  const seps = t.match(/[.,]/g) ?? [];
  if (seps.length === 0) return Number(t);
  const last = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
  if (new Set(seps).size === 2) return Number(t.slice(0, last).replace(/[.,]/g, '') + '.' + t.slice(last + 1));
  const decimalsAfter = t.length - last - 1;
  // One kind of separator: thousands if it repeats or is followed by exactly 3 digits.
  if (seps.length > 1 || decimalsAfter === 3) return Number(t.replace(/[.,]/g, ''));
  return Number(t.replace(',', '.'));
}

// ------------------------------------------------------------------ slots

const NUM = '(\\d+(?:[.,]\\d+)*)';
const EMOJI = '(?:\\p{Extended_Pictographic}|\\p{Regional_Indicator}|\\uFE0F|\\u200D|\\u20E3)+';
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Literal text with flexible whitespace. */
const lit = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map(esc)
    .join('\\s*');

function anchorBefore(a: Anchor): string {
  switch (a.kind) {
    case 'text':
      return `${lit(a.text)}[^\\S\\n]*`;
    case 'edge':
      return '^[^\\S\\n]*';
    case 'emoji':
      return `${EMOJI}[^\\S\\n]*`;
    case 'number':
      return '\\d[\\d.,]*[^\\S\\n]*';
  }
}

function anchorAfter(a: Anchor): string {
  switch (a.kind) {
    case 'text':
      return `(?=[^\\S\\n]*${lit(a.text)})`;
    case 'edge':
      return '(?=[^\\S\\n]*$)';
    case 'emoji':
      return `(?=[^\\S\\n]*${EMOJI})`;
    case 'number':
      // Something else follows after a space. Not necessarily a digit: "1,614 X/6" on a loss.
      return '(?=[^\\S\\n]+\\S)';
  }
}

function slotRegex(slot: Pick<NumberSlot, 'before' | 'after'>): RegExp {
  // Not preceded/followed by another digit, so "1,612" is never read as "612".
  return new RegExp(`${anchorBefore(slot.before)}(?<![\\d.,])${NUM}(?![\\d])${anchorAfter(slot.after)}`, 'gmu');
}

/** Keep only the word nearest the number: "over the community par (" → "over" (after) / "par (" → "(" (before). */
function nearestWord(text: string, side: 'before' | 'after'): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const w = side === 'before' ? words[words.length - 1] : words[0];
  return (w ?? '').slice(0, 40);
}

/** Describe the number token at `index` (in tokenize(text)) by its neighbours. */
export function buildSlot(text: string, index: number): NumberSlot {
  const tokens = tokenize(text);
  const tok = tokens[index];
  if (!tok || tok.kind !== 'number') throw new Error('not a number token');

  const neighbour = (dir: -1 | 1): Anchor => {
    let txt = '';
    for (let i = index + dir; i >= 0 && i < tokens.length; i += dir) {
      const n = tokens[i];
      if (n.line !== tok.line) break;
      if (n.kind === 'text' || n.kind === 'space') {
        txt = dir < 0 ? n.text + txt : txt + n.text;
        continue;
      }
      // Reached an emoji or another number: prefer the text in between, if any.
      const w = nearestWord(txt, dir < 0 ? 'before' : 'after');
      return w ? { kind: 'text', text: w } : { kind: n.kind === 'emoji' ? 'emoji' : 'number' };
    }
    const w = nearestWord(txt, dir < 0 ? 'before' : 'after');
    return w ? { kind: 'text', text: w } : { kind: 'edge' };
  };

  const before = neighbour(-1);
  const after = neighbour(1);
  const src = text.replace(/\r\n?/g, '\n');
  const matches = [...src.matchAll(slotRegex({ before, after }))];
  const occurrence = Math.max(
    0,
    matches.findIndex((m) => (m.index ?? 0) + m[0].indexOf(m[1]) === tok.start),
  );
  return { before, after, occurrence };
}

/** Which number token (index into tokenize(text)) a slot points at in `text`, or -1. */
export function slotTokenIndex(text: string, slot: NumberSlot): number {
  const src = text.replace(/\r\n?/g, '\n');
  const m = [...src.matchAll(slotRegex(slot))][slot.occurrence];
  if (!m) return -1;
  const start = (m.index ?? 0) + m[0].indexOf(m[1]);
  return tokenize(text).findIndex((t) => t.kind === 'number' && t.start === start);
}

/** Read the number at `slot` from a share text. */
export function readSlot(text: string, slot: NumberSlot): number | undefined {
  const src = text.replace(/\r\n?/g, '\n');
  const m = [...src.matchAll(slotRegex(slot))][slot.occurrence];
  return m ? parseFlexNumber(m[1]) : undefined;
}

// ------------------------------------------------------------------ detection & grid

/** Default "recognize by" text: the start of the first line, up to the first number, emoji or #·-|[( mark. */
export function defaultDetect(text: string): string {
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    // Hashtag-style names: "#waffle1234 4/5" → "#waffle".
    const tag = line.trim().match(/^#\p{L}+/u);
    if (tag) return tag[0];
    const head = line.split(/[\d#·•|[(:–—]|\s-\s|\p{Extended_Pictographic}/u)[0].trim();
    if (/\p{L}/u.test(head)) return head.slice(0, 60);
    // Names that start with a number ("301 · Día #33"): take the line up to "#" or an emoji.
    const loose = line
      .split(/#|\p{Extended_Pictographic}/u)[0]
      .replace(/[\s\d.,:·•|-]+$/u, '')
      .trim();
    if (/\p{L}/u.test(loose)) return loose.slice(0, 60);
  }
  return '';
}

export function matchesDetect(text: string, detect: string): boolean {
  const d = detect.trim().toLowerCase();
  if (!d) return false;
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .some((l) => l.trim().toLowerCase().startsWith(d));
}

/** Emoji-only lines, ignoring a trailing per-row number ("🟥🟥⬜ 34"). Keycaps count as emoji. */
export function patternGrid(text: string): string[] {
  return emojiRows(text, (l) => l.replace(/[^\S\n]+[\d.,]+[^\S\n]*$/, ''));
}

/** Distinct emoji in the grid lines, for "score = count of this emoji". */
export function gridEmoji(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const set = new Set<string>();
  for (const row of patternGrid(text)) for (const { segment } of seg.segment(row)) set.add(segment);
  return [...set];
}

function countEmoji(rows: string[], emoji: string): number {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const want = emoji.replace(/️/g, '');
  let n = 0;
  for (const row of rows) for (const { segment } of seg.segment(row)) if (segment.replace(/️/g, '') === want) n++;
  return n;
}

// ------------------------------------------------------------------ parse

/** Read a share text with a taught pattern. Null if the score can't be found (and it isn't a loss). */
export function parseWithPattern(text: string, p: SharePattern, game: Pick<Game, 'hasWinLoss' | 'resultKind'>): Parsed | null {
  const loss = !!p.lossIf?.trim() && text.toLowerCase().includes(p.lossIf.trim().toLowerCase());
  const outcome = game.hasWinLoss ? (loss ? 'loss' : 'win') : 'n/a';
  const rows = patternGrid(text);

  let value: number | undefined;
  if (p.score?.from === 'number') value = readSlot(text, p.score.slot);
  else if (p.score?.from === 'emojiCount') value = countEmoji(rows, p.score.emoji);
  else if (p.score?.from === 'gridRows') value = rows.length || undefined;

  // A lost guessing game has no score ("X/6"); otherwise a missing score means we couldn't read it.
  if (p.score && value === undefined && !loss) return null;
  if (loss && game.resultKind === 'guesses') value = undefined;

  const puzzleNumber = p.puzzle ? readSlot(text, p.puzzle) : undefined;
  return {
    outcome,
    ...(value !== undefined && { value }),
    ...(puzzleNumber !== undefined && { puzzleNumber: Math.round(puzzleNumber) }),
    ...(p.grid && rows.length > 0 && { grid: rows.join('\n') }),
  };
}

export function patternParser(game: Game): Parser | undefined {
  const p = game.pattern;
  if (!p) return undefined;
  return {
    gameId: game.id,
    detect: (text) => matchesDetect(text, p.detect),
    parse: (text) => parseWithPattern(text, p, game),
  };
}
