"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Check,
  MessageSquareQuote,
  RefreshCw,
  Send,
  Sparkles,
  Swords,
  TimerReset,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  DebateSession,
  DebateSetup,
  DebateTopic,
} from "@/features/debate/types/debate.types";
import { submitRoundFeedback } from "@/features/reporting/services/feedback.service";
import { cn } from "@/lib/utils";

const FEEDBACK = [
  ["respectful", "Respectful", Check],
  ["clear", "Clear argument", MessageSquareQuote],
  ["thoughtful", "Thought-provoking", Sparkles],
] as const;

export function ResultsStep({
  topic,
  setup,
  session,
  onRematch,
  onNewRound,
}: {
  topic: DebateTopic;
  setup: DebateSetup;
  session: DebateSession;
  onRematch: () => void;
  onNewRound: () => void;
}) {
  const [feedback, setFeedback] = useState<string[]>([]);
  const feedbackSubmission = useMutation({
    mutationFn: () =>
      submitRoundFeedback({
        roomId: session.id,
        tags: feedback,
      }),
  });

  return (
    <section className="screen-enter mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-16">
      <div className="border border-border bg-card">
        <div className="grid gap-6 border-b border-border p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase text-primary">
              Round complete / Logged
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              Good round.
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              You met an opposing position and completed a structured political
              conversation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px border border-border bg-border">
            <div className="bg-background p-4">
              <TimerReset className="size-4 text-primary" />
              <p className="mt-3 font-mono text-2xl font-semibold">
                {setup.duration === 60 ? "01:00" : "02:00"}
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">
                Round time
              </p>
            </div>
            <div className="bg-background p-4">
              <Swords className="size-4 text-secondary" />
              <p className="mt-3 font-mono text-2xl font-semibold">1V1</p>
              <p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">
                Format
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="font-mono text-[9px] uppercase text-muted-foreground">
              Motion debated
            </p>
            <div className="mt-3 bg-[#f3f1e8] p-5 text-[#101313] sm:p-7">
              <p className="font-display text-2xl font-semibold leading-tight">
                {topic.statement}
              </p>
            </div>

            <p className="mt-5 font-mono text-[9px] uppercase text-muted-foreground">
              Recognize the opponent
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {FEEDBACK.map(([id, label, Icon]) => {
                const selected = feedback.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      feedbackSubmission.reset();
                      setFeedback((current) =>
                        selected                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      );
                    }}
                    className={cn(
                      "flex min-h-24 flex-col items-start justify-between rounded-sm border border-border bg-background p-3 text-left text-sm font-semibold",
                      selected &&
                        "border-secondary bg-secondary text-secondary-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => feedbackSubmission.mutate()}
                disabled={!feedback.length || feedbackSubmission.isPending}
              >
                <Send />
                {feedbackSubmission.isPending
                  ? "Saving"
                  : feedbackSubmission.isSuccess
                    ? "Feedback saved"
                    : "Send feedback"}
              </Button>
              {feedbackSubmission.error ? (
                <span className="text-xs text-destructive">
                  Feedback could not be saved.
                </span>
              ) : null}
            </div>
          </div>

          <aside className="grid content-start gap-3 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">
              Opponent
            </p>
            <div className="border border-border bg-background p-4">
              <p className="font-display text-xl font-semibold">
                {session.opponentName}
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase text-accent">
                {session.opponentStance}
              </p>
            </div>
            <Button size="lg" onClick={onRematch} className="w-full">
              <RefreshCw />
              Find another opponent
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onNewRound}
              className="w-full"
            >
              Choose a new motion
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}
