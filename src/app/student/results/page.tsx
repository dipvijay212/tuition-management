import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { familyResults } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "My Results" };

export default async function StudentResultsPage() {
  await requireRole("student");
  const results = await familyResults();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="Your published examination report cards and performance."
      />

      {(!results || results.length === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>No results available yet</CardTitle>
            <CardDescription>Your examination results will be displayed here once published.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          {results.map((r) => {
            const breakdown = (Array.isArray(r.subject_breakdown) ? r.subject_breakdown : []) as Array<{
              subject?: string;
              max?: number;
              obtained?: number;
              is_pass?: boolean;
              is_absent?: boolean;
            }>;
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardTitle>{r.examinations?.name ?? "Examination"}</CardTitle>
                    <CardDescription>Published on {formatDate(r.published_at)}</CardDescription>
                  </div>
                  <StatusBadge
                    status={r.is_pass ? "passed" : "failed"}
                    tone={r.is_pass ? "success" : "danger"}
                    label={r.is_pass ? "Pass" : "Fail"}
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border bg-muted/20 p-3 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase font-medium">Total Marks</div>
                      <div className="text-lg font-bold">{r.total_obtained} / {r.total_max}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase font-medium">Percentage</div>
                      <div className="text-lg font-bold text-primary">{r.percentage}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase font-medium">Grade</div>
                      <div className="text-lg font-bold">{r.grade ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase font-medium">Class Rank</div>
                      <div className="text-lg font-bold">{r.rank ? `#${r.rank}` : "—"}</div>
                    </div>
                  </div>

                  {breakdown.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40 text-left text-xs uppercase text-muted-foreground border-b">
                            <th className="py-2 px-3 font-medium">Subject</th>
                            <th className="py-2 px-3 font-medium text-right">Max Marks</th>
                            <th className="py-2 px-3 font-medium text-right">Obtained</th>
                            <th className="py-2 px-3 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {breakdown.map((b: { subject?: string; max?: number; obtained?: number; is_pass?: boolean; is_absent?: boolean }, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/10">
                              <td className="py-2 px-3 font-medium">{b.subject || `Subject ${idx + 1}`}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{b.max ?? "—"}</td>
                              <td className="py-2 px-3 text-right font-medium">
                                {b.is_absent ? <span className="text-destructive">Absent</span> : b.obtained ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {b.is_absent ? (
                                  <span className="text-xs text-destructive font-medium">Absent</span>
                                ) : (
                                  <span className={`text-xs font-semibold ${b.is_pass ? "text-emerald-600" : "text-destructive"}`}>
                                    {b.is_pass ? "Pass" : "Fail"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
