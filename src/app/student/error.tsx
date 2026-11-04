"use client";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="This page couldn't be loaded"
      description={error.message && !error.message.includes("digest") ? error.message : "Please try again. If the problem continues, contact the administrator."}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
