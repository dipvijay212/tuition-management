"use client";
import { useState, useSyncExternalStore } from "react";
import { Check, Copy, KeyRound, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const noop = () => () => {};

/** The code people type on the sign-in page, plus a ready-made login link to share on WhatsApp etc. */
export function InstituteCodeCard({ code }: { code: string }) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = `${origin}/login?code=${encodeURIComponent(code)}`;
  const copy = async (what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Could not copy. Please copy it manually.");
    }
  };
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">Institute code: share it with staff, students and parents to sign in</p>
        <p className="font-mono text-2xl font-semibold tracking-widest">{code}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => copy("code")}>{copied === "code" ? <Check /> : <Copy />} Copy code</Button>
        <Button variant="outline" size="sm" onClick={() => copy("link")} disabled={!origin}>{copied === "link" ? <Check /> : <Link2 />} Copy sign-in link</Button>
      </div>
    </div>
  );
}
