import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAllResults, useEnabledGames } from '../db';
import { useToday } from '../lib/date';
import { allGamesStats, computeGameStats, distribution, type GameStats } from '../lib/stats';
import StatTile from '../components/StatTile';
import DistributionChart from '../components/DistributionChart';
import type { Game } from '../types';
import { valueLabelKey } from '../lib/format';

function fmtNum(n: number | undefined, game: Game, lang: string): string {
  if (n === undefined) return '–';
  const digits = game.resultKind === 'score' ? 0 : 1;
  return n.toLocaleString(lang, { maximumFractionDigits: digits });
}

function fmtPct(x: number | undefined): string {
  return x === undefined ? '–' : `${Math.round(x * 100)}%`;
}

export default function Stats() {
  const { t, i18n } = useTranslation();
  const today = useToday();
  const games = useEnabledGames();
  const results = useAllResults();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const perGame = useMemo(() => {
    if (!games || !results) return undefined;
    return games.map((g) => ({ game: g, stats: computeGameStats(g, results, today) }));
  }, [games, results, today]);

  if (!games || !results || !perGame) return <p className="text-stone-500">{t('today.loading')}</p>;

  const all = allGamesStats(
    games.map((g) => g.id),
    results,
    today,
  );
  const selected = perGame.find((p) => p.game.id === selectedId) ?? perGame[0];

  return (
    <section className="flex flex-col gap-8">
      {/* Across all games (FR-14) */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('stats.allGames')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t('stats.resultsLogged')} value={String(results.length)} />
          <StatTile label={t('stats.completeDays')} value={String(all.completeDays)} />
          <StatTile label={t('stats.allGamesStreak')} value={String(all.current)} sub={t('stats.bestN', { n: all.best })} />
          <StatTile
            label={t('stats.longestStreakNow')}
            value={String(Math.max(0, ...perGame.map((p) => p.stats.currentPlayStreak)))}
            sub={
              perGame.reduce<{ name: string; n: number } | null>(
                (best, p) =>
                  p.stats.currentPlayStreak > (best?.n ?? 0) ? { name: p.game.name, n: p.stats.currentPlayStreak } : best,
                null,
              )?.name
            }
          />
        </div>
      </div>

      {/* Per-game summary table; click a row for details */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('stats.byGame')}</h2>
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-xs text-stone-600 dark:bg-stone-900 dark:text-stone-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t('stats.game')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('stats.played')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('stats.winRate')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('stats.playStreak')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('stats.winStreak')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('stats.average')}</th>
              </tr>
            </thead>
            <tbody>
              {perGame.map(({ game, stats }) => (
                <tr
                  key={game.id}
                  onClick={() => setSelectedId(game.id)}
                  className={`cursor-pointer border-t border-stone-200 dark:border-stone-800 ${
                    selected.game.id === game.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-900'
                  }`}
                >
                  <td className="px-3 py-2">
                    <button
                      className="text-left font-medium"
                      aria-pressed={selected.game.id === game.id}
                      onClick={() => setSelectedId(game.id)}
                    >
                      {game.icon} {game.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{stats.played}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(stats.winRate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {stats.currentPlayStreak} <span className="text-stone-500">/ {stats.bestPlayStreak}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {stats.currentWinStreak === undefined ? (
                      '–'
                    ) : (
                      <>
                        {stats.currentWinStreak} <span className="text-stone-500">/ {stats.bestWinStreak}</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(stats.average, game, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-stone-500">{t('stats.streakHelp')}</p>
      </div>

      <GameDetail game={selected.game} stats={selected.stats} todayResultBucket={todayBucket(selected, results, today)} />
    </section>
  );
}

/** Label of the distribution bucket that today's result falls into (to highlight it). */
function todayBucket(sel: { game: Game; stats: GameStats }, results: ReturnType<typeof useAllResults>, today: string) {
  const r = results?.find((x) => x.gameId === sel.game.id && x.date === today);
  if (!r) return undefined;
  return distribution(sel.game, [r]).find((b) => b.count > 0)?.label;
}

function GameDetail({ game, stats, todayResultBucket }: { game: Game; stats: GameStats; todayResultBucket?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">
        {game.icon} {game.name}
      </h2>
      {stats.played === 0 ? (
        <p className="text-sm text-stone-500">{t('stats.noResultsYet')}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3">
            <StatTile label={t('stats.played')} value={String(stats.played)} />
            {stats.winRate !== undefined && (
              <StatTile label={t('stats.winRate')} value={fmtPct(stats.winRate)} sub={t('stats.winsN', { n: stats.wins })} />
            )}
            <StatTile
              label={t('stats.playStreak')}
              value={String(stats.currentPlayStreak)}
              sub={t('stats.bestN', { n: stats.bestPlayStreak })}
            />
            {stats.currentWinStreak !== undefined && (
              <StatTile
                label={t('stats.winStreak')}
                value={String(stats.currentWinStreak)}
                sub={t('stats.bestN', { n: stats.bestWinStreak })}
              />
            )}
            <StatTile label={t('stats.average')} value={fmtNum(stats.average, game, lang)} sub={t(valueLabelKey(game))} />
            <StatTile label={t('stats.best')} value={fmtNum(stats.best, game, lang)} sub={t(valueLabelKey(game))} />
          </div>
          <DistributionChart
            buckets={stats.distribution}
            labelTitle={t('stats.distributionOf', { what: t(valueLabelKey(game)) })}
            highlight={todayResultBucket}
          />
        </div>
      )}
    </div>
  );
}
