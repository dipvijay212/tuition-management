import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarksEntryTable } from "@/features/exams/marks-entry-table";
import { formatDate, titleCase } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Marks Entry" };

export default async function TeacherExamDetailPage(props: PageProps<"/teacher/examinations/[id]">) {
  await requireRole("teacher");
  const { id } = await props.params;
  type ExamSubject = Pick<Tables<"examination_subjects">, "id" | "subject_id" | "exam_date" | "max_marks" | "passing_marks"> & { subjects: { id: string; name: string } | null };
  type Mark = Pick<Tables<"marks">, "examination_subject_id" | "student_id" | "obtained_marks" | "is_absent" | "remarks">;
  type Eligible = { id: string; full_name: string; admission_no: string };
  type Exam = Pick<Tables<"examinations">, "id" | "name" | "exam_type" | "start_date" | "end_date" | "status" | "result_publish_date" | "class_id" | "batch_id"> & { classes: { name: string } | null; batches: { name: string } | null };
  const r = await api<{ exam: Exam | null; examSubjects: ExamSubject[]; allSubjects: { id: string; name: string }[]; marks: Mark[]; students: Eligible[] }>(`/exams/${encodeURIComponent(id)}`).catch(() => null);
  const exam = r?.exam;
  if (!r || !exam) notFound();
  const { examSubjects, marks: existingMarks } = r;
  const eligibleStudents: Eligible[] = r.students;

  const marksMap = new Map<string, Map<string, { obtained_marks: number | null; is_absent: boolean; remarks: string | null }>>();
  for (const m of existingMarks ?? []) {
    let subMap = marksMap.get(m.examination_subject_id);
    if (!subMap) {
      subMap = new Map();
      marksMap.set(m.examination_subject_id, subMap);
    }
    subMap.set(m.student_id, {
      obtained_marks: m.obtained_marks,
      is_absent: m.is_absent,
      remarks: m.remarks,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam.name}
        description={`${titleCase(exam.exam_type)} • ${formatDate(exam.start_date)} to ${formatDate(exam.end_date)}`}
      />

      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
        <div>
          <span className="text-xs text-muted-foreground uppercase font-medium">Status</span>
          <div className="mt-1"><StatusBadge status={exam.status} /></div>
        </div>
        <div className="border-l pl-4">
          <span className="text-xs text-muted-foreground uppercase font-medium">Batch</span>
          <div className="mt-1 text-sm font-medium">{exam.batches?.name ?? "General"}</div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">Subject Marks</h3>
        {(!examSubjects || examSubjects.length === 0) ? (
          <p className="text-sm text-muted-foreground">No subjects have been configured for this examination yet.</p>
        ) : (
          examSubjects.map((sub) => {
            const subMarks = marksMap.get(sub.id);
            const studentEntries = (eligibleStudents ?? []).map((st) => {
              const rec = subMarks?.get(st.id);
              return {
                id: st.id,
                full_name: st.full_name,
                admission_no: st.admission_no,
                obtained_marks: rec?.obtained_marks,
                is_absent: rec?.is_absent,
                remarks: rec?.remarks ?? undefined,
              };
            });

            return (
              <Card key={sub.id}>
                <CardHeader>
                  <CardTitle>{sub.subjects?.name ?? "Subject"}</CardTitle>
                  <CardDescription>
                    Max: {sub.max_marks} • Passing: {sub.passing_marks}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MarksEntryTable
                    examId={exam.id}
                    examSubjectId={sub.id}
                    maxMarks={Number(sub.max_marks)}
                    students={studentEntries}
                  />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

