"use client";
import { useState, useTransition } from "react";
import { ArrowRightLeft, KeyRound, Loader2, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectClass } from "@/components/shared/form";
import { titleCase } from "@/lib/utilities/format";
import { changeStudentStatus, createFamilyLogin, transferStudent, uploadStudentDocument, uploadStudentPhoto } from "./actions";
import type { ActionResult } from "@/lib/utilities/errors";

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult<unknown>>, onOk?: () => void) => start(async () => {
    setError(null);
    const r = await fn();
    if (r.ok) { toast.success(r.message ?? "Done"); onOk?.(); } else setError(r.error);
  });
  return { pending, error, run };
}

const STATUSES = ["active", "inactive", "on_hold", "discontinued", "completed"] as const;

export function StatusDialog({ studentId, current }: { studentId: string; current: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current);
  const [reason, setReason] = useState("");
  const { pending, error, run } = useRun();
  const leaving = status === "discontinued" || status === "completed";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Change status</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Change student status</DialogTitle><DialogDescription>History, attendance, fees and results are always preserved.</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="st">New status</Label><select id="st" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></div>
        {leaving && <p className="rounded-md bg-warning/10 p-3 text-sm">Active batch enrolments will be ended. New attendance and fees will be blocked.</p>}
        <div className="space-y-1.5"><Label htmlFor="sr">Reason</Label><Textarea id="sr" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button disabled={pending || status === current || (status !== "active" && reason.trim().length < 3)} onClick={() => run(() => changeStudentStatus(studentId, status as (typeof STATUSES)[number], reason), () => setOpen(false))}>{pending && <Loader2 className="animate-spin" />} Update status</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransferDialog({ enrolment, batches, today }: { enrolment: { id: string; batchName: string }; batches: { id: string; name: string; full: boolean }[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState("");
  const { pending, error, run } = useRun();
  const full = batches.find((b) => b.id === to)?.full;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm"><ArrowRightLeft /> Transfer</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer from {enrolment.batchName}</DialogTitle><DialogDescription>The old enrolment is closed the day before the transfer date. Past attendance and fees are not changed.</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="tb">New batch</Label><select id="tb" className={selectClass} value={to} onChange={(e) => setTo(e.target.value)}><option value="">Select batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.full ? " (full)" : ""}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="td">Transfer date</Label><Input id="td" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="tr">Reason</Label><Textarea id="tr" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        {full && <div className="space-y-1.5"><Label htmlFor="to">Capacity override reason</Label><Textarea id="to" rows={2} value={override} onChange={(e) => setOverride(e.target.value)} /></div>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button disabled={pending || !to || reason.trim().length < 3 || (full && override.trim().length < 5)} onClick={() => run(() => transferStudent(enrolment.id, to, date, reason, override), () => setOpen(false))}>{pending && <Loader2 className="animate-spin" />} Transfer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentUpload({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useRun();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Upload /> Upload document</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Upload document</DialogTitle><DialogDescription>PDF or image. Documents are private and shared only through short-lived links.</DialogDescription></DialogHeader>
        <form action={(fd) => run(() => uploadStudentDocument(fd), () => setOpen(false))} className="space-y-3">
          <input type="hidden" name="student_id" value={studentId} />
          <div className="space-y-1.5"><Label htmlFor="dt">Title</Label><Input id="dt" name="title" placeholder="Birth certificate" required /></div>
          <div className="space-y-1.5"><Label htmlFor="df">File</Label><Input id="df" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">{pending && <Loader2 className="animate-spin" />} Upload</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PhotoUpload({ studentId }: { studentId: string }) {
  const { pending, run } = useRun();
  return (
    <label className="absolute -right-1 -bottom-1 grid size-7 cursor-pointer place-items-center rounded-full border bg-background shadow-sm hover:bg-muted" title="Change photo">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const fd = new FormData(); fd.set("student_id", studentId); fd.set("file", f);
        run(() => uploadStudentPhoto(fd));
      }} />
    </label>
  );
}

export function LoginButton({ kind, id, disabledReason }: { kind: "student" | "parent"; id: string; disabledReason?: string }) {
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex flex-col items-start">
      <Button variant="outline" size="sm" disabled={pending || !!disabledReason} title={disabledReason} onClick={() => run(() => createFamilyLogin(kind, id))}>{pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Send login invitation</Button>
      {(error || disabledReason) && <span className="mt-1 text-xs text-muted-foreground">{error ?? disabledReason}</span>}
    </span>
  );
}
