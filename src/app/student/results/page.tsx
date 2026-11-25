import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { myStudent } from "@/features/family/data";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentPerformanceView } from "@/features/performance/student-performance-view";
import type { StudentPerformanceData } from "@/features/performance/types";

export const metadata: Metadata = { title: "My Performance & Results" };

export default async function StudentResultsPage() {
  await requireRole("student");
  const me = await myStudent();
  const perf = me ? await api<StudentPerformanceData>(`/students/${me.id}/performance`).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance & Results"
        description="Detailed academic progression, score deltas, subject mastery, and formal report cards."
      />

      {perf && perf.summary.total_exams > 0 ? (
        <StudentPerformanceView data={perf} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No results available yet</CardTitle>
            <CardDescription>
              Your examination results and detailed performance progression will appear here once examinations are published by your teachers.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
