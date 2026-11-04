import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function batchFormOptions() {
  const supabase = await createClient();
  const [{ data: classes }, { data: years }, { data: teachers }, { data: subjects }, { data: settings }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("status", "active").order("sort_order").order("name"),
    supabase.from("academic_years").select("id, name").order("start_date", { ascending: false }),
    supabase.from("teachers").select("id, full_name").eq("employment_status", "active").order("full_name"),
    supabase.from("subjects").select("id, name, class_id").eq("status", "active").order("name"),
    supabase.from("institute_settings").select("current_academic_year_id").maybeSingle(),
  ]);
  return {
    classes: classes ?? [], years: years ?? [],
    teachers: (teachers ?? []).map((t) => ({ id: t.id, name: t.full_name })),
    subjects: subjects ?? [], defaultYear: settings?.current_academic_year_id ?? null,
  };
}
