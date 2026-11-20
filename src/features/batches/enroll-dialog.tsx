"use client";
import { useEffect, useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { enrollStudents, searchEnrollableStudents } from "./actions";

type S = { id: string; name: string; admission_no: string; class: string | null };

export function EnrollDialog({ batchId, today, seatsLeft }: { batchId: string; today: string; seatsLeft: number | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<S[]>([]);
  const [selected, setSelected] = useState<Map<string, S>>(new Map());
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchEnrollableStudents(batchId, q);
      if (!cancelled) { setResults(r); setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open, batchId]);

  const overCapacity = seatsLeft !== null && selected.size > seatsLeft;
  const toggle = (s: S) => setSelected((m) => { const n = new Map(m); if (n.has(s.id)) n.delete(s.id); else n.set(s.id, s); return n; });
  const submit = () => start(async () => {
    setError(null);
    const res = await enrollStudents(batchId, [...selected.keys()], date, overCapacity ? reason : undefined);
    if (res.ok) { toast.success(res.message); setOpen(false); setSelected(new Map()); setReason(""); }
    else setError(res.error);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLoading(true); }}>
      <DialogTrigger render={<Button><UserPlus /> Enroll students</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enroll students</DialogTitle>
          <DialogDescription>{seatsLeft === null ? "No capacity limit." : `${Math.max(0, seatsLeft)} seat(s) left.`} Only active students not already in this batch are shown.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Search name or admission no." value={q} onChange={(e) => { setQ(e.target.value); setLoading(true); }} aria-label="Search students" />
        <div className="max-h-64 overflow-y-auto rounded-lg border">
          {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin text-muted-foreground" /></div> :
            results.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No matching students.</p> :
            results.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-muted/50">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s)} className="accent-primary" />
                <span className="flex-1 text-sm"><span className="font-medium">{s.name}</span> <span className="text-muted-foreground">· {s.admission_no}{s.class ? ` · ${s.class}` : ""}</span></span>
              </label>
            ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="enroll-date">Start date</Label><DateInput id="enroll-date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="flex items-end text-sm text-muted-foreground">{selected.size} selected</div>
        </div>
        {overCapacity && (
          <div className="space-y-1.5">
            <Label htmlFor="override">Capacity override reason <span className="text-destructive">*</span></Label>
            <Textarea id="override" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why should this batch exceed its capacity?" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button onClick={submit} disabled={pending || selected.size === 0 || (overCapacity && reason.trim().length < 5)}>{pending && <Loader2 className="animate-spin" />} Enroll {selected.size || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
