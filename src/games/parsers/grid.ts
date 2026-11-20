/**
 * Helpers for the emoji grids in share texts.
 * Covers colored squares 🟥🟧🟨🟩🟦🟪🟫, ⬛⬜, and Strands' 🔵🟡💡.
 */
const CELL = /[\u{1F7E5}-\u{1F7EB}⬛⬜\u{1F535}\u{1F7E1}\u{1F4A1}]/u;
const GRID_LINE = /^(?:[\u{1F7E5}-\u{1F7EB}⬛⬜\u{1F535}\u{1F7E1}\u{1F4A1}]️?)+$/u;

/** Grid lines in the text, with whitespace and variation selectors removed. */
export function gridRows(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/[\s️]/g, ''))
    .filter((l) => l.length > 0 && GRID_LINE.test(l));
}

/** Split a grid row into its emoji cells (code points, not UTF-16 units). */
export function cells(row: string): string[] {
  return Array.from(row).filter((c) => CELL.test(c));
}

/** Wordle-style "all correct" row: every cell green (or orange in high-contrast mode). */
export function isAllCorrect(row: string): boolean {
  const cs = cells(row);
  return cs.length > 0 && (cs.every((c) => c === '🟩') || cs.every((c) => c === '🟧'));
}

/** Parse "1,612" / "1.612" / "1612" → 1612. */
export function parseNumber(s: string): number | undefined {
  const n = Number(s.replace(/[^\d]/g, ''));
  return s && Number.isFinite(n) ? n : undefined;
}

// Keycaps (6️⃣) and flags (🇪🇸) count too; variation selectors are already stripped.
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[0-9#*]⃣|‍|️)+$/u;

/**
 * Lines made only of emoji (any emoji, not just squares), e.g. ⚪⚪🟡🟣 or 🦑🐟🫧.
 * `clean` runs first on each line (e.g. to drop a trailing number). Whitespace and variation selectors are removed.
 */
export function emojiRows(text: string, clean: (line: string) => string = (l) => l): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => clean(l).replace(/[\s️]/g, ''))
    .filter((l) => l.length > 0 && EMOJI_ONLY.test(l));
}

/** Non-empty trimmed lines. */
export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
