"use client";

import { useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import Button from "@/components/ui/Button";
import { SURFACE_CLASS } from "@/components/ui/Card";

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
      <div className={`p-6 ${SURFACE_CLASS}`}>
        <p className="mb-3 text-sm text-ink-700">Enter the 6-digit code your teacher read out.</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="input font-mono text-lg tracking-[0.3em]"
            placeholder="000000"
          />
          <Button onClick={() => code.length === 6 && onManualCode?.(code)} disabled={code.length !== 6}>
            Submit
          </Button>
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
      <div className="overflow-hidden rounded-lg bg-black shadow-[0_1px_2px_rgba(11,18,32,0.04),0_12px_28px_-16px_rgba(11,18,32,0.16)]">
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
        <p className="mt-3 rounded-lg bg-signal-absent/10 p-3 text-sm text-signal-absent">{cameraError}</p>
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
