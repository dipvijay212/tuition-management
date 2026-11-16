import { redirect } from "next/navigation";

export default function AdmissionsRedirectPage() {
  redirect("/admin/students/new");
}
