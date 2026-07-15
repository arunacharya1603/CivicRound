"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  submitDebateReport,
  type ReportReason,
} from "@/features/reporting/services/report.service";
import { cn } from "@/lib/utils";

const REASONS: Array<{ id: ReportReason; label: string }> = [
  { id: "harassment_or_threats", label: "Harassment or threats" },
  { id: "hate_speech", label: "Hate speech" },
  { id: "explicit_content", label: "Explicit content" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other_misconduct", label: "Other misconduct" },
];

export function ReportDialog({
  open,
  onOpenChange,
  matchId,
  opponentId,
  opponentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  opponentId: string | null;
  opponentName: string;
}) {
  const [reason, setReason] = useState<ReportReason>(REASONS[0].id);
  const [details, setDetails] = useState("");
  const report = useMutation({
    mutationFn: submitDebateReport,
    onSuccess: () => setDetails(""),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {report.isSuccess ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Flag className="size-5" />
            </div>
            <DialogTitle className="mt-5">Report received</DialogTitle>
            <DialogDescription className="mt-2">
              Leave immediately if you feel unsafe. The room and both participant
              identifiers are attached for moderation.
            </DialogDescription>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report {opponentName}</DialogTitle>
              <DialogDescription>
                Choose the clearest reason. Reports contain session metadata,
                never a video recording.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              {REASONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReason(item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-3 text-left text-sm",
                    reason === item.id && "border-primary bg-primary/10",
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full border",
                      reason === item.id
                        ? "border-primary bg-primary"
                        : "border-input",
                    )}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="report-details"
                className="font-mono text-[10px] uppercase text-muted-foreground"
              >
                Optional details
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={500}
                rows={4}                className="mt-2 w-full resize-none rounded-sm border border-input bg-background p-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="What happened?"
              />
            </div>

            {report.error ? (
              <p className="text-sm text-destructive">
                {report.error.message || "The report could not be sent."}
              </p>
            ) : null}

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  report.mutate({
                    matchId,
                    reportedUserId: opponentId,
                    reason,
                    details,
                  })
                }
                disabled={report.isPending}
              >
                <Send />
                {report.isPending ? "Sending" : "Send report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
