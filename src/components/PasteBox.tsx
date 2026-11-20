import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAllGames } from '../db';
import { detectAmong } from '../games/parsers/forGame';
import type { Game } from '../types';

type Props = {
  /** Called with the detected game and the pasted text; the parent opens the result dialog. */
  onDetected: (game: Game, text: string) => void;
  /** The text wasn't recognized and the user picked which game it is: open the game editor to teach it. */
  onTeach: (game: Game, text: string) => void;
};

/** "Paste anything": figures out which game a share text came from (FR-10). */
export default function PasteBox({ onDetected, onTeach }: Props) {
  const { t } = useTranslation();
  const entries = useAllGames();
  const [text, setText] = useState('');
  const [notRecognized, setNotRecognized] = useState(false);
  const [teachId, setTeachId] = useState('');

  const games = entries?.map((e) => e.game) ?? [];
  const enabled = entries?.filter((e) => e.enabled).map((e) => e.game) ?? [];

  function submit(value: string) {
    if (!value.trim()) return;
    const hit = detectAmong(value, games);
    if (!hit) {
      setNotRecognized(true);
      return;
    }
    setNotRecognized(false);
    setText('');
    onDetected(hit.game, value);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(text);
  }

  function teach() {
    const game = games.find((g) => g.id === teachId);
    if (!game) return;
    onTeach(game, text);
    setText('');
    setTeachId('');
    setNotRecognized(false);
  }

  return (
    <form onSubmit={onSubmit} className="mb-5 flex flex-col gap-2">
      <label htmlFor="paste-anything" className="text-sm font-medium">
        {t('paste.label')}
      </label>
      <div className="flex gap-2">
        <textarea
          id="paste-anything"
          value={text}
          rows={notRecognized ? 4 : 1}
          onChange={(e) => {
            setText(e.target.value);
            setNotRecognized(false);
          }}
          // Pasting submits immediately; typing needs the button.
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted && !text.trim()) {
              e.preventDefault();
              setText(pasted);
              submit(pasted);
            }
          }}
          placeholder={t('paste.placeholder')}
          className="min-h-10 flex-1 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-xs dark:border-stone-700 dark:bg-stone-900"
        />
        <button
          type="submit"
          className="self-start rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
        >
          {t('paste.submit')}
        </button>
      </div>
      {notRecognized ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          <span>{t('paste.notRecognized')}</span>
          <select
            value={teachId}
            onChange={(e) => setTeachId(e.target.value)}
            aria-label={t('paste.whichGame')}
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-stone-900 dark:border-amber-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="">{t('paste.whichGame')}</option>
            {enabled.map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={teach}
            disabled={!teachId}
            className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {t('paste.teach')}
          </button>
        </div>
      ) : (
        <p className="text-xs text-stone-500">{t('paste.help')}</p>
      )}
    </form>
  );
}
