import { describe, expect, it } from 'vitest';
import { detectGame } from './index';

/*
 * Real share texts, pasted from each game (Nov 2026).
 * When a game changes its format, paste the new text here as another case.
 */

const MINUTE_CRYPTIC = `Minute Cryptic - 15 November, 2026
"Red Sox lost 11-1, reeling after debut of rookie Yankee" (4)
⚪️⚪️🟡🟡🟡🟡🟣
🏋 6 hints – 4 over the community par (144,053 solvers so far).
https://www.minutecryptic.com/?utm_source=share`;

const KRILLION = `Krillion #123 🦐
305

⬛🏮🦑🦑🐟🫧🦑`;

const NOILLIRK = `Noillirk #32 · 8,840m
Everest Height
🟡🟡🟠🔵🟡🟠🟠🟡⚪🟡
Mind Reader`;

const FARFLUNG = `Farflung #42 · 140/500 km
Farflung · Miss · Common · Miss · Miss
https://farflung.game/s/jgjhq7?e=42`;

const G301 = `301 · Día #33
Ranking de los países por tasa de fertilidad (hijos por mujer)
🎯💥🎯💥💥 → quedan 7
301juegodiario.com`;

const POP = `Pop · Día #32 · Medio
3/5 aciertos
✅✅✅*POP*⬜
301juegodiario.com`;

const ATRAPA = `Atrapa la respuesta · Día #32
🎯 421/700 puntos
🟧🟩🟨🟨🟨🟧🟧
301juegodiario.com`;

const SIZE_IT_UP = `Size It Up
#98

Score: 215/500

⬜⬜⬜⬜⬜ 9
🟥🟥🟥🟥🟥 100
🟥🟥🟥🟥⬜ 72
⬜⬜⬜⬜⬜ 0
🟥🟥⬜⬜⬜ 34

https://magnitudle.com/size-it-up`;

describe('real share texts', () => {
  it('Minute Cryptic: solved, 6 hints, par in the note', () => {
    expect(detectGame(MINUTE_CRYPTIC)).toEqual({
      gameId: 'minute-cryptic',
      parsed: {
        outcome: 'win',
        value: 6,
        grid: '⚪⚪🟡🟡🟡🟡🟣',
        note: '4 over the community par',
      },
    });
  });

  it('Minute Cryptic: no hints, revealed', () => {
    const text = MINUTE_CRYPTIC.replace('6 hints – 4 over', 'no hints – revealed – 2 under');
    expect(detectGame(text)?.parsed).toMatchObject({ outcome: 'loss', value: 0 });
  });

  it('Krillion: 305 points, puzzle #123', () => {
    expect(detectGame(KRILLION)).toEqual({
      gameId: 'krillion',
      parsed: { puzzleNumber: 123, outcome: 'n/a', value: 305, grid: '⬛🏮🦑🦑🐟🫧🦑' },
    });
  });

  it('Noillirk: 8,840 m, milestone and rank in the note', () => {
    expect(detectGame(NOILLIRK)).toEqual({
      gameId: 'noillirk',
      parsed: {
        puzzleNumber: 32,
        outcome: 'n/a',
        value: 8840,
        grid: '🟡🟡🟠🔵🟡🟠🟠🟡⚪🟡',
        note: 'Everest Height · Mind Reader',
      },
    });
  });

  it('Farflung: 140 km, rounds in the note', () => {
    expect(detectGame(FARFLUNG)).toEqual({
      gameId: 'farflung',
      parsed: { puzzleNumber: 42, outcome: 'n/a', value: 140, note: 'Farflung · Miss · Common · Miss · Miss' },
    });
  });

  it('301: 7 left, darts as the grid, category in the note', () => {
    expect(detectGame(G301)).toEqual({
      gameId: '301',
      parsed: {
        puzzleNumber: 33,
        outcome: 'n/a',
        value: 7,
        grid: '🎯💥🎯💥💥',
        note: 'Ranking de los países por tasa de fertilidad (hijos por mujer)',
      },
    });
  });

  it('301: a perfect game says ¡DIANA! / BULLSEYE! instead of a number → 0', () => {
    const diana = G301.replace('→ quedan 7', '→ ¡DIANA!');
    expect(detectGame(diana)?.parsed).toEqual({
      puzzleNumber: 33,
      outcome: 'n/a',
      value: 0,
      grid: '🎯💥🎯💥💥',
      note: 'Ranking de los países por tasa de fertilidad (hijos por mujer)',
    });
    expect(detectGame(G301.replace('→ quedan 7', '→ BULLSEYE!'))?.parsed).toMatchObject({ value: 0, grid: '🎯💥🎯💥💥' });
    // English header and wording, too.
    const en = '301 · Day #33\nCountries by fertility rate\n🎯💥🎯💥💥 → 7 left\n301juegodiario.com';
    expect(detectGame(en)?.parsed).toMatchObject({ value: 7, puzzleNumber: 33, note: 'Countries by fertility rate' });
    expect(detectGame(en.replace('→ 7 left', '→ BULLSEYE!'))?.parsed).toMatchObject({ value: 0 });
  });

  it('301: a category that mentions "diana" is not a bullseye', () => {
    const text = '301 · Día #40\nPalabras con diana\n🎯💥 → quedan 120\n301juegodiario.com';
    expect(detectGame(text)?.parsed).toMatchObject({ value: 120, note: 'Palabras con diana' });
  });

  it('Pop: 3 of 5, *POP* shown as 💥, difficulty in the note', () => {
    expect(detectGame(POP)).toEqual({
      gameId: 'pop-301',
      parsed: { puzzleNumber: 32, outcome: 'n/a', value: 3, grid: '✅✅✅💥⬜', note: 'Medio' },
    });
  });

  it('Atrapa la respuesta: 421 points', () => {
    expect(detectGame(ATRAPA)).toEqual({
      gameId: 'atrapa',
      parsed: { puzzleNumber: 32, outcome: 'n/a', value: 421, grid: '🟧🟩🟨🟨🟨🟧🟧' },
    });
  });

  it('Size It Up: 215 points, grid without the round numbers', () => {
    expect(detectGame(SIZE_IT_UP)).toEqual({
      gameId: 'size-it-up',
      parsed: {
        puzzleNumber: 98,
        outcome: 'n/a',
        value: 215,
        grid: '⬜⬜⬜⬜⬜\n🟥🟥🟥🟥🟥\n🟥🟥🟥🟥⬜\n⬜⬜⬜⬜⬜\n🟥🟥⬜⬜⬜',
      },
    });
  });

  it('every built-in game except La Palabra del Día has a real sample here', () => {
    const ids = [MINUTE_CRYPTIC, KRILLION, NOILLIRK, FARFLUNG, G301, POP, ATRAPA, SIZE_IT_UP].map(
      (t) => detectGame(t)?.gameId,
    );
    expect(new Set(ids).size).toBe(8);
  });

  it('pasted with Windows line endings', () => {
    expect(detectGame(POP.replace(/\n/g, '\r\n'))?.parsed).toMatchObject({ value: 3, note: 'Medio' });
  });
});
