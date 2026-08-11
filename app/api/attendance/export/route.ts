import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherApi } from "@/lib/auth";
import { buildRoster } from "@/lib/attendance";
import type { AttendanceRecord } from "@/types/database";

export async function GET(request: Request) {
  const auth = await requireTeacherApi();
  if (auth instanceof NextResponse) return auth;
  const { teacher } = auth;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");

  if (!sessionId) {
    return NextResponse.json({ error: "session query param is required" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("*, classes:class_id(*)")
    .eq("id", sessionId)
    .eq("teacher_id", teacher.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: rosterStudents } = await supabase
    .from("class_students")
    .select("students:student_id(roll_number, profile_id, profiles:profile_id(name, email))")
    .eq("class_id", session.class_id);

  const roster =
    (rosterStudents ?? []).map((row: any) => ({
      roll_number: row.students.roll_number as string,
      name: row.students.profiles.name as string,
      email: row.students.profiles.email as string,
    })) ?? [];

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("session_id", sessionId);

  const rows = buildRoster(roster, (records ?? []) as AttendanceRecord[], !session.is_active);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Attendance Live";
  const sheet = workbook.addWorksheet("Attendance");

  sheet.columns = [
    { header: "Roll Number", key: "roll_number", width: 14 },
    { header: "Student Name", key: "name", width: 26 },
    { header: "Email", key: "email", width: 30 },
    { header: "Status", key: "status", width: 12 },
    { header: "Marked Time", key: "marked_at", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      roll_number: row.roll_number,
      name: row.name,
      email: row.email,
      status: row.status[0].toUpperCase() + row.status.slice(1),
      marked_at: row.marked_at ? new Date(row.marked_at).toLocaleTimeString() : "-",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const className = (session as any).classes?.name ?? "class";
  const filename = `attendance-${className.replace(/\s+/g, "_")}-${new Date(session.start_time)
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
