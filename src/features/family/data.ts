import "server-only";
import { api } from "@/lib/api/server";
import type { Json, Tables } from "@/types/database";

/** Typed reads for the parent & student portals (the backend scopes everything to the caller's students). */
type Named = { name: string } | null;
export type FamilyStudent = Pick<Tables<"students">, "id" | "full_name" | "admission_no" | "status" | "class_id"> & {
  classes: Named;
  student_batches: { batch_id: string; status: string }[];
};
export type AttendanceRow = Pick<Tables<"attendance">, "id" | "session_date" | "status" | "remarks"> & { students: { full_name: string } | null; batches: Named };
export type ObligationRow = Pick<Tables<"fee_obligations">, "id" | "installment_no" | "category" | "description" | "due_date" | "gross_amount" | "discount_amount" | "net_amount" | "amount_paid" | "status"> & {
  students: { full_name: string } | null;
};
export type PaymentRow = Pick<Tables<"payments">, "id" | "amount" | "payment_date" | "method" | "reference" | "status"> & {
  students: { full_name: string; admission_no: string } | null;
  receipts: { receipt_no: string } | null;
};
export type ResultRow = Pick<Tables<"published_results">, "id" | "total_obtained" | "total_max" | "percentage" | "grade" | "is_pass" | "rank" | "published_at"> & {
  subject_breakdown: Json;
  examinations: { name: string; start_date: string | null; end_date: string | null } | null;
  students: { full_name: string } | null;
};
export type SlotRow = Pick<Tables<"timetable">, "id" | "day_of_week" | "start_time" | "end_time" | "room"> & { batches: Named; subjects: Named; teachers: { full_name: string } | null };
export type HomeworkRow = Pick<Tables<"homework">, "id" | "title" | "description" | "assigned_date" | "due_at" | "batch_id"> & {
  batches: Named;
  subjects: Named;
  homework_submissions: { student_id: string; status: string; feedback: string | null }[];
};
export type MaterialRow = Pick<Tables<"study_materials">, "id" | "title" | "description" | "file_path" | "mime_type" | "size_bytes" | "created_at"> & {
  classes: Named;
  batches: Named;
  subjects: Named;
  url: string | null;
};

export const familyChildren = () => api<FamilyStudent[]>("/family/children");
export const myStudent = () => api<{ id: string; class_id: string | null; student_batches: { batch_id: string; status: string }[] } | null>("/family/me");
export const familyAttendance = () => api<AttendanceRow[]>("/family/attendance");
export const familyFees = () => api<{ obligations: ObligationRow[]; payments: PaymentRow[] }>("/family/fees");
export const familyResults = () => api<ResultRow[]>("/family/results");
export const familyTimetable = () => api<SlotRow[]>("/family/timetable");
export const familyHomework = () => api<HomeworkRow[]>("/family/homework");
export const familyMaterials = () => api<MaterialRow[]>("/family/materials");
