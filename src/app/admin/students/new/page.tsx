import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { AdmissionWizard } from "@/features/students/admission-wizard";
import { todayIn } from "@/lib/utilities/format";
import type { FeeType } from "@/lib/calculations/fees";

export const metadata: Metadata = { title: "New Admission" };

export default async function NewStudentAdmissionPage() {
  const ctx = await requireRole("admin");
  type Opts = {
    classes: { id: string; name: string }[];
    years: { id: string; name: string }[];
    subjects: { id: string; name: string; class_id: string | null }[];
    batches: { id: string; name: string; class_id: string; capacity: number | null; student_batches: { status: string }[] }[];
    structures: Pick<Tables<"fee_structures">, "id" | "name" | "class_id" | "fee_type" | "category" | "total_amount" | "installments" | "default_due_day" | "discount_eligible">[];
    discounts: Pick<Tables<"discounts">, "id" | "name" | "discount_type" | "value">[];
    settings: { default_due_day: number; current_academic_year_id: string | null } | null;
  };
  const { classes, years, subjects, batches, structures, discounts, settings } = await api<Opts>("/students/admission-options");

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
