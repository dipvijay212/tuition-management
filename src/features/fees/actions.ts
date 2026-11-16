"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    const row = {
      institute_id: inst,
      name: v.name,
      class_id: v.class_id ?? null,
      fee_type: v.fee_type,
      category: v.category,
      total_amount: v.total_amount,
      installments: v.installments,
      default_due_day: v.default_due_day,
      discount_eligible: v.discount_eligible,
      late_fee_applicable: v.late_fee_applicable,
      description: v.description ?? null,
    };

    if (v.id) {
      check(await supabase.from("fee_structures").update(row).eq("id", v.id));
    } else {
      check(await supabase.from("fee_structures").insert(row));
    }

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
    const supabase = await createClient();
    const idempotencyKey = crypto.randomUUID();

    const { data, error } = await supabase.rpc("record_payment", {
      p_student: v.student_id,
      p_amount: v.amount,
      p_payment_date: v.payment_date,
      p_method: v.method,
      p_reference: v.reference ?? "",
      p_remarks: v.remarks ?? "",
      p_obligation_ids: v.obligation_ids,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw error;

    revalidatePath("/admin/fees");
    revalidatePath("/admin/payments");
    revalidatePath("/student/fees");
    revalidatePath("/student/payments");
    revalidatePath("/parent/fees");

    const res = data as { payment_id: string; receipt_no: string; duplicate?: boolean };

    // Fire fee receipt email in background safely
    try {
      const { data: receipt } = await supabase
        .from("receipts")
        .select("snapshot, institute_id")
        .eq("payment_id", res.payment_id)
        .maybeSingle();

      if (receipt) {
        const snap = receipt.snapshot as {
          institute?: { name?: string; phone?: string; email?: string };
          student?: { name?: string; admission_no?: string };
          payment_date?: string;
          amount?: number;
          method?: string;
          reference?: string;
          remaining_balance?: number;
          items?: Array<{ description: string; amount: number }>;
        };

        const { data: st } = await supabase
          .from("students")
          .select("email")
          .eq("id", v.student_id)
          .single();

        const { data: guardians } = await supabase
          .from("parent_students")
          .select("is_primary, guardians(email)")
          .eq("student_id", v.student_id);

        const emailRecipients: string[] = [];
        if (st?.email) emailRecipients.push(st.email);
        for (const g of guardians ?? []) {
          const gEmail = (g.guardians as { email?: string } | null)?.email;
          if (gEmail && !emailRecipients.includes(gEmail)) {
            emailRecipients.push(gEmail);
          }
        }

        if (emailRecipients.length > 0) {
          const { renderFeeReceiptEmail, sendEmail } = await import("@/lib/email");
          const tpl = renderFeeReceiptEmail({
            instituteName: snap?.institute?.name,
            studentName: snap?.student?.name ?? "Student",
            admissionNo: snap?.student?.admission_no ?? "",
            receiptNo: res.receipt_no,
            paymentDate: snap?.payment_date ?? v.payment_date,
            amount: snap?.amount ?? v.amount,
            paymentMethod: snap?.method ?? v.method,
            reference: snap?.reference ?? v.reference,
            remainingBalance: snap?.remaining_balance,
            items: snap?.items,
          });

          await sendEmail({
            to: emailRecipients,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
            instituteId: receipt.institute_id,
          });
        }
      }
    } catch (emailErr) {
      console.error("[Fee Receipt Email Trigger Failed]", emailErr);
    }

    return {
      ok: true,
      message: `Payment of ₹${v.amount} recorded! Receipt: ${res?.receipt_no ?? ""}`,
      data: res,
    };
  },
});
