import type { HTMLAttributes, ReactNode } from "react";

type Variant = "default" | "highlight";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "border-ink-900/10 bg-white",
  highlight: "border-brass-500/30 bg-brass-400/10",
};

export default function Card({
  variant = "default",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-sm border px-5 py-4 ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
