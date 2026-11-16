import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountCard } from "@/features/profile/account-card";
import { formatDate } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Profile" };

export default async function TeacherProfile() {
  const ctx = await requireRole("teacher");
  const supabase = await createClient();
  // Both in parallel; the institute's subject list is small, so filter it here instead of a second round trip.
  const [{ data: t }, { data: allSubs }] = await Promise.all([
    supabase.from("teachers").select("full_name, phone, email, qualification, specialization, joining_date, subject_ids").eq("profile_id", ctx.userId).maybeSingle(),
    supabase.from("subjects").select("id, name").order("name"),
  ]);
  const subs = (allSubs ?? []).filter((s) => t?.subject_ids.includes(s.id));
  return (
    <>
      <PageHeader title="My profile" />
      {t && (
        <Card className="mb-6"><CardHeader><CardTitle className="text-base">Teacher details</CardTitle></CardHeader><CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Qualification</dt><dd>{t.qualification ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Specialization</dt><dd>{t.specialization ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Joined</dt><dd>{formatDate(t.joining_date)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Subjects</dt><dd>{(subs ?? []).map((s) => s.name).join(", ") || "—"}</dd></div>
          </dl>
        </CardContent></Card>
      )}
      <AccountCard name={ctx.profile.full_name} email={ctx.profile.email} phone={ctx.profile.phone} />
    </>
  );
}
