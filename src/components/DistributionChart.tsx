import { useTranslation } from 'react-i18next';
import type { Bucket } from '../lib/stats';

type Props = {
  buckets: Bucket[];
  /** Axis title for the bucket labels, e.g. "Guesses". */
  labelTitle: string;
  /** Label of the bucket that today's result falls in, highlighted. */
  highlight?: string;
};

/**
 * Horizontal bar distribution (Wordle-style). One series, one hue: no legend needed.
 * Each bar has a hover tooltip and a count at its end; the list is also readable as text.
 */
export default function DistributionChart({ buckets, labelTitle, highlight }: Props) {
  const { t } = useTranslation();
  const total = buckets.reduce((a, b) => a + b.count, 0);
  const max = Math.max(1, ...buckets.map((b) => b.count));

  if (buckets.length === 0 || total === 0) {
    return <p className="text-sm text-stone-500">{t('stats.noDistribution')}</p>;
  }

  const labelOf = (b: Bucket) =>
    b.kind === 'loss' ? t('stats.bucketLoss') : b.kind === 'revealed' ? t('stats.bucketRevealed') : b.label;

  return (
    <figure>
      <figcaption className="mb-2 text-xs text-stone-500">{labelTitle}</figcaption>
      <ul className="flex flex-col gap-1.5">
        {buckets.map((b) => {
          const pct = Math.round((b.count / total) * 100);
          const label = labelOf(b);
          const isHi = highlight !== undefined && highlight === b.label;
          return (
            <li
              key={b.label}
              className="group grid grid-cols-[5.5rem_1fr] items-center gap-2 text-sm"
              title={t('stats.barTooltip', { label, count: b.count, pct })}
            >
              <span className="truncate text-right tabular-nums text-stone-600 dark:text-stone-400">{label}</span>
              <span className="flex items-center gap-2">
                <span
                  className={`h-5 rounded-r ${
                    isHi ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-emerald-400/70 dark:bg-emerald-700'
                  } transition-opacity group-hover:opacity-80`}
                  // Zero-count buckets keep a 2px stub so the row reads as "none" rather than missing.
                  style={{ width: b.count ? `${(b.count / max) * 100}%` : '2px' }}
                />
                <span className="text-xs tabular-nums text-stone-700 dark:text-stone-300">{b.count}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
