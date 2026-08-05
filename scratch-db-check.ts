import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  console.log("Checking DB...");
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  console.log("Users:", users?.users.length, uErr || "");

  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
  console.log("Profiles:", profiles?.length, pErr || "");

  const { data: teachers, error: tErr } = await supabase.from("teachers").select("*");
  console.log("Teachers:", teachers?.length, tErr || "");

  const { data: students, error: sErr } = await supabase.from("students").select("*");
  console.log("Students:", students?.length, sErr || "");
  
  if (users?.users) {
      for (const u of users.users) {
          console.log(`User: ${u.email} | id: ${u.id}`);
          console.log(`  Profile exists? ${profiles?.some(p => p.id === u.id)}`);
          if (u.raw_user_meta_data?.role === 'teacher') {
             console.log(`  Teacher exists? ${teachers?.some(t => t.profile_id === u.id)}`);
          } else {
             console.log(`  Student exists? ${students?.some(s => s.profile_id === u.id)}`);
          }
      }
  }
}
run();
