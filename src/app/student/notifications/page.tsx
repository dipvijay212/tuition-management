import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page(props: PageProps<"/student/notifications">) {
  return <NotificationsPage role="student" searchParams={await props.searchParams} />;
}
