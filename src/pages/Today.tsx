import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEnabledGames, useResultsForDate } from '../db';
import { useToday } from '../lib/date';
import GameCard from '../components/GameCard';
import ResultDialog from '../components/ResultDialog';
import PasteBox from '../components/PasteBox';
import ShareDialog from '../components/ShareDialog';
import GameEditor from '../components/GameEditor';
import type { Game } from '../types';

export default function Today() {
  const { t, i18n } = useTranslation();
  const today = useToday();
  const games = useEnabledGames();
  const results = useResultsForDate(today);
  const [editing, setEditing] = useState<{ game: Game; raw?: string } | null>(null);
  const [popupsBlocked, setPopupsBlocked] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Teaching a game its share-text format, from a pasted example.
  const [teaching, setTeaching] = useState<{ game: Game; sample: string } | null>(null);

  if (!games || !results) return <p className="text-stone-500">{t('today.loading')}</p>;

  const done = games.filter((g) => results[g.id]).length;
  const unplayed = games.filter((g) => !results[g.id]);

  const openUnplayed = () => {
    let blocked = false;
    for (const g of unplayed) {
      // Browsers usually allow only one pop-up per click unless pop-ups are allowed for this site.
      const w = window.open(g.url, '_blank');
      if (w) w.opener = null;
      else blocked = true;
    }
    setPopupsBlocked(blocked);
  };

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500 first-letter:uppercase">{dateLabel}</p>
          <p className="text-2xl font-semibold">
            {done === games.length ? t('today.allDone') : t('today.progress', { done, total: games.length })}
          </p>
          <div className="mt-2 h-2 w-64 max-w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${games.length ? (done / games.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {done > 0 && (
            <button
              onClick={() => setSharing(true)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
            >
              📤 {t('today.share')}
            </button>
          )}
          {unplayed.length > 0 && (
            <button
              onClick={openUnplayed}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t('today.openUnplayed')} ({unplayed.length})
            </button>
          )}
        </div>
      </div>

      {popupsBlocked && (
        <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          {t('today.popupsBlocked', { host: window.location.host })}
        </p>
      )}

      <PasteBox onDetected={(game, raw) => setEditing({ game, raw })} onTeach={(game, sample) => setTeaching({ game, sample })} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <GameCard key={g.id} game={g} result={results[g.id]} onLog={() => setEditing({ game: g })} />
        ))}
      </div>

      {editing && (
        <ResultDialog
          // New key per open, so the dialog's form state starts fresh.
          key={`${editing.game.id}:${editing.raw ?? ''}`}
          game={editing.game}
          date={today}
          existing={results[editing.game.id]}
          initialRaw={editing.raw}
          onClose={() => setEditing(null)}
          onTeach={(sample) => {
            const game = editing.game;
            setEditing(null);
            setTeaching({ game, sample });
          }}
        />
      )}

      {teaching && (
        <GameEditor
          key={`${teaching.game.id}:${teaching.sample}`}
          game={teaching.game}
          initialSample={teaching.sample}
          onClose={() => setTeaching(null)}
          // Taught: now log today's result from the same text.
          onSaved={(game) => setEditing({ game, raw: teaching.sample })}
        />
      )}

      {sharing && <ShareDialog date={today} games={games} results={results} onClose={() => setSharing(false)} />}
    </section>
  );
}
