import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">The page doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Button nativeButton={false} render={<Link href="/" />}>Go to my dashboard</Button>
      </div>
    </div>
  );
}
