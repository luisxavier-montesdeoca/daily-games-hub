import { forwardRef } from 'react';
import type { TFunction } from 'i18next';
import { formatResult } from '../lib/format';
import type { Game, Result } from '../types';

export const CARD_W = 1080;
export const CARD_H = 1920;

export type ShareItem = { game: Game; result: Result };

type Props = {
  items: ShareItem[];
  dateLabel: string;
  /** e.g. "7 / 10 done" */
  summary: string;
  /** e.g. "🔥 Wordle · 42 days" */
  streakLine?: string;
  includeGrids: boolean;
  t: TFunction;
};

const HEADER_H = 300;
const FOOTER_H = 170;
const PAD = 64;
const GAP = 28;
const COMPACT_H = 84;
const COMPACT_GAP = 16;

/**
 * The tall (1080×1920) share card, rendered at full size and exported with html-to-image.
 * Fixed dark design so it looks the same whatever the app theme. Sizes are in px on purpose:
 * the card is an image, not a responsive page.
 */
const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { items, dateLabel, summary, streakLine, includeGrids, t },
  ref,
) {
  // Games with an emoji grid get big tiles; the rest go in compact rows at the bottom.
  // If no game has a grid, everything uses big tiles.
  const hasGrid = (r: Result) => includeGrids && !!r.grid;
  const anyGrid = items.some((i) => hasGrid(i.result));
  const tiles = anyGrid ? items.filter((i) => hasGrid(i.result)) : items;
  const compact = anyGrid ? items.filter((i) => !hasGrid(i.result)) : [];

  // One full-width row each, so long names like "Magnitudle: Size It Up" fit.
  const compactRows = compact.length;
  const compactH = compactRows ? compactRows * COMPACT_H + (compactRows - 1) * COMPACT_GAP + GAP : 0;

  // Tiles with tall grids (Wordle, Size It Up…) take two rows; the rest one.
  const gridOf = (r: Result) => (includeGrids && r.grid ? r.grid.split('\n') : []);
  const spans = tiles.map((i) => (gridOf(i.result).length >= 3 ? 2 : 1));
  const units = spans.reduce((a, b) => a + b, 0);
  const cols = tiles.length <= 2 ? 1 : units <= 8 ? 2 : 3;

  // Place each tile in the shortest column (keeps the order, leaves no holes in the middle).
  const heights = Array<number>(cols).fill(0);
  const placement = spans.map((span) => {
    const col = heights.indexOf(Math.min(...heights));
    const row = heights[col];
    heights[col] += span;
    return { col, row, span };
  });
  const rows = Math.max(1, ...heights);
  const unitH = (CARD_H - HEADER_H - FOOTER_H - PAD - compactH - GAP * (rows - 1)) / rows;
  const tileW = (CARD_W - PAD * 2 - GAP * (cols - 1)) / cols;

  // Smaller text when the card is crowded.
  const dense = cols === 3 || unitH < 260;
  const titleSize = dense ? 28 : 34;
  const resultSize = dense ? 40 : 52;
  const tilePad = dense ? 22 : 32;
  const textH = tilePad * 2 + titleSize * 1.25 + resultSize * 1.25 + 6;

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: 'linear-gradient(160deg, #1c1917 0%, #0c0a09 55%, #022c22 100%)',
        color: '#fafaf9',
        fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: `0 ${PAD}px`,
        boxSizing: 'border-box',
      }}
    >
      <header style={{ height: HEADER_H, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 40, opacity: 0.7, fontWeight: 600 }}>🧩 {t('app.title')}</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>{dateLabel}</div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, ${unitH}px)`,
          gap: GAP,
        }}
      >
        {tiles.map(({ game, result }, i) => {
          const gridRows = gridOf(result);
          const lost = result.outcome === 'loss';
          const { col, row, span } = placement[i];
          const tileH = unitH * span + GAP * (span - 1);
          // Fit the emoji grid in the space left under the title and result.
          // Emoji glyphs draw bigger than their font size: measured ≈1.43em wide (with the letter
          // spacing) and up to ≈1.34em tall per row (Segoe UI Emoji).
          const innerW = tileW - tilePad * 2 - 6;
          const gridCols = Math.max(1, ...gridRows.map((r) => Array.from(r).length));
          const emoji = gridRows.length
            ? Math.max(10, Math.min(48, (tileH - textH - 6) / (gridRows.length * 1.36), innerW / (gridCols * 1.45)))
            : 0;
          // Shrink long results ("Solved · 6 hints") so they fit on one line.
          const resultText = formatResult(game, result, t);
          const resultFont = Math.min(resultSize, innerW / (resultText.length * 0.62));
          return (
            <div
              key={game.id}
              style={{
                gridColumn: col + 1,
                gridRow: `${row + 1} / span ${span}`,
                borderRadius: dense ? 24 : 32,
                background: 'rgba(255,255,255,0.06)',
                border: `3px solid ${lost ? 'rgba(251,113,133,0.55)' : 'rgba(52,211,153,0.45)'}`,
                padding: tilePad,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: titleSize,
                  lineHeight: 1.25,
                  flexShrink: 0,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {game.icon} {game.name}
              </div>
              <div
                style={{
                  fontSize: resultFont,
                  lineHeight: `${resultSize * 1.25}px`,
                  flexShrink: 0,
                  fontWeight: 800,
                  marginTop: 6,
                  whiteSpace: 'nowrap',
                  color: lost ? '#fda4af' : '#6ee7b7',
                }}
              >
                {resultText}
              </div>
              {gridRows.length > 0 && (
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 6,
                    fontSize: emoji,
                    lineHeight: 1.12,
                    letterSpacing: emoji * 0.06,
                    whiteSpace: 'pre',
                  }}
                >
                  {gridRows.join('\n')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {compact.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridAutoRows: COMPACT_H,
            gap: COMPACT_GAP,
            marginTop: GAP,
          }}
        >
          {compact.map(({ game, result }) => {
            const lost = result.outcome === 'loss';
            return (
              <div
                key={game.id}
                style={{
                  borderRadius: 24,
                  background: 'rgba(255,255,255,0.06)',
                  border: `3px solid ${lost ? 'rgba(251,113,133,0.55)' : 'rgba(52,211,153,0.45)'}`,
                  padding: '0 26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {game.icon} {game.name}
                </span>
                <span style={{ fontSize: 34, fontWeight: 800, whiteSpace: 'nowrap', color: lost ? '#fda4af' : '#6ee7b7' }}>
                  {formatResult(game, result, t)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <footer
        style={{
          marginTop: 'auto',
          height: FOOTER_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          fontSize: 38,
          fontWeight: 600,
        }}
      >
        <span>{summary}</span>
        {streakLine && <span style={{ opacity: 0.85 }}>{streakLine}</span>}
      </footer>
    </div>
  );
});

export default ShareCard;
