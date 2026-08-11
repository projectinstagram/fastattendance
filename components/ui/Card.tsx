import type { HTMLAttributes, ReactNode } from "react";

type Variant = "default" | "highlight";

// Shared "elevated surface" recipe — soft two-layer shadow instead of a
// hairline border, which reads as a finished panel rather than a wireframe
// mockup. Exported so raw containers (table wrappers, panels) that don't go
// through <Card> can still match it exactly.
export const SURFACE_CLASS =
  "rounded-lg bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04),0_12px_28px_-16px_rgba(11,18,32,0.16)]";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: SURFACE_CLASS,
  highlight: "rounded-lg border border-brass-500/30 bg-gradient-to-br from-brass-400/10 to-brass-400/[0.03]",
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
    <div className={`px-5 py-4 transition-shadow ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
