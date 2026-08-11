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
}: {
  sessionId: string;
  qrToken: string;
  qrExpiresAt: string;
  sessionCode: string;
  refreshSeconds: number;
  onRotate: () => Promise<void>;
  siteUrl: string;
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
      <div className="relative overflow-hidden rounded-lg bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.06),0_16px_32px_-16px_rgba(11,18,32,0.25)]">
        <QRCode value={joinUrl} size={220} fgColor="#111A2E" bgColor="#FFFFFF" />
        <div
          className="absolute bottom-0 left-0 h-1 bg-brass-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-4 flex items-center gap-2 font-mono text-xs text-ink-700">
        <span className="qr-live-dot h-1.5 w-1.5 rounded-full bg-signal-present" />
        Refreshes in {formatCountdown(secondsLeft)}
      </div>
      <div className="mt-3 text-center">
        <div className="text-xs uppercase tracking-wide text-ink-700/60">Session Code</div>
        <div className="font-mono text-2xl font-semibold tracking-[0.3em] text-ink-950">{sessionCode}</div>
      </div>
    </div>
  );
}
