"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, Field } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { createAdminUser } from "./actions";

export function NewAdminDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus /> Add admin</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Add admin user</DialogTitle><DialogDescription>Admins have full access including finances. Teachers, students and parents get logins from their own modules.</DialogDescription></DialogHeader>
        <ActionForm action={createAdminUser} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <Field label="Full name" name="full_name" required error={errors.full_name}><Input id="full_name" name="full_name" /></Field>
              <Field label="Email" name="email" required error={errors.email}><Input id="email" name="email" type="email" /></Field>
              <Field label="Mobile" name="phone" required error={errors.phone}><Input id="phone" name="phone" type="tel" /></Field>
              <Field label="Temporary password" name="password" required error={errors.password}><Input id="password" name="password" autoComplete="new-password" /></Field>
              <SubmitButton className="w-full">Create admin</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
