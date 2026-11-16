import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { FormAlert } from "@/components/shared/form-alert";
import { SettingsTabs } from "@/features/settings/settings-tabs";
import type { SmtpStatus } from "@/features/settings/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage(props: PageProps<"/admin/settings">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { institute, settings, years, grades, logoUrl, smtp } = await api<{
    institute: Tables<"institutes"> | null;
    settings: Tables<"institute_settings"> | null;
    years: Tables<"academic_years">[];
    grades: Tables<"grading_rules">[];
    logoUrl: string | null;
    smtp: SmtpStatus;
  }>("/settings");
  if (!institute || !settings) throw new Error("Institute settings are missing. Please contact support.");
  return (
    <>
      <PageHeader title="Settings" description="Institute profile, academic years and policies used across the system." />
      {sp.welcome && <FormAlert className="mb-6" message="Your institute is ready. Start by checking the institute profile and creating the current academic year." />}
      <SettingsTabs
        institute={{ ...institute, logo_url: logoUrl }}
        settings={settings}
        years={years ?? []}
        grades={grades ?? []}
        smtpConfig={smtp}
      />
    </>
  );
}
