import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tuition Manager",
    short_name: "Tuition",
    description: "Tuition classes management: students, attendance, fees, exams and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3f3fbf",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
