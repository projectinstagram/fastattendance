import type { ReactNode } from "react";
import { SURFACE_CLASS } from "./Card";

export default function StatCard({
  label,
  value,
  accent,
  color,
  compact,
  icon,
  barColor,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  color?: string;
  compact?: boolean;
  icon?: ReactNode;
  barColor?: string;
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
    <div className={`relative overflow-hidden px-5 py-4 ${SURFACE_CLASS}`}>
      {barColor && <span className={`absolute inset-x-0 top-0 h-[3px] ${barColor}`} aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-700/60">{label}</div>
        {icon && <span className={`${valueClass} opacity-70`}>{icon}</span>}
      </div>
      <div className={`mt-2 font-display text-[1.75rem] font-semibold leading-none ${valueClass}`}>{value}</div>
    </div>
  );
}
