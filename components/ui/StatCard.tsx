export default function StatCard({
  label,
  value,
  accent,
  color,
  compact,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  color?: string;
  compact?: boolean;
}) {
  const valueClass = color ?? (accent ? "text-brass-600" : "text-ink-950");

  if (compact) {
    return (
      <div className="text-center">
        <div className={`font-display text-xl font-semibold ${valueClass}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-ink-700/60">{label}</div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-ink-900/10 bg-white px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-ink-700/60">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}
