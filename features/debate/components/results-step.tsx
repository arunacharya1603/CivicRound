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
  DebateRoomOutcome,
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
  outcome,
  onRematch,
  onNewRound,
}: {
  topic: DebateTopic;
  setup: DebateSetup;
  session: DebateSession;
  outcome: DebateRoomOutcome;
  onRematch: () => void;
  onNewRound: () => void;
}) {
  const completed = outcome === "complete";
  const [feedback, setFeedback] = useState<string[]>([]);
  const feedbackSubmission = useMutation({
    mutationFn: () =>
      submitRoundFeedback({
        roomId: session.id,
        tags: feedback,
      }),
  });

  return (
    <section className="screen-enter mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase text-primary">
            {completed ? "Round complete" : "Round ended"}
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none sm:text-6xl">
            {completed ? "Good round." : "Round ended early."}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {completed
              ? "The disagreement stays in the room. Recognize a strong opponent or move straight into another motion."
              : "A participant left before the timer finished. This round was not marked as complete."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ResultStat
            icon={TimerReset}
            value={
              completed
                ? setup.duration === 60
                  ? "01:00"
                  : "02:00"
                : "No result"
            }
            label={completed ? "Round time" : "Round status"}
            tone="primary"
          />
          <ResultStat
            icon={Swords}
            value="1V1"
            label="Format"
            tone="secondary"
          />
        </div>
      </header>

      <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">
            {completed ? "Motion debated" : "Motion selected"}
          </p>
          <div className="mt-3 border-l-2 border-primary bg-card p-5 sm:p-7">
            <p className="max-w-3xl font-display text-3xl font-semibold leading-tight">
              {topic.statement}
            </p>
          </div>

          {completed ? (
            <div className="mt-8 border-t border-border pt-7">
              <p className="text-sm font-semibold">Recognize the opponent</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional feedback is private and helps reinforce better rounds.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {FEEDBACK.map(([id, label, Icon]) => {
                const selected = feedback.includes(id);

                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      feedbackSubmission.reset();
                      setFeedback((current) =>
                        selected
                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      );
                    }}
                    className={cn(
                      "flex min-h-24 flex-col items-start justify-between rounded-sm border border-border bg-card p-4 text-left text-sm font-semibold transition-colors",
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

              <div className="mt-4 flex flex-wrap items-center gap-3">
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
          ) : null}
        </div>

        <aside className="border-y border-border py-5 lg:sticky lg:top-24">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">
            Opponent
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground">
              {session.opponentName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">
                {session.opponentName}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase text-accent">
                {session.opponentStance === "support" ? "Support" : "Against"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
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
          </div>
        </aside>
      </div>
    </section>
  );
}

function ResultStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof TimerReset;
  value: string;
  label: string;
  tone: "primary" | "secondary";
}) {
  return (
    <div className="border border-border bg-card p-4">
      <Icon
        className={cn(
          "size-4",
          tone === "primary" ? "text-primary" : "text-secondary",
        )}
      />
      <p className="mt-3 font-mono text-xl font-semibold">{value}</p>
      <p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
