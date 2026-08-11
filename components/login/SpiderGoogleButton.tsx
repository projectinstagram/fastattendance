"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import GoogleIcon from "./GoogleIcon";
import RedirectPortal from "./RedirectPortal";
import type { SpiderCanvasHandle } from "./SpiderCanvas";
import { useReducedMotion } from "./useReducedMotion";

const NOTICE_RADIUS = 170;
const PORTAL_DURATION_MS = 420;
const SPARK_COUNT = 14;

type Phase = "idle" | "near" | "attacking";

// Deterministic (no Math.random/Date.now) so server and client render the
// same markup — a previous version of this file used live trig for a
// different effect and hit a hydration mismatch from cross-engine
// floating-point rounding, so distances/angles here are pre-rounded.
const SPARKS = Array.from({ length: SPARK_COUNT }).map((_, i) => {
  const angle = (i / SPARK_COUNT) * Math.PI * 2 + (i % 2 === 0 ? 0.15 : -0.1);
  const dist = 42 + ((i * 7) % 5) * 7;
  return {
    x: Number((Math.cos(angle) * dist).toFixed(2)),
    y: Number((Math.sin(angle) * dist).toFixed(2)),
    delay: (i % 5) * 0.02,
  };
});

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
  const [redirecting, setRedirecting] = useState(false);
  const reducedMotion = useReducedMotion();

  // If the real OAuth call fails synchronously (e.g. provider misconfigured)
  // the parent flips `loading` back to false without ever navigating away —
  // in that case, reset our animation instead of leaving the button stuck
  // mid-sequence.
  useEffect(() => {
    if (!loading && phase === "attacking") {
      setPhase("idle");
      setRedirecting(false);
    }
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

    setRedirecting(true);
    await new Promise((resolve) => setTimeout(resolve, PORTAL_DURATION_MS));
    await onProceed();
  }

  const attacking = phase === "attacking";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={loading || attacking}
        aria-busy={attacking || loading}
        className={`spider-google-btn relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border py-3 text-sm font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon disabled:cursor-not-allowed ${
          phase === "near"
            ? "border-neon/50 shadow-[0_0_0_1px_rgba(0,255,102,0.25),0_8px_24px_-8px_rgba(0,255,102,0.4)]"
            : "border-white/10"
        } ${attacking ? "scale-[0.97] border-neon/30" : "bg-white/95 text-void-950 hover:bg-white"}`}
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

        {!reducedMotion && attacking && (
          <span aria-hidden className="pointer-events-none absolute inset-0">
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="spark"
                style={
                  {
                    "--sx": `${s.x}px`,
                    "--sy": `${s.y}px`,
                    animationDelay: `${s.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        )}

        <style jsx>{`
          .spider-google-btn {
            transform-origin: center;
          }
          .silk-wrap {
            background: repeating-conic-gradient(
              from 0deg,
              rgba(0, 255, 102, 0.85) 0deg 4deg,
              rgba(13, 17, 23, 0.95) 4deg 18deg
            );
            transition: opacity 0.28s ease-out;
          }
          .spark {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 3px;
            height: 3px;
            border-radius: 9999px;
            background: #00ff66;
            box-shadow: 0 0 6px 1px rgba(0, 255, 102, 0.8);
            transform: translate(-50%, -50%);
            animation: spark-fly 0.5s ease-out forwards;
          }
          @keyframes spark-fly {
            0% {
              transform: translate(-50%, -50%) translate(0, 0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) translate(var(--sx), var(--sy)) scale(0.3);
              opacity: 0;
            }
          }
          @media (prefers-reduced-motion: no-preference) {
            .spider-google-btn {
              transition-property: transform, opacity, border-color, box-shadow;
            }
          }
        `}</style>
      </button>

      <RedirectPortal show={redirecting} />
    </>
  );
}
