import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReceiptDialog } from "@/features/fees/receipt-dialog";
import { formatINR, formatDate, titleCase } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Fees & Payments" };

export default async function ParentFeesPage() {
  await requireRole("parent");
  const supabase = await createClient();

  const [{ data: obligations, error: oErr }, { data: payments, error: pErr }] = await Promise.all([
    supabase
      .from("fee_obligations")
      .select("id, description, due_date, net_amount, amount_paid, status, students(full_name)")
      .order("due_date", { ascending: true }),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, reference, status, students(full_name, admission_no), receipts(receipt_no)")
      .order("payment_date", { ascending: false }),
  ]);

  if (oErr) throw oErr;
  if (pErr) throw pErr;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Children Fees & Payments"
        description="View fee obligations, installment schedules, and payment receipts."
      />

      <div className="space-y-3">
        <h3 className="text-base font-semibold tracking-tight">Fee Obligations</h3>
        <DataTable
          rows={obligations ?? []}
          rowKey={(r) => r.id}
          empty={{
            title: "No fee obligations found",
            description: "There are currently no fee obligations recorded for your children.",
          }}
          columns={[
            {
              key: "child",
              header: "Child",
              cell: (r) => <span className="font-medium text-foreground">{r.students?.full_name}</span>,
            },
            {
              key: "desc",
              header: "Fee",
              cell: (r) => r.description,
            },
            {
              key: "due_date",
              header: "Due Date",
              cell: (r) => formatDate(r.due_date),
            },
            {
              key: "net",
              header: "Net Fee",
              cell: (r) => formatINR(r.net_amount),
            },
            {
              key: "paid",
              header: "Paid",
              cell: (r) => <span className="text-emerald-600 font-medium">{formatINR(r.amount_paid)}</span>,
            },
            {
              key: "balance",
              header: "Balance Due",
              cell: (r) => {
                const bal = Number(r.net_amount) - Number(r.amount_paid);
                return <span className={bal > 0 ? "font-bold text-destructive" : ""}>{formatINR(bal)}</span>;
              },
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
        <h3 className="text-base font-semibold tracking-tight">Payment Receipts</h3>
        <DataTable
          rows={payments ?? []}
          rowKey={(r) => r.id}
          empty={{
            title: "No payment receipts found",
            description: "Payment receipts will be available once recorded.",
          }}
          columns={[
            {
              key: "receipt",
              header: "Receipt #",
              cell: (r) => {
                const rc = Array.isArray(r.receipts) ? r.receipts[0] : r.receipts;
                const receiptNo = rc?.receipt_no ?? "RCP-DRAFT";
                return (
                  <ReceiptDialog
                    receipt={{
                      receiptNo,
                      studentName: r.students?.full_name ?? "Child",
                      admissionNo: r.students?.admission_no ?? "—",
                      amount: Number(r.amount),
                      paymentDate: r.payment_date,
                      method: r.method,
                      reference: r.reference,
                    }}
                  />
                );
              },
            },
            {
              key: "child",
              header: "Child",
              cell: (r) => r.students?.full_name ?? "—",
            },
            {
              key: "date",
              header: "Date",
              cell: (r) => formatDate(r.payment_date),
            },
            {
              key: "method",
              header: "Method",
              cell: (r) => titleCase(r.method),
            },
            {
              key: "amount",
              header: "Amount Paid",
              cell: (r) => <span className="font-semibold text-foreground">{formatINR(r.amount)}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <StatusBadge status={r.status} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

