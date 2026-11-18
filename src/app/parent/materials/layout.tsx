import { FeatureGate } from "@/components/shared/feature-gate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="materials">{children}</FeatureGate>;
}
