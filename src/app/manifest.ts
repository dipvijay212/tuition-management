import type { MetadataRoute } from "next";
import { getSession, primaryRole } from "@/lib/auth/session";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Tuition Manager";
  let shortName = "Tuition";
  let description = "Tuition classes management: students, attendance, fees, exams and more.";
  let startUrl = "/";

  try {
    const s = await getSession();
    if (s) {
      const role = primaryRole(s);
      const instName = s.institute?.name || "Tuition";

      if (role === "admin") {
        name = `${instName} · Admin`;
        shortName = `${instName} Admin`;
        description = "Manage students, teachers, batches, fees and institute operations.";
        startUrl = "/admin";
      } else if (role === "teacher") {
        name = `${instName} · Teacher`;
        shortName = `${instName} Teacher`;
        description = "Submit attendance, view batches, homework and examinations.";
        startUrl = "/teacher";
      } else if (role === "student") {
        name = `${instName} · Student`;
        shortName = `${instName} Student`;
        description = "View attendance, homework, test results and study materials.";
        startUrl = "/student";
      } else if (role === "parent") {
        name = `${instName} · Parent`;
        shortName = `${instName} Parent`;
        description = "Track your child's attendance, fees, homework and exam marks.";
        startUrl = "/parent";
      } else if (s.platform) {
        name = "Tuition Platform Admin";
        shortName = "Platform";
        startUrl = "/platform";
      }
    }
  } catch {
    // Fall back to default
  }

  return {
    name,
    short_name: shortName,
    description,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#3f3fbf",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Admin Portal",
        short_name: "Admin",
        url: "/admin",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Teacher Portal",
        short_name: "Teacher",
        url: "/teacher",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Student Portal",
        short_name: "Student",
        url: "/student",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Parent Portal",
        short_name: "Parent",
        url: "/parent",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
