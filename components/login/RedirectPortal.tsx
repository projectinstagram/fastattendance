"use client";

import { createPortal } from "react-dom";
import GoogleIcon from "./GoogleIcon";

/**
 * Full-viewport transition shown for a brief, capped moment after the
 * spider finishes "eating" the button and before the real OAuth redirect
 * fires. Rendered via a portal to document.body so it always covers the
 * true viewport, regardless of the tilted card's CSS `transform` ancestor
 * (a `transform` on an ancestor would otherwise reparent `position: fixed`
 * to that element instead of the viewport).
 */
export default function RedirectPortal({ show }: { show: boolean }) {
  if (!show || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden
      className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-void-950/85 backdrop-blur-sm"
    >
      <div className="relative h-56 w-56">
        <div
          className="absolute inset-0 animate-portal-spin rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(0,255,102,0.75) 90deg, transparent 190deg, rgba(0,255,102,0.4) 300deg, transparent 360deg)",
            filter: "blur(6px)",
          }}
        />
        <div
          className="absolute inset-6 animate-portal-spin-reverse rounded-full"
          style={{
            background: "conic-gradient(from 90deg, transparent 0deg, rgba(0,255,102,0.55) 130deg, transparent 250deg)",
            filter: "blur(3px)",
          }}
        />
        <div className="absolute inset-12 rounded-full bg-void-950 shadow-[0_0_44px_12px_rgba(0,255,102,0.35)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 animate-g-pop items-center justify-center rounded-full bg-white shadow-xl">
            <GoogleIcon size={30} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
