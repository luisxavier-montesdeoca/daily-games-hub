/**
 * Game setup codes: a game's settings (result type, unit, taught share-text format…) as one
 * copy-pasteable string, so friends can add a game already set up. Results are never included.
 *
 * Format: "DGH1." + base64url(UTF-8 JSON of the game). Codes come from other people, so
 * decodeGameCode() checks every field and rebuilds the game from known fields only.
 */
import type { Anchor, Game, NumberSlot, ResultKind, ScoreSource, SharePattern } from '../types';

const PREFIX = 'DGH1.';
const KINDS: ResultKind[] = ['guesses', 'mistakes', 'hints', 'solved', 'score', 'generic'];

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeGameCode(game: Game): string {
  const { custom: _custom, ...rest } = game;
  return PREFIX + toBase64Url(JSON.stringify(rest));
}

// ------------------------------------------------------------ validation

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length <= max ? v : undefined;
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;

function anchor(v: unknown): Anchor | undefined {
  const a = v as Partial<Anchor> | null;
  if (!a || typeof a !== 'object') return undefined;
  if (a.kind === 'text') {
    const text = str((a as { text?: unknown }).text, 40);
    return text ? { kind: 'text', text } : undefined;
  }
  return a.kind === 'edge' || a.kind === 'emoji' || a.kind === 'number' ? { kind: a.kind } : undefined;
}

function slot(v: unknown): NumberSlot | undefined {
  const s = v as Partial<NumberSlot> | null;
  if (!s || typeof s !== 'object') return undefined;
  const before = anchor(s.before);
  const after = anchor(s.after);
  const occurrence = num(s.occurrence, 0, 50);
  return before && after && occurrence !== undefined ? { before, after, occurrence: Math.floor(occurrence) } : undefined;
}

function scoreSource(v: unknown): ScoreSource | undefined {
  const s = v as { from?: unknown; slot?: unknown; emoji?: unknown } | null;
  if (!s || typeof s !== 'object') return undefined;
  if (s.from === 'gridRows') return { from: 'gridRows' };
  if (s.from === 'emojiCount') {
    const emoji = str(s.emoji, 16);
    return emoji ? { from: 'emojiCount', emoji } : undefined;
  }
  if (s.from === 'number') {
    const sl = slot(s.slot);
    return sl ? { from: 'number', slot: sl } : undefined;
  }
  return undefined;
}

function pattern(v: unknown): SharePattern | undefined {
  const p = v as Partial<SharePattern> | null;
  if (!p || typeof p !== 'object') return undefined;
  const detect = str(p.detect, 60);
  if (!detect) return undefined;
  return {
    detect,
    score: p.score === undefined ? undefined : scoreSource(p.score),
    puzzle: p.puzzle === undefined ? undefined : slot(p.puzzle),
    lossIf: str(p.lossIf, 40) || undefined,
    grid: p.grid === true,
    sample: str(p.sample, 4000) ?? '',
  };
}

/** Parse a setup code. Throws Error('badCode') if it isn't a valid code. */
export function decodeGameCode(code: string): Game {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX) || trimmed.length > 20000) throw new Error('badCode');
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)));
  } catch {
    throw new Error('badCode');
  }
  if (!raw || typeof raw !== 'object') throw new Error('badCode');

  const id = str(raw.id, 100);
  const name = str(raw.name, 80)?.trim();
  const url = str(raw.url, 500);
  const resultKind = KINDS.find((k) => k === raw.resultKind);
  let validUrl = false;
  try {
    validUrl = !!url && /^https?:$/.test(new URL(url).protocol);
  } catch {
    validUrl = false;
  }
  if (!id || !/^[\w-]+$/.test(id) || !name || !validUrl || !resultKind) throw new Error('badCode');

  const unit = ['points', 'questions', 'meters', 'km'].find((u) => u === raw.unit) as Game['unit'];
  return {
    id,
    name,
    url: url!,
    lang: raw.lang === 'es' ? 'es' : 'en',
    resultKind,
    hasWinLoss: raw.hasWinLoss === true,
    maxValue: num(raw.maxValue, 0, 1e12),
    lowerIsBetter: raw.lowerIsBetter === true || undefined,
    unit,
    unitLabel: str(raw.unitLabel, 12)?.trim() || undefined,
    unitPrefix: raw.unitPrefix === true || undefined,
    decimals: num(raw.decimals, 0, 3),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string' && t.length < 30).slice(0, 10) : [],
    icon: str(raw.icon, 16) || '🎮',
    pattern: raw.pattern === undefined ? undefined : pattern(raw.pattern),
  };
}
