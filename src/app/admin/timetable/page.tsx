import { redirect } from "next/navigation";

export default function TimetableRedirectPage() {
  redirect("/admin/batches");
}
