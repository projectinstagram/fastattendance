import type { ReactNode } from "react";

export default function EmptyState({
  message,
  action,
  className = "",
}: {
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-sm border border-dashed border-ink-900/15 px-4 py-8 text-center ${className}`}>
      <p className="text-sm text-ink-700/60">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
