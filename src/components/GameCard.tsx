import { useTranslation } from 'react-i18next';
import { formatResult } from '../lib/format';
import type { Game, Result } from '../types';

type Props = { game: Game; result?: Result; onLog: () => void };

export default function GameCard({ game, result, onLog }: Props) {
  const { t } = useTranslation();
  const played = !!result;
  const lost = result?.outcome === 'loss';

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
        played
          ? lost
            ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40'
            : 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
          : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {game.icon}
          </span>
          <div>
            <h2 className="font-semibold leading-tight">{game.name}</h2>
            <p className="text-xs uppercase tracking-wide text-stone-500">{game.lang}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            played
              ? lost
                ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100'
                : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
          }`}
        >
          {played ? formatResult(game, result, t) : t('card.notPlayed')}
        </span>
      </div>

      <div className="mt-auto flex gap-2 text-sm">
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-md bg-stone-900 px-3 py-1.5 text-center font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {t('card.play')} ↗<span className="sr-only"> ({t('card.opensInNewTab')})</span>
        </a>
        <button
          onClick={onLog}
          className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
        >
          {played ? t('card.edit') : t('card.log')}
        </button>
      </div>
    </article>
  );
}
