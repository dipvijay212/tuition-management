import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { AdmissionWizard } from "@/features/students/admission-wizard";
import { todayIn } from "@/lib/utilities/format";
import type { FeeType } from "@/lib/calculations/fees";

export const metadata: Metadata = { title: "New Admission" };

export default async function NewStudentAdmissionPage() {
  const ctx = await requireRole("admin");
  const supabase = await createClient();
  const [
    { data: classes },
    { data: years },
    { data: subjects },
    { data: batches },
    { data: structures },
    { data: discounts },
    { data: settings },
  ] = await Promise.all([
    supabase.from("classes").select("id, name").eq("status", "active").order("sort_order").order("name"),
    supabase.from("academic_years").select("id, name").order("start_date", { ascending: false }),
    supabase.from("subjects").select("id, name, class_id").eq("status", "active").order("name"),
    supabase.from("batches").select("id, name, class_id, capacity, student_batches(status)").eq("status", "active").order("name"),
    supabase.from("fee_structures").select("id, name, class_id, fee_type, category, total_amount, installments, default_due_day, discount_eligible").eq("status", "active").order("name"),
    supabase.from("discounts").select("id, name, discount_type, value").eq("status", "active").order("name"),
    supabase.from("institute_settings").select("default_due_day, current_academic_year_id").single(),
  ]);

  if (!classes?.length) {
    return (
      <>
        <PageHeader title="New admission" />
        <EmptyState
          title="Create a class first"
          description="Admissions need at least one active class (and ideally a batch)."
          action={
            <Button nativeButton={false} render={<Link href="/admin/classes" />}>
              Go to Classes
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="New admission"
        description="Admit a student with parent details, batch and fees in one step."
        back={{ href: "/admin/students", label: "Students" }}
      />
      <AdmissionWizard
        o={{
          today: todayIn(ctx.timezone),
          defaultDueDay: settings?.default_due_day ?? 10,
          currentYear: settings?.current_academic_year_id ?? null,
          classes,
          years: years ?? [],
          subjects: subjects ?? [],
          batches: (batches ?? []).map((b) => ({
            id: b.id,
            name: b.name,
            class_id: b.class_id,
            capacity: b.capacity,
            enrolled: b.student_batches.filter((s) => s.status === "active").length,
          })),
          structures: (structures ?? []).map((s) => ({
            ...s,
            fee_type: s.fee_type as FeeType,
            total_amount: Number(s.total_amount),
          })),
          discounts: (discounts ?? []).map((d) => ({
            ...d,
            value: Number(d.value),
          })),
        }}
      />
    </div>
  );
}
