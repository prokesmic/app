"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Play, Send } from "lucide-react";
import { triggerRunAction, sendTestAlertAction } from "@/app/actions/monitor";

export function MonitorControls({ telegramReady }: { telegramReady: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [auto, router]);

  function handleRun() {
    startTransition(async () => {
      const summary = await triggerRunAction();
      toast.success(
        `Checked ${summary.targetsChecked} targets · ${summary.inStockCount} in stock · ${summary.alertsSent} alerts`,
      );
      router.refresh();
    });
  }

  function handleTest() {
    startTransition(async () => {
      const res = await sendTestAlertAction();
      if (res.ok) toast.success("Test alert sent to Telegram");
      else toast.error(res.error ?? "Failed to send test alert");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={handleRun} disabled={isPending} size="sm">
        <Play className="mr-1 h-4 w-4" />
        {isPending ? "Running…" : "Run check now"}
      </Button>
      <Button
        onClick={handleTest}
        disabled={isPending || !telegramReady}
        variant="outline"
        size="sm"
        title={telegramReady ? "Send a test message" : "Configure Telegram first"}
      >
        <Send className="mr-1 h-4 w-4" />
        Send test alert
      </Button>
      <Button onClick={() => router.refresh()} variant="ghost" size="sm">
        <RefreshCw className="mr-1 h-4 w-4" />
        Refresh
      </Button>
      <Button onClick={() => setAuto((v) => !v)} variant={auto ? "default" : "ghost"} size="sm">
        {auto ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
      </Button>
    </div>
  );
}
