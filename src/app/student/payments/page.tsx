import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReceiptDialog } from "@/features/fees/receipt-dialog";
import { formatINR, formatDate, titleCase } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Payment History" };

export default async function StudentPaymentsPage() {
  await requireRole("student");
  const supabase = await createClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, amount, payment_date, method, reference, status, receipts(receipt_no)")
    .order("payment_date", { ascending: false });

  if (error) throw error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Receipts"
        description="Your past fee payment transactions and printable receipts."
      />

      <DataTable
        rows={payments ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No payments recorded",
          description: "Your fee receipts will appear here once recorded by the institute.",
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
                    studentName: "My Receipt",
                    admissionNo: "—",
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
            key: "date",
            header: "Date",
            cell: (r) => formatDate(r.payment_date),
          },
          {
            key: "method",
            header: "Payment Method",
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
  );
}

