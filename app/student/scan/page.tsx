"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRScanner from "@/components/QRScanner";

export default function ScanPage() {
  const router = useRouter();

  function handleResult(rawValue: string) {
    try {
      const url = new URL(rawValue);
      const session = url.searchParams.get("session");
      const token = url.searchParams.get("token");
      if (!session || !token) throw new Error("not a valid attendance QR");
      router.push(`/attendance/join?session=${session}&token=${encodeURIComponent(token)}`);
    } catch {
      toast.error("That doesn't look like a valid attendance QR code.");
    }
  }

  function handleManualCode(code: string) {
    router.push(`/attendance/join?code=${code}`);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-2xl font-semibold text-ink-950">Scan Attendance QR</h1>
      <p className="mt-1 text-sm text-ink-700">Point your camera at the QR code your teacher is projecting.</p>

      <div className="mt-6">
        <QRScanner onResult={handleResult} allowManualCode onManualCode={handleManualCode} />
      </div>
    </div>
  );
}
