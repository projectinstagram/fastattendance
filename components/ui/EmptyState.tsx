import type { ReactNode } from "react";
import { InboxIcon } from "./icons";

export default function EmptyState({
  message,
  action,
  icon,
  className = "",
}: {
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg bg-ink-900/[0.025] px-6 py-10 text-center ${className}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-700/50">
        {icon ?? <InboxIcon />}
      </span>
      <p className="max-w-sm text-sm text-ink-700/70">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
