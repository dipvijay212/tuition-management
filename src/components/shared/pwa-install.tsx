"use client";
import { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share,
  PlusSquare,
  Laptop,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppRole } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/permissions/navigation";

// Global cache for the beforeinstallprompt event so it persists across client navigations
let globalDeferredPrompt: any = null;
const promptListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent default browser mini-infobar on mobile so it doesn't disturb the UI
    e.preventDefault();
    globalDeferredPrompt = e;
    promptListeners.forEach((fn) => fn());
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn());
  });
}

export function usePwaInstall() {
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => !!globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 2. Detect iOS & mobile
    const ua = window.navigator.userAgent;
    const isAppleMobile = /iPhone|iPad|iPod/i.test(ua);
    setIsIOS(isAppleMobile);
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));

    // 3. Listener for beforeinstallprompt
    const onPromptChange = () => {
      setHasPrompt(!!globalDeferredPrompt);
    };
    promptListeners.add(onPromptChange);

    return () => {
      promptListeners.delete(onPromptChange);
    };
  }, []);

  async function triggerInstall(): Promise<"installed" | "dismissed" | "guide"> {
    if (globalDeferredPrompt) {
      try {
        globalDeferredPrompt.prompt();
        const choice = await globalDeferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          globalDeferredPrompt = null;
          setHasPrompt(false);
          return "installed";
        }
        return "dismissed";
      } catch {
        return "guide";
      }
    }
    return "guide";
  }

  return {
    hasPrompt,
    isInstalled,
    isIOS,
    isMobile,
    triggerInstall,
  };
}

export function InstallAppCard({
  role,
  instituteName,
}: {
  role: AppRole;
  instituteName?: string;
}) {
  const { hasPrompt, isInstalled, isIOS, isMobile, triggerInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const roleName = ROLE_LABEL[role];

  async function handleInstallClick() {
    if (isInstalled) return;
    if (hasPrompt) {
      const outcome = await triggerInstall();
      if (outcome === "guide") setShowGuide(true);
    } else {
      setShowGuide(true);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                {isMobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
              </span>
              <div>
                <CardTitle className="text-base">Install App</CardTitle>
                <CardDescription>
                  Progressive Web App for your {roleName.toLowerCase()} portal
                </CardDescription>
              </div>
            </div>
            {isInstalled ? (
              <Badge variant="outline" className="gap-1 border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-3.5" /> Installed
              </Badge>
            ) : (
              <Badge variant="secondary">{roleName} Portal</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Install {instituteName ? `${instituteName}'s ` : "Tuition "}
            {roleName} app directly onto your device. Enjoy one-tap access from your home screen or
            dock, faster loading, and automatic offline caching.
          </p>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Dedicated home screen / dock icon</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Full-screen app experience</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Persistent sliding login session</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Reliable offline fallback</span>
            </div>
          </div>

          <div className="pt-2">
            {isInstalled ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                <span>This application is already installed and running as a progressive web app.</span>
              </div>
            ) : (
              <Button onClick={handleInstallClick} className="w-full gap-2 sm:w-auto">
                <Download className="size-4" />
                Install {roleName} App
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guide dialog for iOS / browsers without direct prompt */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How to install the {roleName} App</DialogTitle>
            <DialogDescription>
              Follow the quick steps below for your browser to add the app to your device:
            </DialogDescription>
          </DialogHeader>

          {isIOS ? (
            <div className="space-y-4 pt-2 text-sm">
              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                  1
                </span>
                <div>
                  <span className="font-medium">Tap the Share button</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    In Safari&apos;s bottom toolbar, tap the Share icon (<Share className="inline size-3.5" />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                  2
                </span>
                <div>
                  <span className="font-medium">Select &quot;Add to Home Screen&quot;</span>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    Scroll down the share sheet and tap <PlusSquare className="inline size-3.5" /> <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                  3
                </span>
                <div>
                  <span className="font-medium">Confirm &quot;Add&quot;</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tap <strong>Add</strong> in the top right corner. The {roleName} App icon will appear on your home screen!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 text-sm">
              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                  1
                </span>
                <div>
                  <span className="font-medium">In your browser menu</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click the three dots (⋮) or browser address bar icon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                  2
                </span>
                <div>
                  <span className="font-medium">Select &quot;Install App&quot; or &quot;Add to Home screen&quot;</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Confirm the prompt to install the {roleName} app directly.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button variant="outline" onClick={() => setShowGuide(false)} className="w-full">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InstallAppMenuItem({ role }: { role: AppRole }) {
  const { hasPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const roleName = ROLE_LABEL[role];

  if (isInstalled) return null;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (hasPrompt) {
      const outcome = await triggerInstall();
      if (outcome === "guide") setShowGuide(true);
    } else {
      setShowGuide(true);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Download className="size-4" /> Install {roleName} app
      </button>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Install {roleName} App</DialogTitle>
            <DialogDescription>
              To install this app on your device, use your browser&apos;s menu (⋮) or tap Share (<Share className="inline size-3.5" />) &gt; &quot;Add to Home Screen&quot;.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setShowGuide(false)} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
