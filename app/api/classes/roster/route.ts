import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherApi } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireTeacherApi();
  if (auth instanceof NextResponse) return auth;
  const { teacher } = auth;

  const body = await request.json().catch(() => ({}));
  const { classId, rollNumbers } = body ?? {};

  if (!classId || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
    return NextResponse.json({ error: "classId and a non-empty rollNumbers array are required." }, { status: 400 });
  }

  const supabase = createClient();

  // Confirm this teacher actually owns the class before touching its roster.
  const { data: classRow } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacher.id)
    .single();

  if (!classRow) {
    return NextResponse.json({ error: "Class not found for this teacher." }, { status: 404 });
  }

  const wanted = [...new Set(rollNumbers.map((r: unknown) => String(r).trim()).filter(Boolean))];

  // A student's own RLS policies only let a teacher see them once they're
  // already enrolled in one of that teacher's classes — so finding a
  // not-yet-enrolled student by roll number has to go through the
  // service-role client. This route is the one privileged place that does.
  const admin = createAdminClient();
  const { data: matches } = await admin.from("students").select("id, roll_number").in("roll_number", wanted);

  const foundRollNumbers = new Set((matches ?? []).map((m) => m.roll_number));
  const notFound = wanted.filter((r) => !foundRollNumbers.has(r));

  const { data: existingLinks } = await admin
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId)
    .in("student_id", (matches ?? []).map((m) => m.id));
  const alreadyLinkedIds = new Set((existingLinks ?? []).map((l) => l.student_id));

  const toInsert = (matches ?? []).filter((m) => !alreadyLinkedIds.has(m.id));
  if (toInsert.length > 0) {
    await admin.from("class_students").insert(toInsert.map((m) => ({ class_id: classId, student_id: m.id })));
  }

  return NextResponse.json({
    added: toInsert.map((m) => m.roll_number),
    alreadyEnrolled: (matches ?? []).filter((m) => alreadyLinkedIds.has(m.id)).map((m) => m.roll_number),
    notFound,
  });
}
