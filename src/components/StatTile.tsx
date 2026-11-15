type Props = { label: string; value: string; sub?: string };

/** A labeled number: "Current streak / 12 / best 30". */
export default function StatTile({ label, value, sub }: Props) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-stone-500">{sub}</p>}
    </div>
  );
}
