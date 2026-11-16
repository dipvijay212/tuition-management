"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page for email links (invite, password recovery).
 * Supports all three formats Supabase can send:
 *  - implicit:   #access_token=...&refresh_token=...&type=invite   (admin invites)
 *  - PKCE:       ?code=...
 *  - OTP hash:   ?token_hash=...&type=recovery
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const supabase = createClient();
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const nextParam = url.searchParams.get("next") ?? "/";
    const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

    (async () => {
      let type = hash.get("type") ?? url.searchParams.get("type");
      let err: { message: string } | null = null;
      if (hash.get("error_description")) {
        err = { message: hash.get("error_description")! };
      } else if (hash.get("access_token") && hash.get("refresh_token")) {
        ({ error: err } = await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        }));
      } else if (url.searchParams.get("code")) {
        ({ error: err } = await supabase.auth.exchangeCodeForSession(url.searchParams.get("code")!));
        type ??= "recovery";
      } else if (url.searchParams.get("token_hash") && type) {
        ({ error: err } = await supabase.auth.verifyOtp({
          token_hash: url.searchParams.get("token_hash")!,
          type: type as EmailOtpType,
        }));
      } else {
        const { data: s } = await supabase.auth.getSession();
        if (s?.session) {
          router.replace(type === "invite" || type === "recovery" ? "/reset-password" : next);
          return;
        }
        err = { message: "This link is invalid." };
      }

      if (err) {
        const { data: s } = await supabase.auth.getSession();
        if (s?.session) {
          router.replace(type === "invite" || type === "recovery" ? "/reset-password" : next);
          return;
        }
        window.history.replaceState(null, "", url.pathname);
        setError(
          /expired|invalid/i.test(err.message)
            ? "This link has expired or was already used. Ask the institute to send a new one, or use 'Forgot password'."
            : err.message
        );
        return;
      }

      // Remove tokens from the address bar/history before navigating.
      window.history.replaceState(null, "", url.pathname);
      router.replace(type === "invite" || type === "recovery" ? "/reset-password" : next);
    })();
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
