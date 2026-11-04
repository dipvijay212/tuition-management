import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicBrandingUrl } from "@/lib/supabase/storage";
import { PageHeader } from "@/components/shared/page-header";
import { FormAlert } from "@/components/shared/form-alert";
import { SettingsTabs } from "@/features/settings/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage(props: PageProps<"/admin/settings">) {
  const ctx = await requireRole("admin");
  const sp = await props.searchParams;
  const supabase = await createClient();
  const inst = ctx.institute!.id;
  const [{ data: institute }, { data: settings }, { data: years }, { data: grades }] = await Promise.all([
    supabase.from("institutes").select("*").eq("id", inst).single(),
    supabase.from("institute_settings").select("*").eq("institute_id", inst).single(),
    supabase.from("academic_years").select("*").eq("institute_id", inst).order("start_date", { ascending: false }),
    supabase.from("grading_rules").select("*").eq("institute_id", inst).order("sort_order"),
  ]);
  if (!institute || !settings) throw new Error("Institute settings are missing. Please contact support.");
  return (
    <>
      <PageHeader title="Settings" description="Institute profile, academic years and policies used across the system." />
      {sp.welcome && <FormAlert className="mb-6" message="Your institute is ready. Start by checking the institute profile and creating the current academic year." />}
      <SettingsTabs institute={{ ...institute, logo_url: publicBrandingUrl(institute.logo_path) }} settings={settings} years={years ?? []} grades={grades ?? []} />
    </>
  );
}
