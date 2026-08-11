"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-900/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href={role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brass-500" />
            <span className="font-display text-lg font-semibold text-ink-950">Attendance Live</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative px-3 py-1.5 text-sm transition ${
                    active ? "text-ink-950" : "text-ink-700 hover:text-ink-950"
                  }`}
                >
                  {l.label}
                  {active && <span className="absolute inset-x-3 -bottom-[17px] h-0.5 rounded-full bg-brass-500" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-ink-950">{name}</div>
            <div className="text-xs capitalize text-ink-700/70">{role}</div>
          </div>
          <button
            onClick={signOut}
            className="hidden rounded-sm border border-ink-900/15 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-900/5 sm:inline-block"
          >
            Log out
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-900/15 text-ink-700 md:hidden"
          >
            <span className="sr-only">Menu</span>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ink-900/10 bg-white px-6 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-sm px-3 py-2 text-sm transition ${
                  pathname === l.href ? "bg-ink-900/5 font-medium text-ink-950" : "text-ink-700"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center justify-between border-t border-ink-900/10 pt-3">
            <div>
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
      )}
    </header>
  );
}
