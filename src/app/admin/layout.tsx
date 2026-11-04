import { PortalLayout } from "@/components/layout/portal-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalLayout role="admin">{children}</PortalLayout>;
}
