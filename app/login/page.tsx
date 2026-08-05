"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Role = "student" | "teacher";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("1");
  const [section, setSection] = useState("A");

  async function persistSession(session: { access_token: string; refresh_token: string }) {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Could not save your sign-in session.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data:
              role === "student"
                ? { role, name, roll_number: rollNumber, department, semester: Number(semester), section }
                : { role, name },
          },
        });
        if (error) throw error;

        // If email confirmation is disabled in Supabase, the user is already
        // logged in after signUp Ã¢â‚¬â€ redirect them immediately.
        if (signUpData.session) {
          await persistSession(signUpData.session);
          const destination = role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
          window.location.href = destination;
          return;
        }

        toast.success("Account created! Check your inbox to confirm your email, then sign in.");
        setMode("signin");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error("No session was returned. Please try signing in again.");

      await persistSession(data.session);

      // Try to get role from the profiles table; fall back to auth metadata
      // if the profile row hasn't been created yet (e.g. trigger delay).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const resolvedRole =
        profile?.role ??
        (data.user.user_metadata?.role as string | undefined) ??
        "student";

      const next = params.get("next");
      let destination: string;
      if (next && next !== "/login") {
        destination = next;
      } else {
        destination = resolvedRole === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
      }
      // Hard redirect so the browser sends the new auth cookies on the
      // first request and the middleware sees the authenticated user.
      window.location.href = destination;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-12 text-paper lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={dotGrid} />
        <div className="relative">
          <div className="flex items-center gap-2 text-brass-400">
            <span className="qr-live-dot h-2 w-2 rounded-full bg-brass-400" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">Attendance Live</span>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-[1.08] text-paper">
            One scan. <br />No proxies. <br />Live to the second.
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-paper/70">
            Every attendance record is traced back to the authenticated student who holds the
            roll number Ã¢â‚¬â€ never to whatever a browser form happens to submit.
          </p>
        </div>
        <div className="relative font-mono text-xs text-paper/40">College Attendance System</div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-brass-600">
              <span className="h-2 w-2 rounded-full bg-brass-500" />
              <span className="font-mono text-xs uppercase tracking-[0.2em]">Attendance Live</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink-950">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {mode === "signin" ? "Use your college email." : "College accounts only."}
          </p>

          <div className="mt-6 flex rounded-sm border border-ink-900/10 bg-white p-1 text-sm">
            {(["student", "teacher"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-sm py-1.5 capitalize transition ${
                  role === r ? "bg-ink-950 text-paper" : "text-ink-700 hover:bg-ink-900/5"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Rahul Sharma"
                />
              </Field>
            )}

            <Field label="College email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@college.edu"
              />
            </Field>

            <Field label="Password">
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
              />
            </Field>

            {mode === "signup" && role === "student" && (
              <>
                <Field label="Roll number">
                  <input
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="input"
                    placeholder="21"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Department">
                    <input
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="input"
                      placeholder="CSE"
                    />
                  </Field>
                  <Field label="Semester">
                    <input
                      required
                      type="number"
                      min={1}
                      max={12}
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label="Section">
                    <input
                      required
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="input"
                      placeholder="A"
                    />
                  </Field>
                </div>
                <p className="text-xs text-ink-700/70">
                  Your roll number is locked to this account and cannot be changed from the
                  attendance screen.
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-sm bg-ink-950 py-2.5 text-sm font-medium text-paper transition hover:bg-ink-800 disabled:opacity-60"
            >
              {loading ? "Please waitÃ¢â‚¬Â¦" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 text-sm text-ink-700 underline decoration-ink-900/20 underline-offset-4 hover:text-ink-950"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 3px;
          border: 1px solid rgba(17, 26, 46, 0.15);
          background: #fff;
          padding: 0.55rem 0.7rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #b08d1e;
          box-shadow: 0 0 0 3px rgba(176, 141, 30, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}

const dotGrid: React.CSSProperties = {
  backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};
