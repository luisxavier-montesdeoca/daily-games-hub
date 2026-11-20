import Dexie, { type EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { CATALOG } from './games/catalog';
import type { Game, GamePref, Result } from './types';

export const db = new Dexie('daily-games-hub') as Dexie & {
  results: EntityTable<Result, 'id'>;
  prefs: EntityTable<GamePref, 'gameId'>;
  customGames: EntityTable<Game, 'id'>;
  dismissed: EntityTable<Dismissed, 'id'>;
  overrides: EntityTable<GameOverride, 'gameId'>;
};

/** A built-in game as edited by the user (result type, unit, taught share text…). Replaces the catalog entry. */
export type GameOverride = { gameId: string; game: Game };

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
// v4: user edits to built-in games.
db.version(4).stores({
  results: 'id, gameId, date, [gameId+date]',
  prefs: 'gameId',
  customGames: 'id',
  dismissed: 'id',
  overrides: 'gameId',
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

export type GameEntry = {
  game: Game;
  enabled: boolean;
  order: number;
  /** A built-in game the user has edited (can be reset). */
  edited: boolean;
};

export const isBuiltIn = (id: string) => CATALOG.some((g) => g.id === id);

/** Every game (built-in, with the user's edits, + custom) with its prefs, in display order. */
export async function loadGames(): Promise<GameEntry[]> {
  const [prefs, custom, overrides] = await Promise.all([
    db.prefs.toArray(),
    db.customGames.toArray(),
    db.overrides.toArray(),
  ]);
  const byId = new Map(prefs.map((p) => [p.gameId, p]));
  const edits = new Map(overrides.map((o) => [o.gameId, o.game]));
  return [...CATALOG, ...custom]
    .map((game, i) => {
      const p = byId.get(game.id);
      const edit = edits.get(game.id);
      return {
        game: edit ? { ...edit, id: game.id, custom: game.custom } : game,
        enabled: p?.enabled ?? true,
        order: p?.order ?? i,
        edited: !!edit && !game.custom,
      };
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
  // loadGames() also reads overrides, so it must be in the transaction's scope.
  await db.transaction('rw', [db.customGames, db.prefs, db.overrides], async () => {
    await db.customGames.add({ ...game, custom: true });
    const count = (await loadGames()).length;
    await db.prefs.put({ gameId: game.id, enabled: true, order: count });
  });
}

/** Save an edited game: built-in games are stored as an override, added games are updated in place. */
export async function saveGame(game: Game): Promise<void> {
  if (isBuiltIn(game.id)) {
    const { custom: _drop, ...rest } = game;
    await db.overrides.put({ gameId: game.id, game: rest });
  } else {
    await db.customGames.put({ ...game, custom: true });
  }
}

/** Undo all edits to a built-in game. Results are kept. */
export const resetGame = (id: string) => db.overrides.delete(id);

/** Add or replace a game from a setup code. Returns whether it replaced an existing game. */
export async function importGame(game: Game): Promise<'added' | 'updated'> {
  if (isBuiltIn(game.id) || (await db.customGames.get(game.id))) {
    await saveGame(game);
    return 'updated';
  }
  await addCustomGame(game);
  return 'added';
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
  /** Edits to built-in games; optional so older backups still import. */
  overrides?: GameOverride[];
};

export async function exportBackup(): Promise<Backup> {
  const [results, prefs, customGames, dismissed, overrides] = await Promise.all([
    db.results.toArray(),
    db.prefs.toArray(),
    db.customGames.toArray(),
    db.dismissed.toArray(),
    db.overrides.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    results,
    prefs,
    customGames,
    dismissed,
    overrides,
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
  if (d.overrides !== undefined && !Array.isArray(d.overrides)) throw new Error('notBackup');
  return {
    ...d,
    prefs: d.prefs ?? [],
    customGames: d.customGames ?? [],
    dismissed: d.dismissed ?? [],
    overrides: d.overrides ?? [],
  } as Backup;
}

/**
 * Import a backup.
 * - replace: wipe everything, then load the backup.
 * - merge: keep existing data; for the same game+day keep whichever result was edited last.
 * Returns how many results were written.
 */
export async function importBackup(b: Backup, mode: 'merge' | 'replace'): Promise<number> {
  const dismissed = b.dismissed ?? [];
  const overrides = b.overrides ?? [];
  return db.transaction('rw', [db.results, db.prefs, db.customGames, db.dismissed, db.overrides], async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.results.clear(),
        db.prefs.clear(),
        db.customGames.clear(),
        db.dismissed.clear(),
        db.overrides.clear(),
      ]);
      await db.overrides.bulkPut(overrides);
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
    for (const o of overrides) if (!(await db.overrides.get(o.gameId))) await db.overrides.put(o);
    return written;
  });
}
