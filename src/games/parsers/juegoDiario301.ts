import { emojiRows, gridRows, lines, parseNumber } from './grid';
import type { Parser } from './types';

/* The three games from 301juegodiario.com. */

/*
 * 301 · Día #33
 * Ranking de los países por tasa de fertilidad (hijos por mujer)
 * 🎯💥🎯💥💥 → quedan 7
 * 301juegodiario.com
 *
 * A perfect game (exactly 0 left) says "→ ¡DIANA!" (or "→ BULLSEYE!" in English) instead of a number.
 *
 * Value = points left (lower is better). The category goes in the note.
 */
const H301 = /^\s*301\s*[·•-]\s*(?:D[ií]a|Day)\s*#\s*(\d+)/im;
const BULLSEYE = /¡?\s*(?:diana|bullseye)\s*!?/i;
// "quedan 7" / "queda 7" / "7 left" / "left: 7"
const LEFT = /(?:quedan?|left:?)\s+([\d.,]+)|([\d.,]+)\s+left\b/i;
/** The darts line: the one with "→" first, so a category like "Palabras con diana" isn't mistaken for it. */
function findResultLine(rest: string[]): string {
  return (
    rest.find((l) => /→|->/.test(l)) ??
    rest.find((l) => LEFT.test(l)) ??
    rest.find((l) => new RegExp(`^\\s*${BULLSEYE.source}\\s*$`, 'i').test(l)) ??
    ''
  );
}

export const game301: Parser = {
  gameId: '301',
  detect: (text) => H301.test(text),
  parse: (text) => {
    const m = text.match(H301);
    if (!m) return null;
    const all = lines(text);
    const resultLine = findResultLine(all.slice(1));
    const left = resultLine.match(LEFT);
    const value = left ? parseNumber(left[1] ?? left[2]) : BULLSEYE.test(resultLine) ? 0 : undefined;
    if (value === undefined) return null;
    const darts = emojiRows(resultLine.split(/→|->/)[0]);
    const category = all.slice(1).find((l) => l !== resultLine && !/301juegodiario/i.test(l));
    return {
      puzzleNumber: Number(m[1]),
      outcome: 'n/a',
      value,
      grid: darts[0],
      note: category,
    };
  },
};

/*
 * Pop · Día #32 · Medio
 * 3/5 aciertos
 * ✅✅✅*POP*⬜
 * 301juegodiario.com
 *
 * Value = numbers found (of 5). Difficulty goes in the note. "*POP*" becomes 💥 in the grid.
 */
const HPOP = /^\s*Pop\s*[·•-]\s*D[ií]a\s*#\s*(\d+)(?:[ \t]*[·•-][ \t]*([^\n]+))?/im;

export const pop: Parser = {
  gameId: 'pop-301',
  detect: (text) => HPOP.test(text),
  parse: (text) => {
    const m = text.match(HPOP);
    const score = text.match(/(\d+)\s*\/\s*\d+\s*aciertos?/i);
    if (!m || !score) return null;
    const rows = emojiRows(text, (l) => l.replace(/\*?POP\*?/gi, '💥'));
    return {
      puzzleNumber: Number(m[1]),
      outcome: 'n/a',
      value: Number(score[1]),
      grid: rows.length ? rows.join('\n') : undefined,
      note: m[2]?.trim(),
    };
  },
};

/*
 * Atrapa la respuesta · Día #32
 * 🎯 421/700 puntos
 * 🟧🟩🟨🟨🟨🟧🟧
 * 301juegodiario.com
 */
const HATRAPA = /^\s*Atrapa la respuesta\s*[·•-]\s*D[ií]a\s*#\s*(\d+)/im;

export const atrapa: Parser = {
  gameId: 'atrapa',
  detect: (text) => HATRAPA.test(text),
  parse: (text) => {
    const m = text.match(HATRAPA);
    const score = text.match(/([\d.,]+)\s*\/\s*[\d.,]+\s*puntos?/i);
    if (!m || !score) return null;
    const rows = gridRows(text);
    return {
      puzzleNumber: Number(m[1]),
      outcome: 'n/a',
      value: parseNumber(score[1]),
      grid: rows.length ? rows.join('\n') : undefined,
    };
  },
};
