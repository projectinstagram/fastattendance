import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  console.log("Seeding classes...");
  
  // Get all teachers
  const { data: teachers, error: tErr } = await supabase.from("teachers").select("id, profile_id");
  if (tErr) {
    console.error(tErr);
    return;
  }
  
  if (!teachers || teachers.length === 0) {
    console.log("No teachers found!");
    return;
  }

  const teacher = teachers[0]; // just use the first one
  console.log("Found teacher ID:", teacher.id);

  // Check if class exists
  const { data: existingClass } = await supabase.from("classes").select("id").eq("teacher_id", teacher.id);
  if (existingClass && existingClass.length > 0) {
    console.log("Teacher already has classes.");
    return;
  }

  // Create a dummy class
  const { data: newClass, error: cErr } = await supabase.from("classes").insert({
    teacher_id: teacher.id,
    name: "CS101: Intro to Computer Science",
    subject: "Computer Science",
    department: "Engineering",
    semester: 1,
    section: "A"
  }).select().single();

  if (cErr) {
    console.error("Error creating class:", cErr);
    return;
  }

  console.log("Created class:", newClass);
}
run();
