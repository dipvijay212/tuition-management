import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { familyFees } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatINR, formatDate, titleCase } from "@/lib/utilities/format";
import { Wallet, CheckCircle, AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "My Fees" };

export default async function StudentFeesPage() {
  await requireRole("student");
  const { obligations } = await familyFees();

  let totalNet = 0;
  let totalPaid = 0;
  for (const o of obligations ?? []) {
    totalNet += Number(o.net_amount);
    totalPaid += Number(o.amount_paid);
  }
  const totalOutstanding = Math.max(0, totalNet - totalPaid);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Fee Obligations"
        description="Summary of fee dues, installments, and payment schedules."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Fee Obligation" value={formatINR(totalNet)} icon={Wallet} />
        <StatCard label="Total Paid" value={formatINR(totalPaid)} tone="success" icon={CheckCircle} />
        <StatCard label="Outstanding Balance" value={formatINR(totalOutstanding)} tone={totalOutstanding > 0 ? "danger" : "success"} icon={AlertCircle} />
      </div>

      <DataTable
        rows={obligations ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No fee obligations found",
          description: "There are currently no fee obligations assigned to your account.",
        }}
        columns={[
          {
            key: "desc",
            header: "Fee Description",
            cell: (r) => (
              <div>
                <span className="font-medium text-foreground">{r.description}</span>
                <div className="text-xs text-muted-foreground">{titleCase(r.category)}</div>
              </div>
            ),
          },
          {
            key: "due_date",
            header: "Due Date",
            cell: (r) => formatDate(r.due_date),
          },
          {
            key: "net",
            header: "Net Amount",
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
  );
}
