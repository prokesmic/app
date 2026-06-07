"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { toggleTargetAction, updateTargetAction } from "@/app/actions/monitor";

interface Props {
  id: string;
  url: string;
  isActive: boolean;
  strategy: string;
}

export function TargetActions({ id, url, isActive, strategy }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [urlValue, setUrlValue] = useState(url);
  const [partNumber, setPartNumber] = useState("");

  function handleToggle() {
    startTransition(async () => {
      await toggleTargetAction(id, !isActive);
      router.refresh();
    });
  }

  function handleSave() {
    startTransition(async () => {
      await updateTargetAction(id, {
        url: urlValue,
        partNumber: strategy === "apple-fulfillment" ? partNumber : undefined,
      });
      toast.success("Target updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button onClick={handleToggle} disabled={isPending} variant="ghost" size="sm">
        {isActive ? "Pause" : "Resume"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit target</DialogTitle>
            <DialogDescription>
              Paste the exact product page URL{strategy === "apple-fulfillment" ? " and the regional Apple part number" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="target-url">Product URL</Label>
              <Input id="target-url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} />
            </div>
            {strategy === "apple-fulfillment" ? (
              <div className="space-y-1.5">
                <Label htmlFor="part-number">Apple part number (e.g. MU963LL/A)</Label>
                <Input
                  id="part-number"
                  placeholder="leave blank to keep current"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
