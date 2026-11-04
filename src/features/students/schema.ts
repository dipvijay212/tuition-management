import { z } from "zod";
import { normalizePhone } from "@/lib/validations/common";

const phone = z.string().trim().transform(normalizePhone).refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");
const optPhone = z.string().trim().optional().transform((v) => (v ? normalizePhone(v) : "")).refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");
const optEmail = z.string().trim().toLowerCase().optional().refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email");
const opt = z.string().trim().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const studentStep = z.object({
  full_name: z.string().trim().min(2, "Student name is required").max(100),
  date_of_birth: z.string().optional().refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v < new Date().toISOString().slice(0, 10)), "Enter a valid past date"),
  gender: z.enum(["", "male", "female", "other"]).optional(),
  blood_group: opt,
  phone: optPhone,
  email: optEmail,
  address: opt,
  city: opt,
  state: opt,
  pin_code: z.string().trim().optional().refine((v) => !v || /^\d{6}$/.test(v), "PIN code must be 6 digits"),
});

export const guardianSchema = z.object({
  full_name: z.string().trim().min(2, "Parent name is required"),
  phone,
  alt_phone: optPhone,
  email: optEmail,
  relationship: z.string().trim().min(1, "Relationship is required"),
  is_primary: z.boolean(),
  is_emergency_contact: z.boolean(),
});
export const guardiansStep = z.object({ guardians: z.array(guardianSchema).min(1, "Add at least one parent/guardian") });

export const academicStep = z.object({
  admission_no: z.string().trim().max(30).optional(),
  admission_date: date,
  school_name: opt,
  class_id: z.uuid("Select a class"),
  academic_year_id: z.string().optional(),
  subject_ids: z.array(z.string()),
  batch_ids: z.array(z.string()),
  capacity_override_reason: opt,
  previous_academics: opt,
});

export const feeLine = z.object({
  fee_structure_id: z.string().optional(),
  description: z.string().trim().min(1, "Description is required"),
  category: z.enum(["tuition", "admission", "registration", "study_material", "other"]),
  fee_type: z.enum(["monthly", "quarterly", "half_yearly", "yearly", "course", "custom"]),
  base_amount: z.coerce.number().positive("Amount must be greater than zero").refine((n) => Math.round(n * 100) === n * 100, "At most 2 decimals"),
  installments: z.coerce.number().int().min(1).max(60),
  start_date: date,
  due_day: z.coerce.number().int().min(1).max(28),
  discount_id: z.string().optional(),
  discount_amount: z.coerce.number().min(0).default(0),
  scholarship_amount: z.coerce.number().min(0).default(0),
  discount_reason: opt,
}).superRefine((f, c) => {
  if (f.discount_amount + f.scholarship_amount > f.base_amount) c.addIssue({ code: "custom", path: ["discount_amount"], message: "Discount + scholarship cannot exceed the fee" });
  if ((f.discount_amount + f.scholarship_amount > 0 || f.discount_id) && !f.discount_reason && !f.discount_id) c.addIssue({ code: "custom", path: ["discount_reason"], message: "Give a reason for the discount" });
});
export const feesStep = z.object({ fees: z.array(feeLine) });

export const accountsStep = z.object({
  create_parent_login: z.boolean(),
  create_student_login: z.boolean(),
});

export const admissionSchema = studentStep.and(guardiansStep).and(academicStep).and(feesStep).and(accountsStep);
export type AdmissionInput = z.input<typeof admissionSchema>;
