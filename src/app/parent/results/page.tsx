import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { familyChildren } from "@/features/family/data";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentPerformanceView } from "@/features/performance/student-performance-view";
import type { StudentPerformanceData } from "@/features/performance/types";
import { User } from "lucide-react";

export const metadata: Metadata = { title: "Children Performance & Reports" };

export default async function ParentResultsPage(props: PageProps<"/parent/results">) {
  await requireRole("parent");
  const sp = await props.searchParams;
  const children = await familyChildren();

  if (!children || children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Children Performance & Reports"
          description="Your child's exam results, how they are improving, and report cards."
        />
        <Card>
          <CardHeader>
            <CardTitle>No enrolled children linked</CardTitle>
            <CardDescription>
              No students are currently linked to your parent account. Please contact the institute administration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const selectedChildId = typeof sp.child === "string" ? sp.child : children[0].id;
  const activeChild = children.find((c) => c.id === selectedChildId) ?? children[0];

  const perf = await api<StudentPerformanceData>(`/students/${encodeURIComponent(activeChild.id)}/performance`).catch(
    () => null,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Children Performance & Reports"
        description="Monitor whether your child's academic performance is increasing, review subject strengths, and print report cards."
      />

      {/* Multi-child selector pills if parent has multiple children */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-muted-foreground mr-1">Select Child:</span>
          {children.map((child) => {
            const isSelected = child.id === activeChild.id;
            return (
              <Link
                key={child.id}
                href={`/parent/results?child=${child.id}`}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <User className="size-3.5" />
                {child.full_name}
                {child.classes?.name && <span className="opacity-80">({child.classes.name})</span>}
              </Link>
            );
          })}
        </div>
      )}

      {perf && perf.summary.total_exams > 0 ? (
        <StudentPerformanceView data={perf} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{activeChild.full_name}: No published results yet</CardTitle>
            <CardDescription>
              Examination results, score progression, and report cards for {activeChild.full_name} will appear here once examinations are published.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
