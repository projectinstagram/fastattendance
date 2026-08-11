"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

// A handful of fixed radial + arc "strands" reminiscent of a web, kept very
// low-opacity so it reads as texture, not decoration competing with the
// form. Parallax is a plain CSS transform driven by a custom property —
// cheap, and the browser interpolates it, so no rAF loop is needed here.
const RADIAL_LINES = 10;
const ARC_RINGS = [90, 160, 240, 330];

export default function WebBackground() {
  const groupRef = useRef<SVGGElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let frame: number | null = null;

    function onMove(e: PointerEvent) {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const px = (e.clientX / window.innerWidth - 0.5) * 2;
        const py = (e.clientY / window.innerHeight - 0.5) * 2;
        groupRef.current?.style.setProperty("--web-px", px.toFixed(3));
        groupRef.current?.style.setProperty("--web-py", py.toFixed(3));
      });
    }

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  const cx = 50;
  const cy = 38;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full text-web-400"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <g
        ref={groupRef}
        style={{
          transform: "translate(calc(var(--web-px, 0) * 1.6px), calc(var(--web-py, 0) * 1.6px))",
          transition: reducedMotion ? undefined : "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          opacity: 0.09,
        }}
        stroke="currentColor"
        strokeWidth="0.08"
        fill="none"
      >
        {Array.from({ length: RADIAL_LINES }).map((_, i) => {
          const angle = (i / RADIAL_LINES) * Math.PI * 2;
          // Rounded to avoid a floating-point ULP mismatch between the
          // server and client Math.cos/sin implementations, which React
          // otherwise flags as a hydration mismatch.
          const x2 = Number((cx + Math.cos(angle) * 140).toFixed(4));
          const y2 = Number((cy + Math.sin(angle) * 140).toFixed(4));
          return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} />;
        })}
        {ARC_RINGS.map((r) => (
          <circle key={r} cx={cx} cy={cy} r={r / 3.2} />
        ))}
      </g>
    </svg>
  );
}
