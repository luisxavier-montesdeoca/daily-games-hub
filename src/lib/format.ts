import type { TFunction } from 'i18next';
import type { Game, Result } from '../types';

/** Short human-readable result, e.g. "3/6", "1 mistake", "540 pts". */
export function formatResult(game: Game, r: Result, t: TFunction): string {
  const v = r.value;
  switch (game.resultKind) {
    case 'guesses':
      return r.outcome === 'loss' ? `X/${game.maxValue ?? '?'}` : `${v ?? '?'}/${game.maxValue ?? '?'}`;
    case 'mistakes':
      return r.outcome === 'loss' ? t('fmt.failed') : t('fmt.mistakes', { count: v ?? 0 });
    case 'hints':
      return t('fmt.hints', { count: v ?? 0 });
    case 'solved': {
      const base = r.outcome === 'loss' ? t('fmt.revealed') : t('fmt.solved');
      return v ? `${base} · ${t('fmt.hints', { count: v })}` : base;
    }
    case 'score':
      if (v === undefined) return t('fmt.played');
      if (game.lowerIsBetter) return t('fmt.ptsLeft', { value: v });
      if (game.unit === 'questions') return t('fmt.questions', { value: v, max: game.maxValue ?? '?' });
      if (game.unit === 'meters') return `${v.toLocaleString()} m`;
      if (game.unit === 'km') return game.maxValue ? `${v}/${game.maxValue} km` : `${v} km`;
      return game.maxValue ? `${v}/${game.maxValue} ${t('fmt.pts')}` : `${v} ${t('fmt.pts')}`;
    case 'generic': {
      const parts: string[] = [];
      if (r.outcome === 'win') parts.push(t('fmt.won'));
      else if (r.outcome === 'loss') parts.push(t('fmt.lost'));
      if (v !== undefined) parts.push(String(v));
      return parts.length ? parts.join(' · ') : t('fmt.played');
    }
  }
}

/** i18n key for the name of a game's value ("Guesses", "Points", "Questions solved"). */
export function valueLabelKey(game: Game): string {
  return game.unit && game.unit !== 'points' ? `value.${game.unit}` : `value.${game.resultKind}`;
}
