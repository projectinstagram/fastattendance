"use client";

import { useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";

export default function QRScanner({
  onResult,
  allowManualCode,
  onManualCode,
}: {
  onResult: (rawValue: string) => void;
  allowManualCode?: boolean;
  onManualCode?: (code: string) => void;
}) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [code, setCode] = useState("");

  if (manualEntry) {
    return (
      <div className="rounded-sm border border-ink-900/10 bg-white p-6">
        <p className="mb-3 text-sm text-ink-700">Enter the 6-digit code your teacher read out.</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="input font-mono text-lg tracking-[0.3em]"
            placeholder="000000"
          />
          <button
            onClick={() => code.length === 6 && onManualCode?.(code)}
            disabled={code.length !== 6}
            className="rounded-sm bg-ink-950 px-4 text-sm font-medium text-paper disabled:opacity-40"
          >
            Submit
          </button>
        </div>
        <button
          onClick={() => setManualEntry(false)}
          className="mt-4 text-xs text-ink-700 underline underline-offset-4"
        >
          Use camera instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-sm border border-ink-900/10 bg-black">
        <Scanner
          onScan={(codes: IDetectedBarcode[]) => {
            const value = codes[0]?.rawValue;
            if (value) onResult(value);
          }}
          onError={() => setCameraError("Camera permission was denied or is unavailable on this device.")}
          constraints={{ facingMode: "environment" }}
          styles={{ container: { width: "100%" } }}
        />
      </div>
      {cameraError && (
        <p className="mt-3 rounded-sm bg-signal-absent/10 p-3 text-sm text-signal-absent">{cameraError}</p>
      )}
      {allowManualCode && (
        <button
          onClick={() => setManualEntry(true)}
          className="mt-4 text-xs text-ink-700 underline underline-offset-4"
        >
          Can't scan? Enter code manually
        </button>
      )}
    </div>
  );
}
