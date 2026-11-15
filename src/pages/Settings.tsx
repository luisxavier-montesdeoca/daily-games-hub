import { valueLabelKey } from '../lib/format';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addCustomGame,
  deleteCustomGame,
  exportBackup,
  importBackup,
  saveGamePrefs,
  useAllGames,
  validateBackup,
  type Backup,
  type GameEntry,
} from '../db';
import { localDate } from '../lib/date';
import { setThemePref, useTheme, type ThemePref } from '../lib/theme';
import type { Game, ResultKind } from '../types';

const btn =
  'rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800';
const input =
  'rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
      <GamesSection />
      <AddGameSection />
      <Section title={t('settings.appearance')}>
        <AppearanceFields />
      </Section>
      <BackupSection />
    </div>
  );
}

// ------------------------------------------------------------ games list (FR-25)

function GamesSection() {
  const { t } = useTranslation();
  const entries = useAllGames();
  if (!entries) return null;

  const save = (next: GameEntry[]) => saveGamePrefs(next.map((e) => ({ id: e.game.id, enabled: e.enabled })));

  const move = (i: number, d: -1 | 1) => {
    const next = [...entries];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next);
  };

  const toggle = (i: number) => save(entries.map((e, j) => (j === i ? { ...e, enabled: !e.enabled } : e)));

  const remove = async (g: Game) => {
    if (confirm(t('settings.confirmDeleteGame', { game: g.name }))) await deleteCustomGame(g.id);
  };

  return (
    <Section title={t('settings.games')}>
      <p className="mb-3 text-sm text-stone-500">{t('settings.gamesHelp')}</p>
      <ul className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
        {entries.map((e, i) => (
          <li key={e.game.id} className="flex items-center gap-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={e.enabled}
              onChange={() => toggle(i)}
              aria-label={t('settings.enableGame', { game: e.game.name })}
              className="h-4 w-4 accent-emerald-600"
            />
            <span aria-hidden>{e.game.icon}</span>
            <span className={`flex-1 ${e.enabled ? '' : 'text-stone-400 line-through'}`}>
              {e.game.name}
              {e.game.custom && (
                <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {t('settings.custom')}
                </span>
              )}
            </span>
            <span className="text-xs text-stone-500">{t(valueLabelKey(e.game))}</span>
            <button
              className={btn}
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={t('settings.moveUp', { game: e.game.name })}
            >
              ↑
            </button>
            <button
              className={btn}
              onClick={() => move(i, 1)}
              disabled={i === entries.length - 1}
              aria-label={t('settings.moveDown', { game: e.game.name })}
            >
              ↓
            </button>
            {e.game.custom ? (
              <button
                className={`${btn} text-rose-600 dark:text-rose-400`}
                onClick={() => remove(e.game)}
                aria-label={t('settings.deleteGame', { game: e.game.name })}
              >
                ✕
              </button>
            ) : (
              <span className="w-[38px]" />
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ------------------------------------------------------------ add a game

const KINDS: ResultKind[] = ['score', 'guesses', 'mistakes', 'hints', 'solved', 'generic'];

function slug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `custom-${base || 'game'}-${Date.now().toString(36)}`;
}

function AddGameSection() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('');
  const [kind, setKind] = useState<ResultKind>('score');
  const [max, setMax] = useState('');
  const [winLoss, setWinLoss] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      return setMsg({ ok: false, text: t('settings.errUrl') });
    }
    const maxValue = max.trim() ? Number(max) : undefined;
    if (maxValue !== undefined && (!Number.isInteger(maxValue) || maxValue < 1)) {
      return setMsg({ ok: false, text: t('settings.errMax') });
    }
    const game: Game = {
      id: slug(name),
      name: name.trim(),
      url: parsed.href,
      lang,
      resultKind: kind,
      // Win/loss follows the result type, except for "generic" where the user decides.
      hasWinLoss: kind === 'generic' ? winLoss : kind === 'guesses' || kind === 'mistakes' || kind === 'solved',
      maxValue,
      tags: [],
      icon: icon.trim() || '🎮',
      custom: true,
    };
    await addCustomGame(game);
    setMsg({ ok: true, text: t('settings.added', { game: game.name }) });
    setName('');
    setUrl('');
    setIcon('');
    setMax('');
  }

  return (
    <Section title={t('settings.addGame')}>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t('settings.name')}
          <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          URL
          <input
            required
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('settings.resultType')}
          <select value={kind} onChange={(e) => setKind(e.target.value as ResultKind)} className={input}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`settings.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('settings.maxValue')}
          <input type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('settings.icon')}
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🎮" maxLength={8} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('settings.gameLang')}
          <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es')} className={input}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        {kind === 'generic' && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={winLoss}
              onChange={(e) => setWinLoss(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            {t('settings.hasWinLoss')}
          </label>
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {t('settings.addButton')}
          </button>
          {msg && (
            <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {msg.text}
            </p>
          )}
        </div>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------ language & theme (FR-27, FR-28)

function AppearanceFields() {
  const { t, i18n } = useTranslation();
  const { pref } = useTheme();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        {t('settings.language')}
        <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} className={input}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('settings.theme')}
        <select value={pref} onChange={(e) => setThemePref(e.target.value as ThemePref)} className={input}>
          <option value="system">{t('settings.themeSystem')}</option>
          <option value="light">{t('settings.themeLight')}</option>
          <option value="dark">{t('settings.themeDark')}</option>
        </select>
      </label>
    </div>
  );
}

// ------------------------------------------------------------ backup (FR-26)

function BackupSection() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `daily-games-hub-backup-${localDate()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg({ ok: true, text: t('settings.exported', { count: data.results.length }) });
  }

  async function onFile(file: File | undefined) {
    setPending(null);
    setMsg(null);
    if (!file) return;
    try {
      setPending(validateBackup(JSON.parse(await file.text())));
    } catch (e) {
      const code = e instanceof Error && ['newerVersion', 'badRow'].includes(e.message) ? e.message : 'notBackup';
      setMsg({ ok: false, text: t(`settings.importErr.${code}`) });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onImport(mode: 'merge' | 'replace') {
    if (!pending) return;
    if (mode === 'replace' && !confirm(t('settings.confirmReplace'))) return;
    const n = await importBackup(pending, mode);
    setPending(null);
    setMsg({ ok: true, text: t('settings.imported', { count: n }) });
  }

  return (
    <Section title={t('settings.backup')}>
      <p className="mb-3 text-sm text-stone-500">{t('settings.backupHelp')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onExport} className={btn}>
          ⬇ {t('settings.export')}
        </button>
        <label className={`${btn} cursor-pointer`}>
          ⬆ {t('settings.import')}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {pending && (
        <div className="mt-3 rounded-md bg-stone-100 p-3 text-sm dark:bg-stone-800">
          <p className="mb-2">
            {t('settings.importReady', {
              count: pending.results.length,
              date: new Date(pending.exportedAt).toLocaleString(),
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onImport('merge')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700">
              {t('settings.merge')}
            </button>
            <button
              onClick={() => onImport('replace')}
              className="rounded-md border border-rose-400 px-3 py-1.5 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              {t('settings.replace')}
            </button>
            <button onClick={() => setPending(null)} className={btn}>
              {t('dialog.cancel')}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">{t('settings.mergeHelp')}</p>
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {msg.text}
        </p>
      )}
    </Section>
  );
}
