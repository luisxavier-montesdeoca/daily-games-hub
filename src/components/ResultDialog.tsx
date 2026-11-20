import { valueLabel } from '../lib/format';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDialogClose } from '../lib/dialog';
import { useTranslation } from 'react-i18next';
import { db, deleteResult, resultId, saveResult, useAllGames } from '../db';
import type { Parsed } from '../games/parsers';
import { detectAmong, parserFor } from '../games/parsers/forGame';
import type { Game, Outcome, Result } from '../types';

type Props = {
  game: Game;
  /** Date to pre-fill; can be changed in the form to backfill past days. */
  date: string;
  existing?: Result;
  /** Share text to read on open (from the paste-anything box). */
  initialRaw?: string;
  onClose: () => void;
  /** Open the game editor to teach the app this share text's format. */
  onTeach?: (sample: string) => void;
};

/** Status of reading the pasted share text. */
type ParseStatus = { kind: 'ok' } | { kind: 'fail' } | { kind: 'otherGame'; name: string } | null;

/** Range for the value field, per result kind. `required` = must be filled. */
function valueRules(game: Game, outcome: Outcome) {
  switch (game.resultKind) {
    case 'guesses':
      return { show: outcome === 'win', required: true, min: 1, max: game.maxValue };
    case 'mistakes':
      return { show: true, required: true, min: 0, max: game.maxValue };
    case 'hints':
    case 'solved':
      return { show: true, required: false, min: 0, max: undefined };
    case 'score':
      return { show: true, required: true, min: 0, max: game.maxValue };
    case 'generic':
      return { show: true, required: false, min: 0, max: undefined };
  }
}

const input =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-950';

