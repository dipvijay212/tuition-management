"use client";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { savePlan } from "./actions";

export type Plan = {
  id: string; code: string; name: string; description: string | null; price_monthly: number; price_yearly: number;
  max_students: number | null; max_teachers: number | null; max_batches: number | null; storage_mb: number | null;
  features: string[]; trial_days: number; is_trial_default: boolean; is_public: boolean; is_active: boolean; sort_order: number; institutes: number;
};

const FEATURES = [
  { value: "exams", label: "Exams & results" },
  { value: "homework", label: "Homework" },
  { value: "materials", label: "Study materials" },
];

function Check({ name, label, defaultChecked, value }: { name: string; label: string; defaultChecked: boolean; value?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} value={value ?? "on"} defaultChecked={defaultChecked} className="size-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

export function PlanDialog({ plan }: { plan?: Plan }) {
  const [open, setOpen] = useState(false);
  const p = plan;
  const lim = (n: number | null | undefined) => (n == null ? "" : String(n));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={p ? <Button variant="ghost" size="sm"><Pencil /> Edit</Button> : <Button><Plus /> New plan</Button>} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{p ? `Edit ${p.name}` : "New plan"}</DialogTitle>
          <DialogDescription>Leave a limit empty for unlimited. Changes apply immediately to every institute on this plan.</DialogDescription>
        </DialogHeader>
        <ActionForm action={savePlan} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              {p && <input type="hidden" name="id" value={p.id} />}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" name="name" required error={errors.name}><Input id="name" name="name" defaultValue={p?.name} /></Field>
                <Field label="Code" name="code" required error={errors.code} hint="e.g. growth"><Input id="code" name="code" defaultValue={p?.code} className="font-mono" /></Field>
              </div>
              <Field label="Description" name="description" error={errors.description}><Textarea id="description" name="description" rows={2} defaultValue={p?.description ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price / month (₹)" name="price_monthly" required error={errors.price_monthly}><Input id="price_monthly" name="price_monthly" type="number" min={0} step="1" defaultValue={p?.price_monthly ?? 0} /></Field>
                <Field label="Price / year (₹)" name="price_yearly" required error={errors.price_yearly}><Input id="price_yearly" name="price_yearly" type="number" min={0} step="1" defaultValue={p?.price_yearly ?? 0} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max active students" name="max_students" error={errors.max_students}><Input id="max_students" name="max_students" type="number" min={0} defaultValue={lim(p?.max_students)} placeholder="Unlimited" /></Field>
                <Field label="Max teachers" name="max_teachers" error={errors.max_teachers}><Input id="max_teachers" name="max_teachers" type="number" min={0} defaultValue={lim(p?.max_teachers)} placeholder="Unlimited" /></Field>
                <Field label="Max active batches" name="max_batches" error={errors.max_batches}><Input id="max_batches" name="max_batches" type="number" min={0} defaultValue={lim(p?.max_batches)} placeholder="Unlimited" /></Field>
                <Field label="Storage (MB)" name="storage_mb" error={errors.storage_mb}><Input id="storage_mb" name="storage_mb" type="number" min={0} defaultValue={lim(p?.storage_mb)} placeholder="Unlimited" /></Field>
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">Features</legend>
                {FEATURES.map((f) => <Check key={f.value} name="features" value={f.value} label={f.label} defaultChecked={p ? p.features.includes(f.value) : true} />)}
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Trial days" name="trial_days" error={errors.trial_days}><Input id="trial_days" name="trial_days" type="number" min={0} max={365} defaultValue={p?.trial_days ?? 14} /></Field>
                <Field label="Sort order" name="sort_order" error={errors.sort_order}><Input id="sort_order" name="sort_order" type="number" min={0} defaultValue={p?.sort_order ?? 0} /></Field>
              </div>
              <div className="space-y-2">
                <Check name="is_trial_default" label="Use this plan for new sign-up trials" defaultChecked={!!p?.is_trial_default} />
                <Check name="is_public" label="Show on institutes' Subscription page" defaultChecked={p?.is_public ?? true} />
                <Check name="is_active" label="Active (can be assigned)" defaultChecked={p?.is_active ?? true} />
              </div>
              <SubmitButton className="w-full" pendingText="Saving…">Save plan</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
