import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { GAMES_BY_ID } from '../games/catalog';
import { detectGame } from '../games/parsers';
import type { Game } from '../types';

type Props = {
  /** Called with the detected game and the pasted text; the parent opens the result dialog. */
  onDetected: (game: Game, text: string) => void;
};

/** "Paste anything": figures out which game a share text came from (FR-10). */
export default function PasteBox({ onDetected }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [notRecognized, setNotRecognized] = useState(false);

  function submit(value: string) {
    if (!value.trim()) return;
    const hit = detectGame(value);
    const game = hit && GAMES_BY_ID[hit.gameId];
    if (!game) {
      setNotRecognized(true);
      return;
    }
    setNotRecognized(false);
    setText('');
    onDetected(game, value);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(text);
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
          rows={1}
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
      <p className={`text-xs ${notRecognized ? 'text-amber-700 dark:text-amber-400' : 'text-stone-500'}`}>
        {notRecognized ? t('paste.notRecognized') : t('paste.help')}
      </p>
    </form>
  );
}
