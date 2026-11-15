import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toBlob } from 'html-to-image';
import { useAllResults } from '../db';
import { formatResult } from '../lib/format';
import { parseLocalDate } from '../lib/date';
import { streaks } from '../lib/stats';
import ShareCard, { CARD_H, CARD_W, type ShareItem } from './ShareCard';
import type { Game, Result } from '../types';

type Props = {
  date: string;
  games: Game[];
  results: Record<string, Result>;
  onClose: () => void;
};

const PREVIEW_SCALE = 0.3;

const btn =
  'rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800';

/** "Share today" (FR-16..FR-20): tall PNG card + plain-text summary. */
export default function ShareDialog({ date, games, results, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const allResults = useAllResults();

  const played = games.filter((g) => results[g.id]);
  const [included, setIncluded] = useState(() => new Set(played.map((g) => g.id)));
  const [includeGrids, setIncludeGrids] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  const items: ShareItem[] = played.filter((g) => included.has(g.id)).map((g) => ({ game: g, result: results[g.id] }));

  const dateLabel = parseLocalDate(date).toLocaleDateString(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const summary = t('share.summary', { done: played.length, total: games.length });

  // Longest current play streak among the games on the card.
  const streakLine = (() => {
    if (!allResults) return undefined;
    let best: { name: string; n: number } | null = null;
    for (const { game } of items) {
      const n = streaks(
        allResults.filter((r) => r.gameId === game.id).map((r) => r.date),
        date,
      ).current;
      if (n > 1 && n > (best?.n ?? 0)) best = { name: game.name, n };
    }
    return best ? t('share.streak', { game: best.name, count: best.n }) : undefined;
  })();

  const text = [
    `🧩 ${t('app.title')} · ${dateLabel}`,
    '',
    ...items.flatMap(({ game, result }) => {
      const line = `${game.icon} ${game.name}: ${formatResult(game, result, t)}`;
      return includeGrids && result.grid ? [line, result.grid, ''] : [line];
    }),
    ...(includeGrids ? [] : ['']),
    summary + (streakLine ? ` · ${streakLine}` : ''),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  async function renderPng(): Promise<Blob> {
    if (!cardRef.current) throw new Error('no card');
    // Render the full-size card (the preview is only CSS-scaled by its wrapper).
    const blob = await toBlob(cardRef.current, { width: CARD_W, height: CARD_H, pixelRatio: 1, skipFonts: true });
    if (!blob) throw new Error('render failed');
    return blob;
  }

  async function run(action: () => Promise<void>, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      setMsg({ ok: true, text: okText });
    } catch (e) {
      console.error(e);
      const blocked = e instanceof DOMException && e.name === 'NotAllowedError';
      setMsg({ ok: false, text: t(blocked ? 'share.clipboardBlocked' : 'share.error') });
    } finally {
      setBusy(false);
    }
  }

  const copyImage = () =>
    run(async () => {
      // Passing a Promise keeps the clipboard write tied to the click (needed by some browsers).
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPng() })]);
    }, t('share.copiedImage'));

  const download = () =>
    run(async () => {
      const blob = await renderPng();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `daily-games-${date}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, t('share.downloaded'));

  const copyText = () => run(() => navigator.clipboard.writeText(text), t('share.copiedText'));

  const toggle = (id: string) =>
    setIncluded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-stone-900 shadow-xl dark:bg-stone-900 dark:text-stone-100"
    >
      <div className="flex flex-col gap-5 p-5 md:flex-row">
        {/* Preview: the real card, scaled down with CSS. */}
        <div
          className="shrink-0 self-center overflow-hidden rounded-lg shadow-lg md:self-start"
          style={{ width: CARD_W * PREVIEW_SCALE, height: CARD_H * PREVIEW_SCALE }}
          aria-label={t('share.preview')}
        >
          <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
            <ShareCard
              ref={cardRef}
              items={items}
              dateLabel={dateLabel}
              summary={summary}
              streakLine={streakLine}
              includeGrids={includeGrids}
              t={t}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <h2 className="text-lg font-semibold">{t('share.title')}</h2>

          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1 font-medium">{t('share.gamesOnCard')}</legend>
            {played.map((g) => (
              <label key={g.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={included.has(g.id)}
                  onChange={() => toggle(g.id)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span aria-hidden>{g.icon}</span> {g.name}
                <span className="ml-auto text-stone-500">{formatResult(g, results[g.id], t)}</span>
              </label>
            ))}
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeGrids}
              onChange={(e) => setIncludeGrids(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            {t('share.includeGrids')}
          </label>

          <details className="text-sm">
            <summary className="cursor-pointer text-stone-500">{t('share.textPreview')}</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-stone-100 p-3 text-xs dark:bg-stone-950">
              {text}
            </pre>
          </details>

          <div className="mt-auto flex flex-wrap gap-2">
            <button
              onClick={copyImage}
              disabled={busy || items.length === 0}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              📋 {t('share.copyImage')}
            </button>
            <button onClick={download} disabled={busy || items.length === 0} className={btn}>
              ⬇ {t('share.download')}
            </button>
            <button onClick={copyText} disabled={busy || items.length === 0} className={btn}>
              {t('share.copyText')}
            </button>
            <button onClick={() => dialogRef.current?.close()} className={`${btn} ml-auto`}>
              {t('share.close')}
            </button>
          </div>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
