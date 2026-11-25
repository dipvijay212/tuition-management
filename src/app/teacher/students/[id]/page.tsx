import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { StudentPerformanceView } from "@/features/performance/student-performance-view";
import type { StudentPerformanceData } from "@/features/performance/types";

export const metadata: Metadata = { title: "Student Performance" };

export default async function TeacherStudentPerformancePage(props: PageProps<"/teacher/students/[id]">) {
  await requireRole("teacher");
  const { id } = await props.params;

  const data = await api<StudentPerformanceData>(`/students/${encodeURIComponent(id)}/performance`).catch(() => null);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${data.student.full_name} — Performance Report`}
        description={`Admission No: ${data.student.admission_no} · Class: ${data.student.class_name ?? "—"} · Track performance trajectory, test deltas, and subject mastery.`}
        back={{ href: "/teacher/students", label: "My Students" }}
      />
      <StudentPerformanceView data={data} />
    </div>
  );
}
