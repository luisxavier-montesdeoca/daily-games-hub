import { describe, expect, it } from 'vitest';
import { detectGame } from './index';
import { wordle } from './wordle';
import { connections } from './connections';
import { strands } from './strands';
import { palabraDelDia } from './palabraDelDia';

/*
 * Samples follow each game's known share format.
 * When you paste a real share text that the app misreads, add it here as a new case.
 */

describe('wordle', () => {
  it('reads a win with comma-separated puzzle number', () => {
    const text = 'Wordle 1,612 3/6\n\n⬛🟨⬛⬛⬛\n🟩🟩⬛🟩⬛\n🟩🟩🟩🟩🟩';
    expect(wordle.parse(text)).toEqual({
      puzzleNumber: 1612,
      outcome: 'win',
      value: 3,
      grid: '⬛🟨⬛⬛⬛\n🟩🟩⬛🟩⬛\n🟩🟩🟩🟩🟩',
    });
  });

  it('reads hard mode, light theme and a period separator', () => {
    const r = wordle.parse('Wordle 1.612 2/6*\n\n⬜🟨⬜⬜⬜\n🟩🟩🟩🟩🟩');
    expect(r).toMatchObject({ puzzleNumber: 1612, outcome: 'win', value: 2 });
  });

  it('reads a loss', () => {
    const grid = Array(6).fill('⬛🟨⬛⬛⬛').join('\n');
    const r = wordle.parse(`Wordle 1,612 X/6\n\n${grid}`);
    expect(r).toMatchObject({ outcome: 'loss' });
    expect(r?.value).toBeUndefined();
  });

  it('reads high-contrast colors', () => {
    expect(wordle.parse('Wordle 900 4/6\n\n🟦⬛⬛⬛⬛\n🟧🟦⬛⬛⬛\n🟧🟧🟧⬛⬛\n🟧🟧🟧🟧🟧')?.grid?.split('\n')).toHaveLength(4);
  });

  it('ignores unrelated text', () => {
    expect(wordle.detect('I love Wordle')).toBe(false);
  });
});

describe('connections', () => {
  it('reads a perfect game', () => {
    const text = 'Connections\nPuzzle #523\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪';
    expect(connections.parse(text)).toMatchObject({ puzzleNumber: 523, outcome: 'win', value: 0 });
  });

  it('counts mistakes in a win', () => {
    const text = 'Connections\nPuzzle #1,024\n🟨🟩🟨🟨\n🟨🟨🟨🟨\n🟦🟪🟦🟦\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪';
    expect(connections.parse(text)).toMatchObject({ puzzleNumber: 1024, outcome: 'win', value: 2 });
  });

  it('reads a loss (4 mistakes)', () => {
    const text = 'Connections\nPuzzle #523\n🟨🟨🟨🟨\n🟩🟦🟩🟩\n🟩🟪🟩🟩\n🟦🟩🟦🟦\n🟪🟦🟪🟪';
    expect(connections.parse(text)).toMatchObject({ outcome: 'loss', value: 4 });
  });

  it('rejects an unfinished game', () => {
    expect(connections.parse('Connections\nPuzzle #523\n🟨🟨🟨🟨\n🟩🟦🟩🟩')).toBeNull();
  });
});

describe('strands', () => {
  it('reads hints and theme', () => {
    const text = 'Strands #250\n“Hit the road”\n💡🔵🔵🔵\n🔵💡🟡🔵';
    expect(strands.parse(text)).toMatchObject({
      puzzleNumber: 250,
      outcome: 'n/a',
      value: 2,
      note: 'Hit the road',
    });
  });

  it('reads zero hints', () => {
    expect(strands.parse('Strands #251\n"Theme"\n🔵🔵🟡🔵\n🔵🔵')).toMatchObject({ value: 0 });
  });
});

describe('palabra del día (best effort)', () => {
  it('reads "La palabra del día #N n/6"', () => {
    const text = 'La palabra del día #1234 4/6\n\n⬜🟨⬜⬜⬜\n⬜🟩🟨⬜⬜\n🟩🟩⬜🟩⬜\n🟩🟩🟩🟩🟩';
    expect(palabraDelDia.parse(text)).toMatchObject({ puzzleNumber: 1234, outcome: 'win', value: 4 });
  });

  it('reads a hashtag-style header with a loss', () => {
    expect(palabraDelDia.parse('#LaPalabraDelDía 1234 X/6')).toMatchObject({ puzzleNumber: 1234, outcome: 'loss' });
  });

  it('infers the result from the grid when there is no n/6', () => {
    const text = 'La Palabra del Día\n⬜🟨⬜⬜⬜\n🟩🟩🟩🟩🟩';
    expect(palabraDelDia.parse(text)).toMatchObject({ outcome: 'win', value: 2, puzzleNumber: undefined });
  });
});

describe('detectGame', () => {
  it.each([
    ['Wordle 1,612 3/6\n🟩🟩🟩🟩🟩', 'wordle'],
    ['Connections\nPuzzle #523\n🟨🟨🟨🟨', 'connections'],
    ['Strands #250\n🔵', 'strands'],
    ['La palabra del día #12 2/6', 'palabra-del-dia'],
  ])('detects %#', (text, gameId) => {
    expect(detectGame(text)?.gameId).toBe(gameId);
  });

  it('returns null for unknown text', () => {
    expect(detectGame('Krillion 540 points')).toBeNull();
  });
});
