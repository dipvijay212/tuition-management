import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page(props: PageProps<"/admin/notifications">) {
  return <NotificationsPage role="admin" searchParams={await props.searchParams} />;
}