export default function ResultDialog({ game, date: initialDate, existing, initialRaw, onClose, onTeach }: Props) {
  const { t } = useTranslation();
  const allGames = useAllGames();
  const ref = useRef<HTMLDialogElement>(null);
  const { finish, close } = useDialogClose(ref, onClose);

  const [date, setDate] = useState(existing?.date ?? initialDate);
  const [outcome, setOutcome] = useState<Outcome>(existing?.outcome ?? (game.hasWinLoss ? 'win' : 'n/a'));
  const [value, setValue] = useState(existing?.value?.toString() ?? '');
  const [puzzleNumber, setPuzzleNumber] = useState(existing?.puzzleNumber?.toString() ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [raw, setRaw] = useState(existing?.rawShareText ?? '');
  const [grid, setGrid] = useState(existing?.grid);
  const [parseStatus, setParseStatus] = useState<ParseStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(!!existing);

  const parser = parserFor(game);
  const decimals = game.resultKind === 'score' ? (game.decimals ?? 0) : 0;

  function applyParsed(p: Parsed) {
    setOutcome(p.outcome);
    setValue(p.value?.toString() ?? '');
    if (p.puzzleNumber !== undefined) setPuzzleNumber(String(p.puzzleNumber));
    setGrid(p.grid);
    if (p.note) setNote((n) => n || p.note!);
    setError(null);
  }

  /** Store the pasted text and, if this game has a parser, fill the form from it. */
  function readShareText(text: string) {
    setRaw(text);
    if (!text.trim()) return setParseStatus(null);
    if (parser?.detect(text)) {
      const p = parser.parse(text);
      if (p) {
        applyParsed(p);
        return setParseStatus({ kind: 'ok' });
      }
      return setParseStatus({ kind: 'fail' });
    }
    const other = detectAmong(text, allGames?.map((e) => e.game) ?? []);
    if (other && other.game.id !== game.id) {
      return setParseStatus({ kind: 'otherGame', name: other.game.name });
    }
    setParseStatus(parser ? { kind: 'fail' } : null);
  }

  useEffect(() => {
    // Guard: React StrictMode runs effects twice in dev.
    if (ref.current && !ref.current.open) ref.current.showModal();
    if (initialRaw) {
      readShareText(initialRaw);
      // Values came from the share text: focus Save so Enter confirms.
      ref.current?.querySelector<HTMLButtonElement>('[data-save]')?.focus();
      return;
    }
    // showModal() moves focus to the first field; put it on the value field instead.
    ref.current?.querySelector<HTMLInputElement>('[data-autofocus]')?.focus();
  }, []);

  // When the date changes (backfill), load that day's saved result, if any.
  useEffect(() => {
    if (date === (existing?.date ?? initialDate)) return;
    db.results.get(resultId(game.id, date)).then((r) => {
      setIsEdit(!!r);
      if (!r) return;
      setOutcome(r.outcome);
      setValue(r.value?.toString() ?? '');
      setPuzzleNumber(r.puzzleNumber?.toString() ?? '');
      setNote(r.note ?? '');
      setRaw(r.rawShareText ?? '');
      setGrid(r.grid);
      setParseStatus(null);
    });
  }, [date, game.id, existing?.date, initialDate]);

  const rules = valueRules(game, outcome);
  const outcomeLabels =
    game.resultKind === 'solved'
      ? { win: t('dialog.solved'), loss: t('dialog.revealed') }
      : { win: t('dialog.win'), loss: t('dialog.loss') };

  function parseValue(): number | undefined | 'invalid' {
    if (!rules.show) return undefined;
    const s = value.trim();
    if (s === '') {
      if (rules.required) {
        setError(t('dialog.errRequired'));
        return 'invalid';
      }
      return undefined;
    }
    const n = Number(s.replace(',', '.'));
    const places = (s.split(/[.,]/)[1] ?? '').length;
    if (!Number.isFinite(n) || places > decimals || n < rules.min || (rules.max !== undefined && n > rules.max)) {
      const key = decimals ? 'Dec' : '';
      setError(
        rules.max !== undefined
          ? t(`dialog.errRange${key}`, { min: rules.min, max: rules.max, decimals })
          : t(`dialog.errMin${key}`, { min: rules.min, decimals }),
      );
      return 'invalid';
    }
    return n;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const v = parseValue();
    if (v === 'invalid') return;
    const pn = puzzleNumber.trim() ? Number(puzzleNumber) : undefined;
    await saveResult({
      gameId: game.id,
      date,
      outcome,
      value: v,
      puzzleNumber: pn !== undefined && Number.isInteger(pn) ? pn : undefined,
      grid: grid || undefined,
      note: note.trim() || undefined,
      rawShareText: raw.trim() || undefined,
    });
    // If an existing result was moved to another date, remove the old one.
    if (existing && existing.date !== date) await deleteResult(game.id, existing.date);
    close();
  }

  async function onDelete() {
    if (!confirm(t('dialog.confirmDelete'))) return;
    await deleteResult(game.id, date);
    close();
  }

  return (
    <dialog
      ref={ref}
      onClose={finish}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-stone-900 shadow-xl dark:bg-stone-900 dark:text-stone-100"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">
          {game.icon} {t(isEdit ? 'dialog.titleEdit' : 'dialog.titleNew', { game: game.name })}
        </h2>

        <label className="flex flex-col gap-1 text-sm">
          {t('dialog.date')}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor="share-text">{t('dialog.paste')}</label>
          <textarea
            id="share-text"
            value={raw}
            onChange={(e) => readShareText(e.target.value)}
            rows={4}
            placeholder={t(parser ? 'dialog.pastePlaceholderParsed' : 'dialog.pastePlaceholder')}
            className={`${input} font-mono text-xs`}
          />
          {parseStatus?.kind === 'ok' && (
            <p className="text-emerald-700 dark:text-emerald-400">✓ {t('dialog.parseOk')}</p>
          )}
          {parseStatus?.kind === 'fail' && (
            <p className="text-amber-700 dark:text-amber-400">{t('dialog.parseFail')}</p>
          )}
          {onTeach && raw.trim() && parseStatus?.kind !== 'ok' && parseStatus?.kind !== 'otherGame' && (
            <button
              type="button"
              onClick={() => onTeach(raw)}
              className="self-start text-left text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              🎓 {t(parser ? 'dialog.reteach' : 'dialog.teach', { game: game.name })}
            </button>
          )}
          {parseStatus?.kind === 'otherGame' && (
            <p className="text-amber-700 dark:text-amber-400">{t('dialog.parseOtherGame', { game: parseStatus.name })}</p>
          )}
        </div>

        {grid && (
          <pre aria-label={t('dialog.grid')} className="self-start text-lg leading-tight">
            {grid}
          </pre>
        )}

        {game.hasWinLoss && (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1">{t('dialog.outcome')}</legend>
            <div className="flex gap-2">
              {(['win', 'loss'] as const).map((o) => (
                <label
                  key={o}
                  className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center ${
                    outcome === o
                      ? o === 'win'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                        : 'border-rose-500 bg-rose-50 dark:bg-rose-950'
                      : 'border-stone-300 dark:border-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="outcome"
                    value={o}
                    checked={outcome === o}
                    onChange={() => setOutcome(o)}
                    className="sr-only"
                  />
                  {outcomeLabels[o]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-3">
          {rules.show && (
            <label className="flex flex-col gap-1 text-sm">
              {valueLabel(game, t)}
              {rules.max !== undefined && <span className="text-xs text-stone-500">{`${rules.min}–${rules.max}`}</span>}
              <input
                type="number"
                inputMode={decimals ? 'decimal' : 'numeric'}
                step={decimals ? 1 / 10 ** decimals : 1}
                min={rules.min}
                max={rules.max}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={input}
                data-autofocus
              />
            </label>
          )}
          <label className="flex flex-col justify-end gap-1 text-sm">
            {t('dialog.puzzleNumber')}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={puzzleNumber}
              onChange={(e) => setPuzzleNumber(e.target.value)}
              className={input}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          {t('dialog.note')}
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </label>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {isEdit && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
            >
              {t('dialog.delete')}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              {t('dialog.cancel')}
            </button>
            <button
              type="submit"
              data-save
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t('dialog.save')}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
