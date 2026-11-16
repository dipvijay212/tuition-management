"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { optionalText, optionalUuid, requiredText, money } from "@/lib/validations/common";

const feeTypeSchema = z.enum(["monthly", "quarterly", "half_yearly", "yearly", "course", "custom"]);
const feeCatSchema = z.enum(["tuition", "admission", "registration", "study_material", "other"]);
const paymentMethodSchema = z.enum(["cash", "upi", "bank_transfer", "cheque", "online", "other"]);

export const saveFeeStructure = makeAction({
  roles: ["admin"],
  schema: z.object({
    id: optionalUuid,
    name: requiredText("Fee structure name", 100),
    class_id: optionalUuid,
    fee_type: feeTypeSchema,
    category: feeCatSchema.default("tuition"),
    total_amount: money,
    installments: z.coerce.number().int().min(1).max(60).default(1),
    default_due_day: z.coerce.number().int().min(1).max(28).default(5),
    discount_eligible: z.string().optional().transform((v) => v === "on" || v === "true"),
    late_fee_applicable: z.string().optional().transform((v) => v === "on" || v === "true"),
    description: optionalText,
  }),
  handler: async (v) => {
    await api("/fees/structures", { method: "POST", body: v });

    revalidatePath("/admin/fees");
    return { ok: true, message: "Fee structure saved" };
  },
});

export const recordPaymentAction = makeAction({
  roles: ["admin"],
  arrays: ["obligation_ids"],
  schema: z.object({
    student_id: z.uuid("Select a student"),
    amount: money,
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter payment date"),
    method: paymentMethodSchema,
    reference: optionalText,
    remarks: optionalText,
    obligation_ids: z.array(z.uuid()),
  }).superRefine((v, c) => {
    if (["upi", "bank_transfer", "cheque", "online"].includes(v.method) && !v.reference) {
      c.addIssue({ code: "custom", path: ["reference"], message: "Transaction reference is required for electronic payments" });
    }
  }),
  handler: async (v) => {
    // record_payment runs in the backend; it also emails the receipt.
    const res = await api<{ message: string; payment_id: string; receipt_no: string; duplicate?: boolean }>("/fees/payments", {
      method: "POST",
      body: { ...v, idempotency_key: crypto.randomUUID() },
    });

    revalidatePath("/admin/fees");
    revalidatePath("/admin/payments");
    revalidatePath("/student/fees");
    revalidatePath("/student/payments");
    revalidatePath("/parent/fees");

    return { ok: true, message: res.message, data: { payment_id: res.payment_id, receipt_no: res.receipt_no, duplicate: res.duplicate } };
  },
});
