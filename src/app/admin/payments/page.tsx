import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Json, Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SelectFilter } from "@/components/shared/filters";
import { RecordPaymentDialog, type StudentOption } from "@/features/fees/record-payment-dialog";
import { ReceiptDialog } from "@/features/fees/receipt-dialog";
import { formatINR, formatDate, todayIn, titleCase } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage(props: PageProps<"/admin/payments">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  type Stu = { id: string; full_name: string; admission_no: string; phone: string | null; classes: { name: string } | null };
  type Row = Pick<Tables<"payments">, "id" | "amount" | "payment_date" | "method" | "reference" | "remarks" | "status"> & { students: Stu | null; receipts: { receipt_no: string; snapshot: Json } | null };
  const { rows: data, count, unpaid: unpaidObligations } = await api<{ rows: Row[]; count: number; unpaid: { student_id: string; net_amount: number; amount_paid: number; students: Stu | null }[] }>(
    "/fees/payments",
    { query: { page, pageSize, method: str(sp.method) } },
  );

  // Build eligible students with outstanding dues for the RecordPaymentDialog
  const studentMap = new Map<string, StudentOption>();
  for (const o of unpaidObligations ?? []) {
    if (!o.students) continue;
    const existing = studentMap.get(o.student_id) ?? {
      id: o.students.id,
      full_name: o.students.full_name,
      admission_no: o.students.admission_no,
      phone: o.students.phone ?? null,
      className: (o.students.classes as { name: string } | null)?.name ?? null,
      outstanding: 0,
    };
    existing.outstanding += Number(o.net_amount) - Number(o.amount_paid);
    studentMap.set(o.student_id, existing);
  }
  const eligibleStudents = Array.from(studentMap.values()).filter((s) => s.outstanding > 0);

  const actions = (
    <RecordPaymentDialog
      students={eligibleStudents}
      defaultDate={todayIn()}
    />
  );

  return (
    <>
      <PageHeader
        title="Payment Collections"
        description="Recorded fee payments, transaction receipts, and payment method audit."
        actions={actions}
      />
      <FilterBar>
        <SelectFilter
          param="method"
          label="Payment Method"
          options={[
            { value: "cash", label: "Cash" },
            { value: "upi", label: "UPI" },
            { value: "bank_transfer", label: "Bank Transfer" },
            { value: "cheque", label: "Cheque" },
            { value: "online", label: "Online" },
          ]}
        />
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{
          title: "No payments recorded yet",
          description: "Click 'Record payment' to record student fee collections.",
          action: actions,
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
                    studentName: r.students?.full_name ?? "Student",
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
            key: "student",
            header: "Student",
            cell: (r) => (
              <div>
                <span className="font-medium text-foreground">{r.students?.full_name}</span>
                <div className="text-xs text-muted-foreground">
                  Adm: {r.students?.admission_no}
                  {(r.students?.classes as { name: string } | null)?.name ? ` • ${(r.students?.classes as { name: string } | null)?.name}` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "date",
            header: "Date",
            cell: (r) => formatDate(r.payment_date),
          },
          {
            key: "method",
            header: "Method",
            cell: (r) => (
              <div>
                <span>{titleCase(r.method)}</span>
                {r.reference && <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">{r.reference}</div>}
              </div>
            ),
          },
          {
            key: "amount",
            header: "Amount Paid",
            cell: (r) => <span className="font-semibold text-emerald-500">{formatINR(r.amount)}</span>,
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
        ]}
      />
    </>
  );
}
