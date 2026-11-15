import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { addCustomGame, clearDismissed, dismissSuggestion, undismissSuggestion, useAllGames, useDismissed } from '../db';
import { DISCOVER, type DiscoverGame } from '../games/discover';
import { normalizeUrl, rankSuggestions, toCustomGame } from '../lib/similar';

const chip = 'rounded-full px-2 py-0.5 text-xs';
const btn =
  'rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800';

const ALL_TAGS = [...new Set(DISCOVER.flatMap((d) => d.tags))];

export default function Discover() {
  const { t, i18n } = useTranslation();
  const entries = useAllGames();
  const dismissed = useDismissed();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'es'>('all');
  const [justAdded, setJustAdded] = useState<string | null>(null);

  if (!entries || !dismissed) return <p className="text-stone-500">{t('today.loading')}</p>;

  const allMine = entries.map((e) => e.game);
  const enabledMine = entries.filter((e) => e.enabled).map((e) => e.game);
  const suggestions = rankSuggestions(DISCOVER, enabledMine, allMine, dismissed);

  const haveIds = new Set(allMine.map((g) => g.id));
  const haveUrls = new Set(allMine.map((g) => normalizeUrl(g.url)));
  const inHub = (d: DiscoverGame) => haveIds.has(d.id) || haveUrls.has(normalizeUrl(d.url));

  // Sort tag chips by their label in the current language.
  const tags = [...ALL_TAGS].sort((a, b) => t(`tags.${a}`, a).localeCompare(t(`tags.${b}`, b), i18n.language));

  const filtered = DISCOVER.filter(
    (d) => (!tagFilter || d.tags.includes(tagFilter)) && (langFilter === 'all' || d.lang === langFilter),
  ).sort((a, b) => a.name.localeCompare(b.name));

  async function add(d: DiscoverGame) {
    await addCustomGame(toCustomGame(d));
    setJustAdded(d.name);
  }

  return (
    <div className="flex flex-col gap-8">
      {justAdded && (
        <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
          {t('discover.added', { game: justAdded })}{' '}
          <Link to="/" className="font-medium underline">
            {t('discover.goToday')}
          </Link>
        </p>
      )}

      <section>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('discover.similar')}</h2>
          {dismissed.size > 0 && (
            <button onClick={() => clearDismissed()} className="text-sm text-stone-500 underline hover:text-stone-800 dark:hover:text-stone-200">
              {t('discover.showDismissed', { count: dismissed.size })}
            </button>
          )}
        </div>
        <p className="mb-3 text-sm text-stone-500">{t('discover.similarHelp')}</p>
        {suggestions.length === 0 ? (
          <p className="text-sm text-stone-500">{t('discover.noSuggestions')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.slice(0, 6).map((s) => (
              <DiscoverCard
                key={s.game.id}
                game={s.game}
                because={s.because}
                sharedTags={s.sharedTags}
                onAdd={() => add(s.game)}
                onDismiss={() => dismissSuggestion(s.game.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('discover.all', { count: DISCOVER.length })}</h2>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTagFilter(null)}
            aria-pressed={tagFilter === null}
            className={`${chip} border ${tagFilter === null ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' : 'border-stone-300 dark:border-stone-700'}`}
          >
            {t('discover.allTags')}
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              aria-pressed={tagFilter === tag}
              className={`${chip} border ${tagFilter === tag ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'}`}
            >
              {t(`tags.${tag}`, tag)}
            </button>
          ))}
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value as 'all' | 'en' | 'es')}
            aria-label={t('discover.language')}
            className="ml-auto rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            <option value="all">{t('discover.anyLanguage')}</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <ul className="flex flex-col divide-y divide-stone-200 rounded-lg border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
          {filtered.map((d) => (
            <DiscoverRow
              key={d.id}
              game={d}
              added={inHub(d)}
              dismissed={dismissed.has(d.id)}
              onAdd={() => add(d)}
              onUndismiss={() => undismissSuggestion(d.id)}
            />
          ))}
          {filtered.length === 0 && <li className="p-4 text-sm text-stone-500">{t('discover.noMatches')}</li>}
        </ul>
        <p className="mt-2 text-xs text-stone-500">{t('discover.disclaimer')}</p>
      </section>
    </div>
  );
}

function Tags({ tags, highlight }: { tags: string[]; highlight?: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`${chip} ${
            highlight?.includes(tag)
              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
          }`}
        >
          {t(`tags.${tag}`, tag)}
        </span>
      ))}
    </div>
  );
}

function DiscoverCard({
  game,
  because,
  sharedTags,
  onAdd,
  onDismiss,
}: {
  game: DiscoverGame;
  because: string[];
  sharedTags: string[];
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-2">
        <span className="text-2xl" aria-hidden>
          {game.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{game.name}</h3>
          <p className="text-xs uppercase tracking-wide text-stone-500">{game.lang}</p>
        </div>
      </div>
      <p className="text-sm">{game.description[lang]}</p>
      {because.length > 0 && (
        <p className="text-xs text-stone-500">{t('discover.because', { games: because.join(', ') })}</p>
      )}
      <Tags tags={game.tags} highlight={sharedTags} />
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <a href={game.url} target="_blank" rel="noopener noreferrer" className={btn}>
          {t('discover.try')} ↗
        </a>
        <button onClick={onAdd} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
          + {t('discover.add')}
        </button>
        <button
          onClick={onDismiss}
          className="ml-auto rounded-md px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          {t('discover.dismiss')}
        </button>
      </div>
    </article>
  );
}

function DiscoverRow({
  game,
  added,
  dismissed,
  onAdd,
  onUndismiss,
}: {
  game: DiscoverGame;
  added: boolean;
  dismissed: boolean;
  onAdd: () => void;
  onUndismiss: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm sm:flex-nowrap">
      <span className="text-xl" aria-hidden>
        {game.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {game.name} <span className="text-xs font-normal uppercase text-stone-500">{game.lang}</span>
        </p>
        <p className="text-stone-600 dark:text-stone-400">{game.description[lang]}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {dismissed && !added && (
          <button onClick={onUndismiss} className="text-xs text-stone-500 underline">
            {t('discover.undismiss')}
          </button>
        )}
        <a href={game.url} target="_blank" rel="noopener noreferrer" className={btn}>
          ↗<span className="sr-only">{t('discover.try')}</span>
        </a>
        {added ? (
          <span className={`${chip} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200`}>
            ✓ {t('discover.inHub')}
          </span>
        ) : (
          <button onClick={onAdd} className={btn}>
            + {t('discover.add')}
          </button>
        )}
      </div>
    </li>
  );
}
