"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { verifyEmailLinkAction } from "@/features/auth/actions";

/**
 * Landing page for email links (invite, password recovery): /auth/callback?token=...&type=...
 * The single-use token is exchanged from the browser (not on GET), so email link
 * scanners that only fetch the page cannot use it up.
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    // Remove the token from the address bar/history straight away.
    window.history.replaceState(null, "", url.pathname);
    const verify = token ? verifyEmailLinkAction(token) : Promise.resolve({ ok: false as const, error: "This link is invalid." });
    verify.then((r) => {
      if (r.ok) router.replace(r.next);
      else setError(r.error);
    });
  }, [router]);

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      {error ? (
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">Link problem</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/forgot-password" className="text-sm text-primary hover:underline">
            Request a new link
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Verifying your link…
        </div>
      )}
    </div>
  );
}
