"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { formatCountdown } from "@/lib/attendance";

export default function QRDisplay({
  sessionId,
  qrToken,
  qrExpiresAt,
  sessionCode,
  refreshSeconds,
  onRotate,
  siteUrl,
  large = false,
}: {
  sessionId: string;
  qrToken: string;
  qrExpiresAt: string;
  sessionCode: string;
  refreshSeconds: number;
  onRotate: () => Promise<void>;
  siteUrl: string;
  /** Projector/fullscreen mode — bigger QR and text, meant to be read
   * from across a room rather than on the teacher's own screen. */
  large?: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(refreshSeconds);

  // Reset timer whenever the QR token changes
  useEffect(() => {
    setSecondsLeft(refreshSeconds);
  }, [qrToken, refreshSeconds]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRotate();
          return 0; // Wait at 0 until parent updates qrToken and resets the timer
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, onRotate]);

  const joinUrl = `${siteUrl}/attendance/join?session=${sessionId}&token=${encodeURIComponent(qrToken)}`;
  const progress = refreshSeconds > 0 ? secondsLeft / refreshSeconds : 0;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(11,18,32,0.06),0_16px_32px_-16px_rgba(11,18,32,0.25)] ${
          large ? "p-8" : "p-5"
        }`}
      >
        <div
          className={
            large
              ? "h-[min(56vh,56vw,560px)] w-[min(56vh,56vw,560px)] [&>svg]:h-full [&>svg]:w-full"
              : "h-[220px] w-[220px] [&>svg]:h-full [&>svg]:w-full"
          }
        >
          <QRCode value={joinUrl} size={512} fgColor="#111A2E" bgColor="#FFFFFF" style={{ width: "100%", height: "100%" }} />
        </div>
        <div
          className="absolute bottom-0 left-0 h-1.5 bg-brass-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div
        className={`flex items-center gap-2 font-mono text-ink-700 ${large ? "mt-6 text-base text-paper/70" : "mt-4 text-xs"}`}
      >
        <span className="qr-live-dot h-1.5 w-1.5 rounded-full bg-signal-present" />
        Refreshes in {formatCountdown(secondsLeft)}
      </div>
      <div className="mt-3 text-center">
        <div className={`uppercase tracking-wide ${large ? "text-sm text-paper/50" : "text-xs text-ink-700/60"}`}>
          Session Code
        </div>
        <div
          className={`font-mono font-semibold tracking-[0.3em] ${
            large ? "text-6xl text-paper" : "text-2xl text-ink-950"
          }`}
        >
          {sessionCode}
        </div>
      </div>
    </div>
  );
}
