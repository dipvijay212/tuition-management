import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page(props: PageProps<"/parent/notifications">) {
  return <NotificationsPage role="parent" searchParams={await props.searchParams} />;
}
