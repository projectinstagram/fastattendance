import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Student, Teacher } from "@/types/database";

/**
 * Returns the authenticated user's profile, or null. This is the ONLY
 * legitimate source of identity for any privileged action in this app —
 * never accept student_id / roll_number / teacher_id from the client.
 */
export async function getAuthedProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("getAuthedProfile: user is null");
    return null;
  }

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    console.error("getAuthedProfile: profile is null for user", user.id, ". Error:", error);
  }

  return profile as Profile | null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getAuthedProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireStudent(): Promise<{ profile: Profile; student: Student }> {
  const profile = await requireProfile();
  if (profile.role !== "student") redirect("/teacher/dashboard");

  const supabase = createClient();
  const { data: student, error } = await supabase.from("students").select("*").eq("profile_id", profile.id).single();

  if (!student) {
    console.error("requireStudent redirecting to /login because student is null. Error:", error);
    redirect("/login");
  }
  return { profile, student: student as Student };
}

export async function requireTeacher(): Promise<{ profile: Profile; teacher: Teacher }> {
  const profile = await requireProfile();
  if (profile.role !== "teacher") redirect("/student/dashboard");

  const supabase = createClient();
  const { data: teacher, error } = await supabase.from("teachers").select("*").eq("profile_id", profile.id).single();

  if (!teacher) {
    console.error("requireTeacher redirecting to /login because teacher is null. Error:", error);
    redirect("/login");
  }
  return { profile, teacher: teacher as Teacher };
}

// -----------------------------------------------------------------------
// API route variants. requireStudent()/requireTeacher() above call
// next/navigation's redirect(), which is meant for pages — inside a Route
// Handler it produces an HTTP redirect response instead of a normal one,
// so a client fetch() following it lands on the login page's HTML and
// res.json() throws. That throw was going unhandled in callers like
// qr-rotate's client-side poll, which permanently froze the QR countdown
// instead of retrying. These return a NextResponse directly so every
// app/api/**/route.ts handler can fail with real JSON instead.
// -----------------------------------------------------------------------

export async function requireStudentApi(): Promise<{ profile: Profile; student: Student } | NextResponse> {
  const profile = await getAuthedProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (profile.role !== "student") {
    return NextResponse.json({ error: "A student account is required." }, { status: 403 });
  }

  const supabase = createClient();
  const { data: student } = await supabase.from("students").select("*").eq("profile_id", profile.id).single();
  if (!student) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  return { profile, student: student as Student };
}

export async function requireTeacherApi(): Promise<{ profile: Profile; teacher: Teacher } | NextResponse> {
  const profile = await getAuthedProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (profile.role !== "teacher") {
    return NextResponse.json({ error: "A teacher account is required." }, { status: 403 });
  }

  const supabase = createClient();
  const { data: teacher } = await supabase.from("teachers").select("*").eq("profile_id", profile.id).single();
  if (!teacher) return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });

  return { profile, teacher: teacher as Teacher };
}
