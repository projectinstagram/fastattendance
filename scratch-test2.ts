import { createClient } from "@supabase/supabase-js";

type MyRow = { id: string; role: string };

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: MyRow;
        Insert: Partial<MyRow>;
        Update: Partial<MyRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

const c = createClient<Database>("https://x.supabase.co", "key");
async function f() {
  const { data } = await c.from("profiles").select("*").eq("id", "x").single();
  console.log(data?.role);
}
