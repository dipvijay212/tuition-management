"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveFeeStructure } from "./actions";
import { formatINR } from "@/lib/utilities/format";

type Props = {
  classes: { id: string; name: string }[];
};

export function FeeStructureDialog({ classes }: Props) {
  const [open, setOpen] = useState(false);
  const [feeType, setFeeType] = useState<string>("monthly");
  const [amount, setAmount] = useState<number | "">("");
  const [installments, setInstallments] = useState<number>(12);
  const [dueDay, setDueDay] = useState<number>(5);

  const handleTypeChange = (type: string) => {
    setFeeType(type);
    if (type === "course" || type === "yearly") {
      setInstallments(1);
    } else if (type === "monthly") {
      setInstallments(12);
    } else if (type === "quarterly") {
      setInstallments(4);
    } else if (type === "half_yearly") {
      setInstallments(2);
    }
  };

  const perInstallment = amount && installments > 0 ? Math.round(Number(amount) / installments) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus /> Add fee structure</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fee Structure</DialogTitle>
          <DialogDescription>Create simple course fees, monthly tuition plans, or installment packages.</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveFeeStructure} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <Field label="Structure Name" name="name" required error={errors.name}>
                <Input id="name" name="name" placeholder="e.g. Standard 10 Full Year Tuition" required />
              </Field>

              <input type="hidden" name="category" value="tuition" />
              <Field label="Class" name="class_id" error={errors.class_id} hint="Leave as '(All classes)' if applicable across standards">
                <NativeSelect id="class_id" name="class_id" defaultValue="">
                  <option value="">(All classes)</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NativeSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment Schedule" name="fee_type" required error={errors.fee_type}>
                  <NativeSelect
                    id="fee_type"
                    name="fee_type"
                    required
                    value={feeType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    <option value="monthly">Monthly Plan (12 months)</option>
                    <option value="yearly">Full Year (1 payment)</option>
                    <option value="course">Entire Course (One-time)</option>
                    <option value="quarterly">Quarterly (4 installments)</option>
                    <option value="half_yearly">Half Yearly (2 installments)</option>
                    <option value="custom">Custom Installments</option>
                  </NativeSelect>
                </Field>
                <Field label="Total Amount (₹)" name="total_amount" required error={errors.total_amount}>
                  <Input
                    id="total_amount"
                    name="total_amount"
                    type="number"
                    step="1"
                    placeholder="e.g. 24000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Number of Installments"
                  name="installments"
                  required
                  error={errors.installments}
                  hint={feeType === "course" || feeType === "yearly" ? "Fixed at 1 for lump-sum" : "How many payments"}
                >
                  <Input
                    id="installments"
                    name="installments"
                    type="number"
                    min="1"
                    max="60"
                    value={installments}
                    disabled={feeType === "course" || feeType === "yearly"}
                    onChange={(e) => setInstallments(Number(e.target.value) || 1)}
                    required
                  />
                </Field>
                <Field label="Due day of each month" name="default_due_day" required error={errors.default_due_day}>
                  <Input
                    id="default_due_day"
                    name="default_due_day"
                    type="number"
                    min="1"
                    max="28"
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value) || 5)}
                    required
                  />
                </Field>
              </div>

              {/* Real-time Summary Box */}
              {amount ? (
                <div className="rounded-lg border bg-primary/5 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Billing Preview: </span>
                  {installments <= 1 ? (
                    <span>
                      Student will be billed <strong className="text-foreground">{formatINR(Number(amount))}</strong> in 1 single payment due on Day {dueDay}.
                    </span>
                  ) : (
                    <span>
                      Total <strong className="text-foreground">{formatINR(Number(amount))}</strong> split across{" "}
                      <strong className="text-foreground">{installments}</strong> payments of approximately{" "}
                      <strong className="text-emerald-500">{formatINR(perInstallment)}</strong> each, due on Day {dueDay} of each month.
                    </span>
                  )}
                </div>
              ) : null}

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" name="discount_eligible" defaultChecked className="rounded border-input" />
                  <span>Discount eligible</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" name="late_fee_applicable" defaultChecked className="rounded border-input" />
                  <span>Late fees apply</span>
                </label>
              </div>

              <SubmitButton className="w-full">Create fee structure</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
