import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, titleCase } from "@/lib/utilities/format";

function I({ l, v }: { l: string; v: React.ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-sm">{v || "—"}</dd></div>;
}

/** Read-only student profile (RLS ensures the viewer is the student or a linked parent). */
export async function StudentDetails({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  const [{ data: s }, { data: batches }, { data: parents }] = await Promise.all([
    supabase.from("students").select("full_name, admission_no, date_of_birth, gender, blood_group, school_name, admission_date, address, city, status, classes(name), academic_years(name)").eq("id", studentId).single(),
    supabase.from("student_batches").select("id, start_date, status, batches(name)").eq("student_id", studentId).eq("status", "active"),
    supabase.from("parent_students").select("id, relationship, guardians(full_name, phone)").eq("student_id", studentId),
  ]);
  if (!s) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{s.full_name}</CardTitle><StatusBadge status={s.status} /></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <I l="Admission no." v={s.admission_no} /><I l="Class" v={s.classes?.name} /><I l="Academic year" v={s.academic_years?.name} /><I l="Admitted on" v={formatDate(s.admission_date)} />
          <I l="Date of birth" v={formatDate(s.date_of_birth)} /><I l="Gender" v={titleCase(s.gender)} /><I l="Blood group" v={s.blood_group} /><I l="School" v={s.school_name} />
          <div className="col-span-2"><I l="Batches" v={(batches ?? []).map((b) => b.batches?.name).join(", ")} /></div>
          <div className="col-span-2"><I l="Parents" v={(parents ?? []).map((p) => `${p.guardians?.full_name} (${titleCase(p.relationship)})`).join(", ")} /></div>
          <div className="col-span-2 sm:col-span-4"><I l="Address" v={[s.address, s.city].filter(Boolean).join(", ")} /></div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">To correct any details, please contact the institute office.</p>
      </CardContent>
    </Card>
  );
}
