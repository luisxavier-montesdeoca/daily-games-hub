import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { addCustomGame, db, isBuiltIn, resetGame, saveGame } from '../db';
import { formatResult } from '../lib/format';
import {
  buildSlot,
  defaultDetect,
  gridEmoji,
  matchesDetect,
  parseWithPattern,
  patternGrid,
  slotTokenIndex,
  tokenize,
  type Token,
} from '../lib/pattern';
import { encodeGameCode } from '../lib/shareCode';
import { useDialogClose } from '../lib/dialog';
import type { Game, ResultKind, ScoreSource, SharePattern } from '../types';

type Props = {
  /** The game to edit, or null to create a new one. */
  game: Game | null;
  /** A share text to teach from (pasted somewhere else). Replaces the stored example. */
  initialSample?: string;
  onClose: () => void;
  /** Called with the saved game (before onClose). */
  onSaved?: (game: Game) => void;
};

const KINDS: ResultKind[] = ['score', 'guesses', 'mistakes', 'hints', 'solved', 'generic'];
type ScoreFrom = 'number' | 'emojiCount' | 'gridRows' | 'none';

const input =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950';
const btn =
  'rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800';

export function slug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `custom-${base || 'game'}-${Date.now().toString(36)}`;
}

/** Win/loss follows the result type, except "generic" where the user decides. */
const winLossFor = (kind: ResultKind, generic: boolean) =>
  kind === 'generic' ? generic : kind === 'guesses' || kind === 'mistakes' || kind === 'solved';

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  );
}

/**
 * Edit any game: its basics, how its result is measured (type, unit, decimals, lower-is-better),
 * and its share-text format, taught by example.
 */
