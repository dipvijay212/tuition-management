"use client";
import { useState } from "react";
import { Plus, IndianRupee } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { recordPaymentAction } from "./actions";
import { formatINR } from "@/lib/utilities/format";

export type StudentOption = {
  id: string;
  full_name: string;
  admission_no: string;
  outstanding: number;
  phone?: string | null;
  className?: string | null;
};

export function RecordPaymentDialog({
  students,
  defaultDate,
  defaultStudentId = "",
  trigger,
}: {
  students: StudentOption[];
  defaultDate: string;
  defaultStudentId?: string;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(defaultStudentId);
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState<string>(() => {
    if (defaultStudentId) {
      const s = students.find((x) => x.id === defaultStudentId);
      return s ? String(s.outstanding) : "";
    }
    return "";
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && defaultStudentId) {
      setSelectedStudentId(defaultStudentId);
      const s = students.find((x) => x.id === defaultStudentId);
      if (s) setAmount(String(s.outstanding));
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const s = students.find((x) => x.id === id);
    if (s && s.outstanding > 0) {
      setAmount(String(s.outstanding));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger ?? <Button><Plus /> Record payment</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Fee Payment</DialogTitle>
          <DialogDescription>Record student payment and issue a formal collection receipt.</DialogDescription>
        </DialogHeader>
        <ActionForm action={recordPaymentAction} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <Field label="Student" name="student_id" required error={errors.student_id}>
                <NativeSelect
                  id="student_id"
                  name="student_id"
                  required
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                >
                  <option value="" disabled>Select student with dues</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_no}){s.className ? ` • ${s.className}` : ""}{s.phone ? ` • 📞 ${s.phone}` : ""} — Due: ₹{s.outstanding}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              {selectedStudent && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Due: </span>
                    <strong className="text-destructive font-semibold text-sm">{formatINR(selectedStudent.outstanding)}</strong>
                  </div>
                  {Number(amount) !== selectedStudent.outstanding && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAmount(String(selectedStudent.outstanding))}
                    >
                      Fill Full Balance
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount to Collect (₹)" name="amount" required error={errors.amount}>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </Field>
                <Field label="Payment Date" name="payment_date" required error={errors.payment_date}>
                  <DateInput id="payment_date" name="payment_date" defaultValue={defaultDate} required />
                </Field>
              </div>

              <Field label="Payment Method" name="method" required error={errors.method}>
                <NativeSelect
                  id="method"
                  name="method"
                  required
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </Field>

              {method !== "cash" && (
                <Field label="Transaction / Cheque Reference" name="reference" required error={errors.reference}>
                  <Input id="reference" name="reference" placeholder="e.g. UPI Ref / UTR / Cheque No." required />
                </Field>
              )}

              <Field label="Remarks (optional)" name="remarks" error={errors.remarks}>
                <Input id="remarks" name="remarks" placeholder="e.g. Paid in full for term" />
              </Field>

              <SubmitButton className="w-full">
                <IndianRupee className="size-4" /> Confirm & Issue Receipt
              </SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
