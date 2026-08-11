"use client";

import { useRef, type ReactNode } from "react";
import { useCoarsePointer, useReducedMotion } from "./useReducedMotion";

const MAX_TILT_DEG = 5;

/**
 * A single tilting element — the caller's ancestor is expected to set
 * `perspective` (see app/login/page.tsx) so this stays a plain block-level
 * element and its width classes (w-full, max-w-sm, ...) resolve normally.
 */
export default function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const disabled = reducedMotion || coarsePointer;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.setProperty("--tilt-x", `${(-py * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    cardRef.current.style.setProperty("--tilt-y", `${(px * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    cardRef.current.style.setProperty("--glow-x", `${(px * 0.5 + 0.5) * 100}%`);
    cardRef.current.style.setProperty("--glow-y", `${(py * 0.5 + 0.5) * 100}%`);
  }

  function onMouseLeave() {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--tilt-x", "0deg");
    cardRef.current.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{
        transform: disabled ? undefined : "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
        transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
        transformStyle: disabled ? undefined : "preserve-3d",
      }}
    >
      {children}
      {!disabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(480px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(0,255,102,0.08), transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
