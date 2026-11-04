import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Children linked to the signed-in parent (RLS-enforced). */
export async function myChildren() {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("id, full_name, admission_no, status, classes(name)").order("full_name");
  return data ?? [];
}
