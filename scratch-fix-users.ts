import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  console.log("Fixing broken users...");
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  
  if (users?.users) {
      for (const u of users.users) {
          const { data: profile } = await supabase.from("profiles").select("id").eq("id", u.id).single();
          if (!profile) {
              console.log(`Deleting broken user ${u.email}...`);
              await supabase.auth.admin.deleteUser(u.id);
          }
      }
  }
  console.log("Done fixing broken users.");
}
run();
