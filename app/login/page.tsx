"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import SpiderCanvas, { type SpiderCanvasHandle } from "@/components/login/SpiderCanvas";
import WebBackground from "@/components/login/WebBackground";
import TiltCard from "@/components/login/TiltCard";
import SpiderGoogleButton from "@/components/login/SpiderGoogleButton";

const ALLOWED_EMAIL_DOMAIN = "kiit.ac.in";

type Role = "student" | "teacher";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Sign-in was interrupted. Please try again.",
  auth_failed: "Google sign-in failed. Please try again.",
  domain_not_allowed: `Please sign in with your college email (@${ALLOWED_EMAIL_DOMAIN}).`,
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const spiderRef = useRef<SpiderCanvasHandle>(null);

  useEffect(() => {
    const error = params.get("error");
    if (!error) return;

    if (error === "role_mismatch") {
      const actual = params.get("role");
      toast.error(
        actual
          ? `This account is already registered as a ${actual}. Please use the "${
              actual === "teacher" ? "Teacher" : "Student"
            }" tab.`
          : "That account doesn't match the selected role."
      );
      return;
    }

    toast.error(ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.");
  }, [params]);

  async function handleGoogleSignIn() {
    setLoading(true);
    const supabase = createClient();
    const next = params.get("next");

    const callbackParams = new URLSearchParams();
    callbackParams.set("role", role);
    if (next) callbackParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${callbackParams.toString()}`,
        queryParams: {
          hd: ALLOWED_EMAIL_DOMAIN,
          prompt: "select_account",
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, so no further
    // local state change is needed here.
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-950 text-web-300">
      {/* Layered ambient lighting — deliberately restrained, no huge glows. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px circle at 18% -10%, rgba(201,162,39,0.09), transparent 55%)," +
            "radial-gradient(900px circle at 88% 110%, rgba(143,163,184,0.08), transparent 50%)," +
            "linear-gradient(180deg, #050608 0%, #0a0d12 100%)",
        }}
      />
      <WebBackground />
      <SpiderCanvas ref={spiderRef} />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-6 py-16">
        <div style={{ perspective: "1200px" }}>
          <TiltCard className="relative w-[min(24rem,88vw)] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-brass-400">
              <span className="qr-live-dot h-1.5 w-1.5 rounded-full bg-brass-400" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Attendance Live</span>
            </div>

            <h2 className="mt-6 font-display text-2xl font-semibold text-white">Sign in</h2>
            <p className="mt-1 text-sm text-web-300/70">
              Use your KIIT college account (@{ALLOWED_EMAIL_DOMAIN}).
            </p>

            <div className="mt-6 flex rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
              {(["student", "teacher"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-md py-1.5 capitalize transition ${
                    role === r ? "bg-white text-void-950" : "text-web-300/80 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <SpiderGoogleButton
                label={`Continue as ${role === "teacher" ? "Teacher" : "Student"}`}
                loading={loading}
                onProceed={handleGoogleSignIn}
                spiderRef={spiderRef}
              />
            </div>

            <p className="mt-6 text-xs leading-relaxed text-web-300/50">
              Only @{ALLOWED_EMAIL_DOMAIN} accounts can sign in. First-time sign-in creates your
              account automatically — no forms to fill in.
            </p>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
