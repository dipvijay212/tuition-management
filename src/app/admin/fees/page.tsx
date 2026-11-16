import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { FeeStructureDialog } from "@/features/fees/fee-structure-dialog";
import { RecordPaymentDialog, type StudentOption } from "@/features/fees/record-payment-dialog";
import { formatINR, titleCase, todayIn } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Fees Management" };

export default async function AdminFeesPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: structures, error: sErr }, { data: classes }, { data: allObligations }] = await Promise.all([
    supabase
      .from("fee_structures")
      .select("id, name, fee_type, category, total_amount, installments, default_due_day, discount_eligible, status, classes(name)")
      .order("name"),
    supabase.from("classes").select("id, name").order("name"),
    supabase
      .from("fee_obligations")
      .select("student_id, net_amount, amount_paid, status, students(id, full_name, admission_no, phone, classes(name))"),
  ]);

  if (sErr) throw sErr;

  // Aggregate total assigned fees, total paid, and net balance across ALL obligations per student
  const duesByStudent = new Map<
    string,
    {
      id: string;
      name: string;
      adm: string;
      phone: string | null;
      className: string;
      totalDue: number;
      paid: number;
      outstanding: number;
    }
  >();

  for (const o of allObligations ?? []) {
    if (!o.students) continue;
    const existing = duesByStudent.get(o.student_id) ?? {
      id: o.students.id,
      name: o.students.full_name,
      adm: o.students.admission_no,
      phone: o.students.phone ?? null,
      className: (o.students.classes as { name: string } | null)?.name ?? "General",
      totalDue: 0,
      paid: 0,
      outstanding: 0,
    };
    existing.totalDue += Number(o.net_amount);
    existing.paid += Number(o.amount_paid);
    existing.outstanding = Math.max(0, existing.totalDue - existing.paid);
    duesByStudent.set(o.student_id, existing);
  }

  const allStudentBalances = Array.from(duesByStudent.values()).sort((a, b) => b.outstanding - a.outstanding);

  // Eligible students for the record payment dropdown
  const eligibleStudents: StudentOption[] = allStudentBalances
    .filter((s) => s.outstanding > 0)
    .map((s) => ({
      id: s.id,
      full_name: s.name,
      admission_no: s.adm,
      phone: s.phone,
      className: s.className,
      outstanding: s.outstanding,
    }));

  const today = todayIn();

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <RecordPaymentDialog students={eligibleStudents} defaultDate={today} />
      <FeeStructureDialog classes={classes ?? []} />
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fees Management"
        description="Configure fee structures, view accurate student fee balances, and collect payments."
        actions={actions}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">Active Fee Structures</h3>
          <span className="text-xs text-muted-foreground">{structures?.length ?? 0} structures configured</span>
        </div>
        <DataTable
          rows={structures ?? []}
          rowKey={(r) => r.id}
          empty={{
            title: "No fee structures configured",
            description: "Create fee structures to assign standard course fees during admission.",
            action: <FeeStructureDialog classes={classes ?? []} />,
          }}
          columns={[
            {
              key: "name",
              header: "Name",
              cell: (r) => (
                <div>
                  <span className="font-medium text-foreground">{r.name}</span>
                  <div className="text-xs text-muted-foreground">{r.classes?.name ?? "All classes"}</div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Billing Plan",
              cell: (r) => (
                <div>
                  <span className="font-medium">{titleCase(r.fee_type)}</span>
                  <div className="text-xs text-muted-foreground">
                    {r.installments === 1 ? "1-time payment" : `${r.installments} monthly installments`}
                  </div>
                </div>
              ),
            },
            {
              key: "amount",
              header: "Total Fee",
              cell: (r) => <span className="font-semibold">{formatINR(r.total_amount)}</span>,
            },
            {
              key: "due_day",
              header: "Due Day",
              cell: (r) => `Day ${r.default_due_day} of month`,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <StatusBadge status={r.status} />,
            },
          ]}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Student Fee Balances</h3>
            <p className="text-xs text-muted-foreground">Accurate lifetime course fees, collections, and pending dues per student.</p>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/payments" />}>
            View Payment History
          </Button>
        </div>
        <DataTable
          rows={allStudentBalances}
          rowKey={(r) => r.id}
          empty={{
            title: "No student fees assigned yet",
            description: "Fee obligations are automatically created when students are admitted or assigned courses.",
          }}
          columns={[
            {
              key: "student",
              header: "Student",
              cell: (r) => (
                <div>
                  <Link href={`/admin/students/${r.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    Adm: {r.adm} • {r.className} {r.phone ? `• 📞 ${r.phone}` : ""}
                  </div>
                </div>
              ),
            },
            {
              key: "total",
              header: "Total Course Fee",
              cell: (r) => <span className="font-medium">{formatINR(r.totalDue)}</span>,
            },
            {
              key: "paid",
              header: "Total Paid",
              cell: (r) => <span className="text-emerald-500 font-semibold">{formatINR(r.paid)}</span>,
            },
            {
              key: "outstanding",
              header: "Outstanding Due",
              cell: (r) =>
                r.outstanding > 0 ? (
                  <span className="font-bold text-destructive">{formatINR(r.outstanding)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Nil (₹0)</span>
                ),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) =>
                r.outstanding > 0 ? (
                  <StatusBadge status="partially_paid" label={`₹${r.outstanding} Pending`} />
                ) : (
                  <StatusBadge status="active" label="Fully Paid" />
                ),
            },
            {
              key: "action",
              header: "",
              className: "text-right",
              cell: (r) =>
                r.outstanding > 0 ? (
                  <RecordPaymentDialog
                    students={eligibleStudents}
                    defaultDate={today}
                    defaultStudentId={r.id}
                    trigger={<Button size="sm">Collect fee</Button>}
                  />
                ) : (
                  <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/admin/students/${r.id}?tab=fees`} />}>
                    View ledger
                  </Button>
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
