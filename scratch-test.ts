import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const c = createClient<Database>("https://x.supabase.co", "key");
async function f() {
  const { data } = await c.from("profiles").select("*").eq("id", "x").single();
  console.log(data?.role);
}