export default function GameEditor({ game, initialSample, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const { finish, close } = useDialogClose(ref, onClose);
  const builtIn = !!game && isBuiltIn(game.id);
  // Built-in game with saved edits: offer "Reset to default".
  const edited = useLiveQuery(async () => (builtIn ? !!(await db.overrides.get(game!.id)) : false), [game?.id]);
  const p = game?.pattern;

  // --- basics & result schema
  const [name, setName] = useState(game?.name ?? '');
  const [url, setUrl] = useState(game?.url ?? '');
  const [icon, setIcon] = useState(game?.icon ?? '');
  const [lang, setLang] = useState<'en' | 'es'>(game?.lang ?? 'en');
  const [kind, setKind] = useState<ResultKind>(game?.resultKind ?? 'score');
  const [genericWinLoss, setGenericWinLoss] = useState(game?.resultKind === 'generic' && game.hasWinLoss);
  const [max, setMax] = useState(game?.maxValue?.toString() ?? '');
  const [lower, setLower] = useState(!!game?.lowerIsBetter);
  const [unitLabel, setUnitLabel] = useState(game?.unitLabel ?? '');
  const [unitPrefix, setUnitPrefix] = useState(!!game?.unitPrefix);
  const [decimals, setDecimals] = useState(game?.decimals ?? 0);

  // --- taught share-text format
  const [sample, setSample] = useState(initialSample ?? p?.sample ?? '');
  const [detect, setDetect] = useState(initialSample ? defaultDetect(initialSample) : (p?.detect ?? ''));
  const [scoreFrom, setScoreFrom] = useState<ScoreFrom>(p?.score?.from ?? (kind === 'generic' ? 'none' : 'number'));
  const [emoji, setEmoji] = useState(p?.score?.from === 'emojiCount' ? p.score.emoji : '');
  const [lossIf, setLossIf] = useState(p?.lossIf ?? '');
  const [keepGrid, setKeepGrid] = useState(p?.grid ?? true);
  const [role, setRole] = useState<'score' | 'puzzle'>('score');
  const [scoreIdx, setScoreIdx] = useState(() =>
    !initialSample && p?.score?.from === 'number' ? slotTokenIndex(p.sample, p.score.slot) : -1,
  );
  const [puzzleIdx, setPuzzleIdx] = useState(() => (!initialSample && p?.puzzle ? slotTokenIndex(p.sample, p.puzzle) : -1));
  const [tryText, setTryText] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const tokens = useMemo(() => tokenize(sample), [sample]);
  const emojis = useMemo(() => gridEmoji(sample), [sample]);
  const hasGrid = useMemo(() => patternGrid(sample).length > 0, [sample]);
  const hasWinLoss = winLossFor(kind, genericWinLoss);

  function changeSample(text: string) {
    setSample(text);
    setScoreIdx(-1);
    setPuzzleIdx(-1);
    if (!detect.trim() || detect === defaultDetect(sample)) setDetect(defaultDetect(text));
  }

  function clickNumber(i: number) {
    if (role === 'score') {
      setScoreIdx(scoreIdx === i ? -1 : i);
      setScoreFrom('number');
      if (puzzleIdx === i) setPuzzleIdx(-1);
    } else {
      setPuzzleIdx(puzzleIdx === i ? -1 : i);
      if (scoreIdx === i) setScoreIdx(-1);
    }
  }

  /** The game as currently set up in the form (no validation). */
  function draftGame(): Game {
    const maxValue = max.trim() === '' ? undefined : Number(max);
    const score = kind === 'score';
    return {
      id: game?.id ?? slug(name),
      name: name.trim(),
      url: url.trim(),
      lang,
      resultKind: kind,
      hasWinLoss,
      maxValue: Number.isFinite(maxValue) ? maxValue : undefined,
      lowerIsBetter: score && lower ? true : undefined,
      unit: game?.unit,
      unitLabel: score && unitLabel.trim() ? unitLabel.trim() : undefined,
      unitPrefix: score && unitLabel.trim() && unitPrefix ? true : undefined,
      decimals: score && decimals ? decimals : undefined,
      tags: game?.tags ?? [],
      icon: icon.trim() || '🎮',
      custom: game ? game.custom : true,
      pattern: draftPattern(),
    };
  }

  function draftPattern(): SharePattern | undefined {
    if (!sample.trim()) return undefined;
    let score: ScoreSource | undefined;
    if (scoreFrom === 'number' && scoreIdx >= 0) score = { from: 'number', slot: buildSlot(sample, scoreIdx) };
    else if (scoreFrom === 'emojiCount' && emoji) score = { from: 'emojiCount', emoji };
    else if (scoreFrom === 'gridRows') score = { from: 'gridRows' };
    return {
      detect: detect.trim(),
      score,
      puzzle: puzzleIdx >= 0 ? buildSlot(sample, puzzleIdx) : undefined,
      lossIf: hasWinLoss && lossIf.trim() ? lossIf.trim() : undefined,
      grid: keepGrid,
      sample,
    };
  }

  function validate(g: Game): string | null {
    if (!g.name) return t('editor.errName');
    try {
      if (!/^https?:$/.test(new URL(g.url).protocol)) throw new Error();
    } catch {
      return t('settings.errUrl');
    }
    if (g.maxValue !== undefined && g.maxValue < 0) return t('editor.errMax');
    if (sample.trim()) {
      if (!detect.trim()) return t('editor.errDetect');
      if (scoreFrom === 'number' && scoreIdx < 0) return t('editor.errScore');
      if (scoreFrom === 'emojiCount' && !emoji) return t('editor.errEmoji');
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const g = draftGame();
    const err = validate(g);
    if (err) return setError(err);
    if (game) await saveGame(g);
    else await addCustomGame(g);
    onSaved?.(g);
    close();
  }

  async function onReset() {
    if (!game || !confirm(t('editor.confirmReset', { game: game.name }))) return;
    await resetGame(game.id);
    close();
  }

  async function copyCode() {
    const g = draftGame();
    const err = validate(g);
    if (err) return setError(err);
    try {
      await navigator.clipboard.writeText(encodeGameCode(g));
      setMsg(t('editor.codeCopied'));
    } catch {
      setMsg(null);
      setError(t('share.clipboardBlocked'));
    }
  }

  // Live preview: read the example (and an optional second text) with the pattern being built.
  const draft = draftGame();
  const pattern = draft.pattern;
  const preview = (text: string) => {
    if (!pattern || !text.trim()) return null;
    if (!matchesDetect(text, pattern.detect))
      return { ok: false, text: t('editor.previewNoMatch', { detect: pattern.detect }) };
    const parsed = parseWithPattern(text, pattern, draft);
    if (!parsed) return { ok: false, text: t('editor.previewNoScore') };
    const shown = formatResult(draft, { id: '', gameId: draft.id, date: '', createdAt: 0, updatedAt: 0, ...parsed }, t);
    const parts = [shown];
    if (parsed.puzzleNumber !== undefined) parts.push(`#${parsed.puzzleNumber}`);
    if (hasWinLoss) parts.push(parsed.outcome === 'loss' ? t('editor.loss') : t('editor.win'));
    return { ok: true, text: parts.join(' · '), grid: parsed.grid };
  };
  const samplePreview = preview(sample);
  const tryPreview = preview(tryText);
  const kindChanged = !!game && game.resultKind !== kind;

  return (
    <dialog
      ref={ref}
      onClose={finish}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(46rem,calc(100vw-2rem))] overflow-x-hidden overflow-y-auto rounded-xl bg-white p-0 text-stone-900 shadow-xl dark:bg-stone-900 dark:text-stone-100"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-5">
        <h2 className="text-lg font-semibold">
          {game ? `${game.icon} ${t('editor.titleEdit', { game: game.name })}` : t('editor.titleNew')}
        </h2>

        {/* ---------------------------------------------------------- basics */}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{t('editor.basics')}</legend>
          <Field label={t('settings.name')}>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </Field>
          <Field label="URL">
            <input required type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className={input} />
          </Field>
          <Field label={t('settings.icon')}>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🎮" maxLength={8} className={input} />
          </Field>
          <Field label={t('settings.gameLang')}>
            <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es')} className={input}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </Field>
        </fieldset>

        {/* ---------------------------------------------------------- result schema */}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{t('editor.result')}</legend>
          <Field label={t('settings.resultType')}>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as ResultKind);
                // A maximum means something else for each type (6 guesses ≠ 6 points): start over.
                setMax('');
              }}
              className={input}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`settings.kind.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('settings.maxValue')}>
            <input type="number" min={0} step="any" value={max} onChange={(e) => setMax(e.target.value)} className={input} />
          </Field>
          {kind === 'generic' && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={genericWinLoss}
                onChange={(e) => setGenericWinLoss(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              {t('settings.hasWinLoss')}
            </label>
          )}
          {kind === 'score' && (
            <>
              <Field label={t('editor.unit')}>
                <div className="flex gap-2">
                  <input
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    placeholder={t('editor.unitPlaceholder')}
                    maxLength={12}
                    className={input}
                  />
                  <select
                    value={unitPrefix ? 'before' : 'after'}
                    onChange={(e) => setUnitPrefix(e.target.value === 'before')}
                    aria-label={t('editor.unitPosition')}
                    className={`${input} w-auto`}
                  >
                    <option value="after">{t('editor.unitAfter')}</option>
                    <option value="before">{t('editor.unitBefore')}</option>
                  </select>
                </div>
              </Field>
              <Field label={t('editor.decimals')}>
                <select value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} className={input}>
                  <option value={0}>{t('editor.decimals0')}</option>
                  <option value={1}>0.0</option>
                  <option value={2}>0.00</option>
                </select>
              </Field>
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={lower}
                  onChange={(e) => setLower(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                />
                <span>
                  {t('editor.lowerIsBetter')}
                  <span className="block text-xs text-stone-500">{t('editor.lowerHelp')}</span>
                </span>
              </label>
            </>
          )}
          {kindChanged && <p className="text-xs text-amber-700 dark:text-amber-400 sm:col-span-2">{t('editor.kindChanged')}</p>}
        </fieldset>

        {/* ---------------------------------------------------------- teach the share text */}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-stone-500">{t('editor.teach')}</legend>
          <p className="text-sm text-stone-500">{t(builtIn ? 'editor.teachHelpBuiltIn' : 'editor.teachHelp')}</p>
          <textarea
            value={sample}
            onChange={(e) => changeSample(e.target.value)}
            rows={sample ? Math.min(8, sample.split('\n').length + 1) : 3}
            placeholder={t('editor.samplePlaceholder')}
            aria-label={t('editor.sample')}
            className={`${input} font-mono text-xs`}
          />

          {sample.trim() && (
            <>
              <Field label={t('editor.detect')}>
                <input value={detect} onChange={(e) => setDetect(e.target.value)} className={input} />
                <span className="text-xs text-stone-500">{t('editor.detectHelp')}</span>
              </Field>

              <Field label={t('editor.scoreFrom')}>
                <select value={scoreFrom} onChange={(e) => setScoreFrom(e.target.value as ScoreFrom)} className={input}>
                  <option value="number">{t('editor.fromNumber')}</option>
                  {emojis.length > 0 && <option value="emojiCount">{t('editor.fromEmoji')}</option>}
                  {hasGrid && <option value="gridRows">{t('editor.fromRows')}</option>}
                  <option value="none">{t('editor.fromNone')}</option>
                </select>
              </Field>

              {scoreFrom === 'emojiCount' && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>{t('editor.whichEmoji')}</span>
                  {emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      aria-pressed={emoji === e}
                      className={`rounded-md border px-2 py-1 text-lg ${emoji === e ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-stone-300 dark:border-stone-700'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>{t('editor.clickToMark')}</span>
                  {(['score', 'puzzle'] as const).map((r) => (
                    <label key={r} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="role"
                        checked={role === r}
                        onChange={() => setRole(r)}
                        className="accent-emerald-600"
                      />
                      <span className={r === 'score' ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-sky-700 dark:text-sky-400'}>
                        {t(r === 'score' ? 'editor.roleScore' : 'editor.rolePuzzle')}
                      </span>
                    </label>
                  ))}
                </div>
                <SampleView tokens={tokens} sample={sample} scoreIdx={scoreFrom === 'number' ? scoreIdx : -1} puzzleIdx={puzzleIdx} onClick={clickNumber} />
              </div>

              {hasWinLoss && (
                <Field label={t(kind === 'solved' ? 'editor.revealedIf' : 'editor.lossIf')}>
                  <input value={lossIf} onChange={(e) => setLossIf(e.target.value)} placeholder="X/6" className={input} />
                </Field>
              )}
              {hasGrid && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={keepGrid} onChange={(e) => setKeepGrid(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                  {t('editor.keepGrid')}
                </label>
              )}

              <Preview label={t('editor.preview')} result={samplePreview} />
              <Field label={t('editor.tryAnother')}>
                <textarea
                  value={tryText}
                  onChange={(e) => setTryText(e.target.value)}
                  rows={2}
                  placeholder={t('editor.tryPlaceholder')}
                  className={`${input} font-mono text-xs`}
                />
              </Field>
              {tryText.trim() && <Preview label={t('editor.preview')} result={tryPreview} />}
            </>
          )}
          {!sample.trim() && game?.pattern && <p className="text-xs text-amber-700 dark:text-amber-400">{t('editor.patternCleared')}</p>}
        </fieldset>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        {msg && !error && <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-4 dark:border-stone-800">
          {builtIn && edited && (
            <button type="button" onClick={onReset} className={`${btn} text-rose-700 dark:text-rose-300`}>
              {t('editor.reset')}
            </button>
          )}
          <button type="button" onClick={copyCode} className={btn}>
            🔗 {t('editor.copyCode')}
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={close} className={btn}>
              {t('dialog.cancel')}
            </button>
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              {game ? t('dialog.save') : t('settings.addButton')}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

/** The example share text with every number clickable. */
function SampleView({
  tokens,
  sample,
  scoreIdx,
  puzzleIdx,
  onClick,
}: {
  tokens: Token[];
  sample: string;
  scoreIdx: number;
  puzzleIdx: number;
  onClick: (i: number) => void;
}) {
  const { t } = useTranslation();
  const lineCount = sample.replace(/\r\n?/g, '\n').split('\n').length;
  const lines: { tok: Token; i: number }[][] = Array.from({ length: lineCount }, () => []);
  tokens.forEach((tok, i) => lines[tok.line]?.push({ tok, i }));
  return (
    <div className="overflow-x-auto font-mono text-sm leading-7">
      {lines.map((line, n) => (
        <div key={n} className="min-h-7 whitespace-pre">
          {line.map(({ tok, i }) =>
            tok.kind === 'number' ? (
              <button
                key={i}
                type="button"
                onClick={() => onClick(i)}
                title={t('editor.clickNumber')}
                className={`mx-px rounded px-1 ${
                  i === scoreIdx
                    ? 'bg-emerald-600 text-white'
                    : i === puzzleIdx
                      ? 'bg-sky-600 text-white'
                      : 'bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600'
                }`}
              >
                {tok.text}
              </button>
            ) : (
              <span key={i}>{tok.text}</span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function Preview({ label, result }: { label: string; result: { ok: boolean; text: string; grid?: string } | null }) {
  if (!result) return null;
  return (
    <div
      className={`rounded-md px-3 py-2 text-sm ${
        result.ok
          ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
      }`}
    >
      <span className="font-medium">{label}:</span> {result.ok ? '✓ ' : ''}
      {result.text}
      {result.grid && <pre className="mt-1 text-base leading-tight">{result.grid}</pre>}
    </div>
  );
}
