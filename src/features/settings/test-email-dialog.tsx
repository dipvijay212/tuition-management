"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, Field } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { sendTestEmailAction } from "./actions";

type Props = {
  isConfigured: boolean;
  defaultEmail?: string;
};

export function TestEmailDialog({ isConfigured, defaultEmail = "" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="size-4" />
            Send Test Email
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            Test SMTP Email Dispatch
          </DialogTitle>
          <DialogDescription>
            Send a sample verification email to check your Nodemailer connection and SMTP credentials.
          </DialogDescription>
        </DialogHeader>

        {!isConfigured ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>
                <strong>SMTP is not configured in .env yet.</strong>
                <p className="mt-1 text-xs text-amber-200/80">
                  Please specify <code className="rounded bg-black/40 px-1 py-0.5">SMTP_USER</code> and{" "}
                  <code className="rounded bg-black/40 px-1 py-0.5">SMTP_PASS</code> in your <code className="rounded bg-black/40 px-1 py-0.5">.env</code> file before testing live delivery.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>SMTP credentials detected in environment.</span>
          </div>
        )}

        <ActionForm
          action={sendTestEmailAction}
          onSuccess={() => {
            setTimeout(() => setOpen(false), 1500);
          }}
          className="space-y-4 pt-2"
        >
          {({ errors }) => (
            <>
              <Field
                label="Recipient Email Address"
                name="email"
                required
                error={errors.email}
                hint="Enter an email address where you want to receive the test email."
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  defaultValue={defaultEmail}
                  required
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton pendingText="Sending test email...">
                  <Send className="mr-1.5 size-4" />
                  Send Test Email
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
