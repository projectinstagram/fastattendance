"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({
  name,
  role,
  links,
}: {
  name: string;
  role: "student" | "teacher";
  links: { href: string; label: string }[];
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink-900/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href={role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brass-500" />
            <span className="font-display text-lg font-semibold text-ink-950">Attendance Live</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-ink-700 transition hover:text-ink-950">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-ink-950">{name}</div>
            <div className="text-xs capitalize text-ink-700/70">{role}</div>
          </div>
          <button
            onClick={signOut}
            className="rounded-sm border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-900/5"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
