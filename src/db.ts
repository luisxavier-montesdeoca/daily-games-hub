import Dexie, { type EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { CATALOG } from './games/catalog';
import type { Game, GamePref, Result } from './types';

export const db = new Dexie('daily-games-hub') as Dexie & {
  results: EntityTable<Result, 'id'>;
  prefs: EntityTable<GamePref, 'gameId'>;
  customGames: EntityTable<Game, 'id'>;
  dismissed: EntityTable<Dismissed, 'id'>;
};

/** A Discover suggestion the user said "not interested" to. */
export type Dismissed = { id: string; at: number };

// Indexed fields only; other fields are stored but not indexed.
db.version(1).stores({
  results: 'id, gameId, date, [gameId+date]',
  prefs: 'gameId',
});
// v2 (M4): games added by the user in Settings.
db.version(2).stores({
  results: 'id, gameId, date, [gameId+date]',
  prefs: 'gameId',
  customGames: 'id',
});
// v3 (M5): dismissed Discover suggestions.
db.version(3).stores({
  results: 'id, gameId, date, [gameId+date]',
  prefs: 'gameId',
  customGames: 'id',
  dismissed: 'id',
});

export function useDismissed(): Set<string> | undefined {
  return useLiveQuery(async () => new Set((await db.dismissed.toArray()).map((d) => d.id)));
}

export const dismissSuggestion = (id: string) => db.dismissed.put({ id, at: Date.now() });
export const undismissSuggestion = (id: string) => db.dismissed.delete(id);
export const clearDismissed = () => db.dismissed.clear();

export const resultId = (gameId: string, date: string) => `${gameId}:${date}`;

export type ResultInput = Omit<Result, 'id' | 'createdAt' | 'updatedAt'>;

/** Insert or replace the result for (gameId, date). */
export async function saveResult(input: ResultInput): Promise<void> {
  const id = resultId(input.gameId, input.date);
  const existing = await db.results.get(id);
  const now = Date.now();
  await db.results.put({ ...input, id, createdAt: existing?.createdAt ?? now, updatedAt: now });
}

export async function deleteResult(gameId: string, date: string): Promise<void> {
  await db.results.delete(resultId(gameId, date));
}

/** Live map gameId → result for one date. `undefined` while loading. */
export function useResultsForDate(date: string): Record<string, Result> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.results.where('date').equals(date).toArray();
    return Object.fromEntries(rows.map((r) => [r.gameId, r]));
  }, [date]);
}

/** Live list of every result. Fine for a personal hub (a few thousand rows over years). */
export function useAllResults(): Result[] | undefined {
  return useLiveQuery(() => db.results.toArray());
}

/** Live results between two dates (inclusive, YYYY-MM-DD). */
export function useResultsBetween(from: string, to: string): Result[] | undefined {
  return useLiveQuery(() => db.results.where('date').between(from, to, true, true).toArray(), [from, to]);
}

// ---------------------------------------------------------------- games

export type GameEntry = { game: Game; enabled: boolean; order: number };

/** Every game (built-in + custom) with its prefs, in display order. */
export async function loadGames(): Promise<GameEntry[]> {
  const [prefs, custom] = await Promise.all([db.prefs.toArray(), db.customGames.toArray()]);
  const byId = new Map(prefs.map((p) => [p.gameId, p]));
  return [...CATALOG, ...custom]
    .map((game, i) => {
      const p = byId.get(game.id);
      return { game, enabled: p?.enabled ?? true, order: p?.order ?? i };
    })
    .sort((a, b) => a.order - b.order);
}

export function useAllGames(): GameEntry[] | undefined {
  return useLiveQuery(loadGames);
}

/** Enabled games in display order. */
export function useEnabledGames(): Game[] | undefined {
  return useLiveQuery(async () => (await loadGames()).filter((e) => e.enabled).map((e) => e.game));
}

