import { valueLabel } from '../lib/format';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import GameEditor from '../components/GameEditor';
import { decodeGameCode } from '../lib/shareCode';
import { useTranslation } from 'react-i18next';
import {
  deleteCustomGame,
  exportBackup,
  importBackup,
  importGame,
  loadGames,
  saveGamePrefs,
  useAllGames,
  validateBackup,
  type Backup,
  type GameEntry,
} from '../db';
import { localDate } from '../lib/date';
import { setThemePref, useTheme, type ThemePref } from '../lib/theme';
import type { Game } from '../types';

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
  // undefined = closed, null = new game, Game = editing that game.
  const [editing, setEditing] = useState<Game | null | undefined>(undefined);
  return (
    <div className="flex flex-col gap-6">
      <GamesSection onEdit={setEditing} />
      <AddGameSection onNew={() => setEditing(null)} />
      {editing !== undefined && (
        <GameEditor key={editing?.id ?? 'new'} game={editing} onClose={() => setEditing(undefined)} />
      )}
      <Section title={t('settings.appearance')}>
        <AppearanceFields />
      </Section>
      <BackupSection />
    </div>
  );
}

// ------------------------------------------------------------ games list (FR-25)

function GamesSection({ onEdit }: { onEdit: (g: Game) => void }) {
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
              {e.edited && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                  {t('settings.edited')}
                </span>
              )}
              {e.game.pattern && (
                <span
                  title={t('settings.taughtHelp')}
                  className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                >
                  🎓 {t('settings.taught')}
                </span>
              )}
            </span>
            <span className="hidden text-xs text-stone-500 sm:inline">{valueLabel(e.game, t)}</span>
            <button className={btn} onClick={() => onEdit(e.game)} aria-label={t('settings.editGame', { game: e.game.name })}>
              ✎
            </button>
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

function AddGameSection({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onImport(e: FormEvent) {
    e.preventDefault();
    let game: Game;
    try {
      game = decodeGameCode(code);
    } catch {
      return setMsg({ ok: false, text: t('settings.badCode') });
    }
    const existing = (await loadGames()).find((x) => x.game.id === game.id);
    if (existing && !confirm(t('settings.confirmReplaceGame', { game: existing.game.name }))) return;
    const how = await importGame(game);
    setCode('');
    setMsg({ ok: true, text: t(how === 'added' ? 'settings.codeAdded' : 'settings.codeUpdated', { game: game.name }) });
  }

  return (
    <Section title={t('settings.addGame')}>
      <div className="flex flex-col gap-4">
        <div>
          <button onClick={onNew} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            + {t('settings.newGame')}
          </button>
          <p className="mt-2 text-sm text-stone-500">{t('settings.newGameHelp')}</p>
        </div>
        <form onSubmit={onImport} className="flex flex-col gap-2">
          <label htmlFor="setup-code" className="text-sm font-medium">
            {t('settings.importCode')}
          </label>
          <div className="flex gap-2">
            <input
              id="setup-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="DGH1.…"
              className={`${input} min-w-0 flex-1 font-mono text-xs`}
            />
            <button type="submit" disabled={!code.trim()} className={btn}>
              {t('settings.importCodeButton')}
            </button>
          </div>
          <p className="text-xs text-stone-500">{t('settings.importCodeHelp')}</p>
        </form>
        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {msg.text}
          </p>
        )}
      </div>
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
