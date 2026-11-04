import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page(props: PageProps<"/teacher/notifications">) {
  return <NotificationsPage role="teacher" searchParams={await props.searchParams} />;
}