/** Save the full games list (order = position in the array). */
export async function saveGamePrefs(entries: { id: string; enabled: boolean }[]): Promise<void> {
  await db.prefs.bulkPut(entries.map((e, i) => ({ gameId: e.id, enabled: e.enabled, order: i })));
}

export async function addCustomGame(game: Game): Promise<void> {
  await db.transaction('rw', db.customGames, db.prefs, async () => {
    await db.customGames.add({ ...game, custom: true });
    const count = (await loadGames()).length;
    await db.prefs.put({ gameId: game.id, enabled: true, order: count });
  });
}

/** Remove a custom game and all of its results. */
export async function deleteCustomGame(id: string): Promise<void> {
  await db.transaction('rw', db.customGames, db.prefs, db.results, async () => {
    await db.customGames.delete(id);
    await db.prefs.delete(id);
    await db.results.where('gameId').equals(id).delete();
  });
}

// ---------------------------------------------------------------- backup (FR-26)

export const BACKUP_APP = 'daily-games-hub';
export const BACKUP_VERSION = 1;

export type Backup = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  results: Result[];
  prefs: GamePref[];
  customGames: Game[];
  /** Added in M5; optional so older backups still import. */
  dismissed?: Dismissed[];
};

export async function exportBackup(): Promise<Backup> {
  const [results, prefs, customGames, dismissed] = await Promise.all([
    db.results.toArray(),
    db.prefs.toArray(),
    db.customGames.toArray(),
    db.dismissed.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    results,
    prefs,
    customGames,
    dismissed,
  };
}

/** Check that parsed JSON looks like a backup from this app. Throws a readable Error if not. */
export function validateBackup(data: unknown): Backup {
  const d = data as Partial<Backup> | null;
  if (!d || typeof d !== 'object' || d.app !== BACKUP_APP) throw new Error('notBackup');
  if (typeof d.version !== 'number' || d.version > BACKUP_VERSION) throw new Error('newerVersion');
  if (!Array.isArray(d.results) || !Array.isArray(d.prefs ?? []) || !Array.isArray(d.customGames ?? [])) {
    throw new Error('notBackup');
  }
  for (const r of d.results) {
    if (typeof r?.gameId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r?.date ?? '')) throw new Error('badRow');
  }
  if (d.dismissed !== undefined && !Array.isArray(d.dismissed)) throw new Error('notBackup');
  return { ...d, prefs: d.prefs ?? [], customGames: d.customGames ?? [], dismissed: d.dismissed ?? [] } as Backup;
}

/**
 * Import a backup.
 * - replace: wipe everything, then load the backup.
 * - merge: keep existing data; for the same game+day keep whichever result was edited last.
 * Returns how many results were written.
 */
export async function importBackup(b: Backup, mode: 'merge' | 'replace'): Promise<number> {
  const dismissed = b.dismissed ?? [];
  return db.transaction('rw', [db.results, db.prefs, db.customGames, db.dismissed], async () => {
    if (mode === 'replace') {
      await Promise.all([db.results.clear(), db.prefs.clear(), db.customGames.clear(), db.dismissed.clear()]);
      await db.results.bulkPut(b.results.map((r) => ({ ...r, id: resultId(r.gameId, r.date) })));
      await db.prefs.bulkPut(b.prefs);
      await db.customGames.bulkPut(b.customGames);
      await db.dismissed.bulkPut(dismissed);
      return b.results.length;
    }
    await db.dismissed.bulkPut(dismissed);
    let written = 0;
    for (const r of b.results) {
      const id = resultId(r.gameId, r.date);
      const mine = await db.results.get(id);
      if (!mine || (r.updatedAt ?? 0) > (mine.updatedAt ?? 0)) {
        await db.results.put({ ...r, id });
        written++;
      }
    }
    for (const g of b.customGames) if (!(await db.customGames.get(g.id))) await db.customGames.put(g);
    for (const p of b.prefs) if (!(await db.prefs.get(p.gameId))) await db.prefs.put(p);
    return written;
  });
}
