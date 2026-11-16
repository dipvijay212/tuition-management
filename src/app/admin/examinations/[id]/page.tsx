import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExamSubjectDialog } from "@/features/exams/exam-subject-dialog";
import { PublishExamDialog } from "@/features/exams/publish-exam-dialog";
import { MarksEntryTable } from "@/features/exams/marks-entry-table";
import { formatDate, titleCase } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Manage Examination" };

export default async function ExamDetailPage(props: PageProps<"/admin/examinations/[id]">) {
  await requireRole("admin");
  const { id } = await props.params;
  type ExamSubject = Pick<Tables<"examination_subjects">, "id" | "subject_id" | "exam_date" | "max_marks" | "passing_marks"> & { subjects: { id: string; name: string } | null };
  type Mark = Pick<Tables<"marks">, "examination_subject_id" | "student_id" | "obtained_marks" | "is_absent" | "remarks">;
  type Eligible = { id: string; full_name: string; admission_no: string };
  type Exam = Pick<Tables<"examinations">, "id" | "name" | "exam_type" | "start_date" | "end_date" | "status" | "result_publish_date" | "class_id" | "batch_id"> & { classes: { name: string } | null; batches: { name: string } | null };
  const r = await api<{ exam: Exam | null; examSubjects: ExamSubject[]; allSubjects: { id: string; name: string }[]; marks: Mark[]; students: Eligible[] }>(`/exams/${encodeURIComponent(id)}`).catch(() => null);
  const exam = r?.exam;
  if (!r || !exam) notFound();
  const { examSubjects, allSubjects, marks: existingMarks } = r;
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

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <ExamSubjectDialog examId={exam.id} subjects={allSubjects ?? []} />
      {exam.status !== "published" && (
        <PublishExamDialog examId={exam.id} examName={exam.name} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam.name}
        description={`${titleCase(exam.exam_type)} • ${formatDate(exam.start_date)} to ${formatDate(exam.end_date)}`}
        actions={actions}
      />

      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border bg-card">
        <div>
          <span className="text-xs text-muted-foreground uppercase font-medium">Status</span>
          <div className="mt-1"><StatusBadge status={exam.status} /></div>
        </div>
        <div className="border-l pl-4">
          <span className="text-xs text-muted-foreground uppercase font-medium">Target</span>
          <div className="mt-1 text-sm font-medium">
            {exam.classes?.name ?? "All Classes"} {exam.batches?.name ? `(${exam.batches.name})` : ""}
          </div>
        </div>
        {exam.result_publish_date && (
          <div className="border-l pl-4">
            <span className="text-xs text-muted-foreground uppercase font-medium">Scheduled Result Date</span>
            <div className="mt-1 text-sm font-medium">{formatDate(exam.result_publish_date)}</div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">Subject Marks Entry</h3>
        {(!examSubjects || examSubjects.length === 0) ? (
          <Card>
            <CardHeader>
              <CardTitle>No subjects added yet</CardTitle>
              <CardDescription>Add the subjects tested in this examination to enter marks and grades.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExamSubjectDialog examId={exam.id} subjects={allSubjects ?? []} />
            </CardContent>
          </Card>
        ) : (
          <>
            {examSubjects.map((sub) => {
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
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{sub.subjects?.name ?? "Subject"}</CardTitle>
                      <CardDescription>
                        Max: {sub.max_marks} • Passing: {sub.passing_marks} • Exam Date: {formatDate(sub.exam_date)}
                      </CardDescription>
                    </div>
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
            })}

            {exam.status !== "published" && (
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border bg-card">
                <div>
                  <div className="font-semibold text-sm">Marks entered? Publish exam results</div>
                  <div className="text-xs text-muted-foreground">
                    Publishing calculates overall percentages, pass/fail status, student rankings, and generates report cards.
                  </div>
                </div>
                <PublishExamDialog examId={exam.id} examName={exam.name} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
