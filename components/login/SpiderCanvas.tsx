"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

export type SpiderCanvasHandle = {
  /** Steers the spider to the center of `rect`, plays a brief web-wrap
   * flourish once it arrives, and resolves. Always resolves within ~650ms
   * even if the arrival condition is never cleanly met, so callers can
   * safely await it before navigating. */
  attack: (rect: DOMRect) => Promise<void>;
};

type Vec = { x: number; y: number };

const ARRIVE_THRESHOLD = 22;
const WRAP_DURATION_MS = 260;
const ATTACK_TIMEOUT_MS = 650;
const LEG_COUNT = 8;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function angleLerp(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

const SpiderCanvas = forwardRef<SpiderCanvasHandle>(function SpiderCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  // All animation state lives in refs so the render loop never triggers
  // React re-renders — this runs every frame.
  const posRef = useRef<Vec>({ x: 0, y: 0 });
  const angleRef = useRef(0);
  const legPhaseRef = useRef(0);
  const modeRef = useRef<"wander" | "attack" | "retreat">("wander");
  const wanderTargetRef = useRef<Vec>({ x: 0, y: 0 });
  const nextWanderChangeRef = useRef(0);
  const pointerRef = useRef<{ x: number; y: number; lastMove: number; active: boolean }>({
    x: 0,
    y: 0,
    lastMove: 0,
    active: false,
  });
  const attackTargetRef = useRef<Vec>({ x: 0, y: 0 });
  const attackRectRef = useRef<DOMRect | null>(null);
  const wrapStartRef = useRef<number | null>(null);
  const attackResolveRef = useRef<(() => void) | null>(null);
  const attackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      attack(rect: DOMRect) {
        return new Promise<void>((resolve) => {
          if (reducedMotion || !canvasRef.current) {
            resolve();
            return;
          }
          attackTargetRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          attackRectRef.current = rect;
          wrapStartRef.current = null;
          modeRef.current = "attack";

          const finish = () => {
            if (!attackResolveRef.current) return;
            attackResolveRef.current = null;
            if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
            modeRef.current = "retreat";
            wanderTargetRef.current = { x: window.innerWidth * 0.85, y: window.innerHeight * 0.92 };
            resolve();
          };

          attackResolveRef.current = finish;
          attackTimeoutRef.current = setTimeout(finish, ATTACK_TIMEOUT_MS);
        });
      },
    }),
    [reducedMotion]
  );

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
    }
    resize();
    posRef.current = { x: width * 0.5, y: height * 0.6 };
    wanderTargetRef.current = { x: width * 0.4, y: height * 0.5 };

    function onPointerMove(e: PointerEvent) {
      pointerRef.current = { x: e.clientX, y: e.clientY, lastMove: performance.now(), active: true };
    }
    function onPointerLeave() {
      pointerRef.current.active = false;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    let hidden = document.hidden;
    function onVisibility() {
      hidden = document.hidden;
      if (!hidden && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    let lastTime = performance.now();

    function pickWanderTarget(now: number) {
      const margin = 80;
      wanderTargetRef.current = {
        x: margin + Math.random() * (width - margin * 2),
        y: margin + Math.random() * (height - margin * 2),
      };
      nextWanderChangeRef.current = now + 2500 + Math.random() * 3000;
    }

    function drawSpider(x: number, y: number, angle: number, legPhase: number) {
      const scale = 1;
      ctx!.save();
      ctx!.translate(x, y);

      // Soft contact shadow.
      ctx!.save();
      ctx!.translate(2, 6 * scale);
      ctx!.filter = "blur(3px)";
      ctx!.fillStyle = "rgba(0,0,0,0.35)";
      ctx!.beginPath();
      ctx!.ellipse(0, 0, 11 * scale, 4 * scale, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      ctx!.rotate(angle);

      // Legs — a rippling 8-leg gait, four per side.
      for (let i = 0; i < LEG_COUNT; i++) {
        const side = i < 4 ? 1 : -1;
        const idx = i % 4;
        const baseAngle = [-0.9, -0.35, 0.35, 0.9][idx];
        const swing = Math.sin(legPhase + idx * 1.4 + (side > 0 ? 0 : Math.PI)) * 0.35;
        const hipAngle = baseAngle + swing;
        const hipX = Math.cos(hipAngle) * 3 * scale;
        const hipY = side * Math.sin(hipAngle) * 3 * scale + side * 2 * scale;
        const kneeX = hipX + Math.cos(hipAngle) * 7 * scale;
        const kneeY = hipY + side * 5 * scale + Math.sin(legPhase * 1.3 + idx) * 1.2;
        const footX = kneeX + Math.cos(hipAngle - side * 0.3) * 6 * scale;
        const footY = kneeY + side * 5 * scale;

        ctx!.strokeStyle = "rgba(15,17,22,0.82)";
        ctx!.lineWidth = 1.3;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(hipX, hipY);
        ctx!.quadraticCurveTo(kneeX, kneeY, footX, footY);
        ctx!.stroke();
      }

      // Abdomen (rear) + cephalothorax (front), with a faint rim highlight.
      ctx!.fillStyle = "#12141a";
      ctx!.beginPath();
      ctx!.ellipse(-7 * scale, 0, 6.5 * scale, 5 * scale, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.beginPath();
      ctx!.ellipse(4 * scale, 0, 4.2 * scale, 3.4 * scale, 0, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.strokeStyle = "rgba(201,162,39,0.28)";
      ctx!.lineWidth = 0.8;
      ctx!.beginPath();
      ctx!.ellipse(-7 * scale, -0.5, 6.5 * scale, 5 * scale, 0, Math.PI, Math.PI * 1.6);
      ctx!.stroke();

      // Eyes — two small highlights, subtle rather than cartoonish.
      ctx!.fillStyle = "rgba(185,198,212,0.55)";
      ctx!.beginPath();
      ctx!.arc(7 * scale, -1.2 * scale, 0.55, 0, Math.PI * 2);
      ctx!.arc(7 * scale, 1.2 * scale, 0.55, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.restore();
    }

    function drawWrap(spider: Vec, rect: DOMRect, progress: number) {
      const corners: Vec[] = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.right, y: rect.bottom },
        { x: rect.left, y: rect.bottom },
      ];
      ctx!.save();
      ctx!.strokeStyle = `rgba(201,162,39,${0.55 * progress})`;
      ctx!.lineWidth = 0.8;
      for (const c of corners) {
        const tx = lerp(spider.x, c.x, Math.min(1, progress * 1.4));
        const ty = lerp(spider.y, c.y, Math.min(1, progress * 1.4));
        ctx!.beginPath();
        ctx!.moveTo(spider.x, spider.y);
        ctx!.lineTo(tx, ty);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function tick(now: number) {
      const dt = Math.min(48, now - lastTime);
      lastTime = now;

      const pointerIdle = now - pointerRef.current.lastMove > 2200;
      let target = wanderTargetRef.current;

      if (modeRef.current === "wander") {
        if (pointerRef.current.active && !pointerIdle) {
          target = { x: pointerRef.current.x, y: pointerRef.current.y };
        } else {
          if (now > nextWanderChangeRef.current) pickWanderTarget(now);
          target = wanderTargetRef.current;
        }
      } else if (modeRef.current === "attack") {
        target = attackTargetRef.current;
      } else {
        target = wanderTargetRef.current;
        const d = Math.hypot(target.x - posRef.current.x, target.y - posRef.current.y);
        if (d < ARRIVE_THRESHOLD) modeRef.current = "wander";
      }

      const dx = target.x - posRef.current.x;
      const dy = target.y - posRef.current.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.5) {
        const desiredAngle = Math.atan2(dy, dx);
        angleRef.current = angleLerp(angleRef.current, desiredAngle, 0.09);
      }

      const moveFactor = modeRef.current === "attack" ? 0.09 : 0.055;
      posRef.current = {
        x: lerp(posRef.current.x, target.x, moveFactor),
        y: lerp(posRef.current.y, target.y, moveFactor),
      };

      const speed = Math.min(1, dist / 200);
      legPhaseRef.current += 0.12 + speed * 0.35;

      ctx!.clearRect(0, 0, width, height);
      ctx!.save();
      ctx!.scale(dpr, dpr);

      if (modeRef.current === "attack") {
        const arriveDist = Math.hypot(
          attackTargetRef.current.x - posRef.current.x,
          attackTargetRef.current.y - posRef.current.y
        );
        if (arriveDist < ARRIVE_THRESHOLD) {
          if (wrapStartRef.current === null) wrapStartRef.current = now;
          const progress = Math.min(1, (now - wrapStartRef.current) / WRAP_DURATION_MS);
          if (attackRectRef.current) drawWrap(posRef.current, attackRectRef.current, progress);
          if (progress >= 1 && attackResolveRef.current) {
            attackResolveRef.current();
            attackResolveRef.current = null;
            if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
            modeRef.current = "retreat";
          }
        }
      }

      drawSpider(posRef.current.x, posRef.current.y, angleRef.current, legPhaseRef.current);
      ctx!.restore();

      if (!hidden) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute bottom-8 right-8 h-6 w-6 text-web-400/40"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="13" r="4" fill="currentColor" opacity="0.6" />
        <circle cx="8" cy="9" r="2.2" fill="currentColor" opacity="0.6" />
        {[...Array(6)].map((_, i) => {
          const a = (i * Math.PI) / 3;
          return (
            <line
              key={i}
              x1="12"
              y1="13"
              x2={12 + Math.cos(a) * 9}
              y2={13 + Math.sin(a) * 9}
              stroke="currentColor"
              strokeWidth="0.8"
            />
          );
        })}
      </svg>
    );
  }

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-10" />;
});

export default SpiderCanvas;
