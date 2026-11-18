"use client";
import { useState } from "react";
import { Ban, CalendarPlus, Pencil, PlayCircle, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { renewSubscription, setInstituteStatus, updateInstitute, updateSubscription } from "./actions";

export type PlanOption = { id: string; name: string; code: string; price_monthly: number; price_yearly: number; is_active: boolean };
export type Sub = {
  plan_id: string; status: "trialing" | "active" | "cancelled"; billing_cycle: "monthly" | "yearly";
  trial_ends_at: string | null; current_period_end: string | null; grace_days: number; notes: string | null;
} | null;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
/** trial_ends_at is the moment the trial stops; the form shows the last included day. */
const lastDay = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 1000).toISOString().slice(0, 10) : "");

function PlanSelect({ plans, defaultValue, error }: { plans: PlanOption[]; defaultValue?: string; error?: string[] }) {
  return (
    <Field label="Plan" name="plan_id" required error={error}>
      <NativeSelect id="plan_id" name="plan_id" defaultValue={defaultValue}>
        {plans.filter((p) => p.is_active || p.id === defaultValue).map((p) => (
          <option key={p.id} value={p.id}>{p.name} (₹{p.price_monthly}/mo · ₹{p.price_yearly}/yr)</option>
        ))}
      </NativeSelect>
    </Field>
  );
}

/** Record an offline payment and extend the paid period. */
export function RenewDialog({ instituteId, plans, sub }: { instituteId: string; plans: PlanOption[]; sub: Sub }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><CalendarPlus /> Renew / record payment</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew subscription</DialogTitle>
          <DialogDescription>Extends from the current end date (or today, if it has ended) and sets the subscription active.</DialogDescription>
        </DialogHeader>
        <ActionForm action={renewSubscription} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <input type="hidden" name="institute_id" value={instituteId} />
              <PlanSelect plans={plans} defaultValue={sub?.plan_id} error={errors.plan_id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Billing" name="billing_cycle" error={errors.billing_cycle}>
                  <NativeSelect id="billing_cycle" name="billing_cycle" defaultValue={sub?.billing_cycle ?? "monthly"}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </NativeSelect>
                </Field>
                <Field label="Periods" name="periods" error={errors.periods} hint="Months or years">
                  <Input id="periods" name="periods" type="number" min={1} max={36} defaultValue={1} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount received (₹)" name="amount" error={errors.amount}><Input id="amount" name="amount" type="number" min={0} step="0.01" /></Field>
                <Field label="Method" name="method" error={errors.method}>
                  <NativeSelect id="method" name="method" defaultValue="upi">
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Reference / UTR" name="reference" error={errors.reference}><Input id="reference" name="reference" /></Field>
              <Field label="Note" name="note" error={errors.note}><Textarea id="note" name="note" rows={2} /></Field>
              <SubmitButton className="w-full" pendingText="Saving…">Renew</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

/** Direct edit: change plan, extend trial, set end date, cancel. */
export function EditSubscriptionDialog({ instituteId, plans, sub }: { instituteId: string; plans: PlanOption[]; sub: Sub }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(sub?.status ?? "trialing");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><Settings2 /> Edit subscription</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit subscription</DialogTitle>
          <DialogDescription>Change the plan, extend a trial or correct dates. Lowering limits never deletes data; it only blocks adding more.</DialogDescription>
        </DialogHeader>
        <ActionForm action={updateSubscription} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <input type="hidden" name="institute_id" value={instituteId} />
              <PlanSelect plans={plans} defaultValue={sub?.plan_id} error={errors.plan_id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status" name="status" error={errors.status}>
                  <NativeSelect id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                    <option value="trialing">Trial</option>
                    <option value="active">Active (paid)</option>
                    <option value="cancelled">Cancelled</option>
                  </NativeSelect>
                </Field>
                <Field label="Billing" name="billing_cycle" error={errors.billing_cycle}>
                  <NativeSelect id="billing_cycle" name="billing_cycle" defaultValue={sub?.billing_cycle ?? "monthly"}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </NativeSelect>
                </Field>
              </div>
              {status === "trialing" ? (
                <Field label="Trial ends after" name="trial_ends_at" required error={errors.trial_ends_at}>
                  <Input id="trial_ends_at" name="trial_ends_at" type="date" defaultValue={lastDay(sub?.trial_ends_at ?? null)} />
                </Field>
              ) : (
                <Field label="Paid until (inclusive)" name="current_period_end" error={errors.current_period_end} hint="Leave empty for no end date.">
                  <Input id="current_period_end" name="current_period_end" type="date" defaultValue={day(sub?.current_period_end ?? null)} />
                </Field>
              )}
              <Field label="Grace days after end" name="grace_days" error={errors.grace_days}>
                <Input id="grace_days" name="grace_days" type="number" min={0} max={60} defaultValue={sub?.grace_days ?? 7} />
              </Field>
              <Field label="Internal notes" name="notes" error={errors.notes} hint="Only visible to platform admins.">
                <Textarea id="notes" name="notes" rows={2} defaultValue={sub?.notes ?? ""} />
              </Field>
              <SubmitButton className="w-full" pendingText="Saving…">Save</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function EditInstituteDialog({ instituteId, name, code }: { instituteId: string; name: string; code: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><Pencil /> Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit institute</DialogTitle>
          <DialogDescription>Changing the code means everyone must use the new code to sign in.</DialogDescription>
        </DialogHeader>
        <ActionForm action={updateInstitute} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <input type="hidden" name="institute_id" value={instituteId} />
              <Field label="Name" name="name" required error={errors.name}><Input id="name" name="name" defaultValue={name} /></Field>
              <Field label="Institute code" name="code" required error={errors.code}><Input id="code" name="code" defaultValue={code} className="font-mono uppercase" /></Field>
              <SubmitButton className="w-full" pendingText="Saving…">Save</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function StatusDialog({ instituteId, suspended }: { instituteId: string; suspended: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={suspended ? <Button variant="outline"><PlayCircle /> Reactivate</Button> : <Button variant="destructive"><Ban /> Suspend</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{suspended ? "Reactivate institute" : "Suspend institute"}</DialogTitle>
          <DialogDescription>
            {suspended ? "Everyone in this institute can sign in again." : "Nobody in this institute can sign in or use the app until you reactivate it. No data is deleted."}
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={setInstituteStatus} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <input type="hidden" name="institute_id" value={instituteId} />
              <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
              <Field label="Reason" name="reason" required error={errors.reason}><Textarea id="reason" name="reason" rows={2} /></Field>
              <SubmitButton className="w-full" variant={suspended ? "default" : "destructive"} pendingText="Saving…">{suspended ? "Reactivate" : "Suspend"}</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
