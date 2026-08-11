"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import GoogleIcon from "./GoogleIcon";
import type { SpiderCanvasHandle } from "./SpiderCanvas";
import { useReducedMotion } from "./useReducedMotion";

const NOTICE_RADIUS = 170;

type Phase = "idle" | "near" | "attacking";

export default function SpiderGoogleButton({
  label,
  loading,
  onProceed,
  spiderRef,
}: {
  label: string;
  loading: boolean;
  onProceed: () => void | Promise<void>;
  spiderRef: RefObject<SpiderCanvasHandle>;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const reducedMotion = useReducedMotion();

  // If the real OAuth call fails synchronously (e.g. provider misconfigured)
  // the parent flips `loading` back to false without ever navigating away —
  // in that case, reset our animation instead of leaving the button stuck
  // mid-sequence.
  useEffect(() => {
    if (!loading && phase === "attacking") setPhase("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (reducedMotion) return;
    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" || phase === "attacking" || !buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      setPhase((prev) => {
        if (prev === "attacking") return prev;
        return dist < NOTICE_RADIUS ? "near" : "idle";
      });
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion, phase]);

  async function handleClick() {
    if (phase === "attacking" || loading) return;

    if (reducedMotion || !buttonRef.current) {
      await onProceed();
      return;
    }

    setPhase("attacking");
    try {
      const rect = buttonRef.current.getBoundingClientRect();
      await spiderRef.current?.attack(rect);
    } catch {
      // Visual flourish failing must never block sign-in.
    }
    await onProceed();
  }

  const attacking = phase === "attacking";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={loading || attacking}
      aria-busy={attacking || loading}
      className={`spider-google-btn relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border py-3 text-sm font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-400 disabled:cursor-not-allowed ${
        phase === "near" ? "border-brass-400/50 shadow-[0_0_0_1px_rgba(201,162,39,0.25),0_8px_24px_-8px_rgba(201,162,39,0.35)]" : "border-white/10"
      } ${attacking ? "scale-[0.97] opacity-0" : "bg-white/95 text-void-950 hover:bg-white"}`}
    >
      <span className={`flex items-center gap-3 transition-opacity ${attacking ? "opacity-0" : "opacity-100"}`}>
        <GoogleIcon />
        {loading && !attacking ? "Redirecting…" : label}
      </span>

      {!reducedMotion && (
        <span
          aria-hidden
          className="silk-wrap pointer-events-none absolute inset-0 rounded-xl"
          style={{ opacity: attacking ? 1 : 0 }}
        />
      )}

      <style jsx>{`
        .spider-google-btn {
          transform-origin: center;
        }
        .silk-wrap {
          background: repeating-conic-gradient(
            from 0deg,
            rgba(15, 17, 22, 0.9) 0deg 4deg,
            transparent 4deg 18deg
          );
          transition: opacity 0.28s ease-out;
          mix-blend-mode: normal;
        }
        @media (prefers-reduced-motion: no-preference) {
          .spider-google-btn {
            transition-property: transform, opacity, border-color, box-shadow;
          }
        }
      `}</style>
    </button>
  );
}
