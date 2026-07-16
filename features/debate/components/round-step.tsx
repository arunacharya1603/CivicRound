"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Scale,
  Shield,
  ThumbsUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEBATE_TOPICS } from "@/features/debate/data/topics";
import type {
  DebateDuration,
  DebateSetup,
  DebateStance,
} from "@/features/debate/types/debate.types";
import { cn } from "@/lib/utils";

export function RoundStep({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (setup: DebateSetup) => void;
}) {
  const [topicId, setTopicId] = useState(DEBATE_TOPICS[0].id);
  const [stance, setStance] = useState<DebateStance>("support");
  const [duration, setDuration] = useState<DebateDuration>(120);
  const topic =
    DEBATE_TOPICS.find((item) => item.id === topicId) ?? DEBATE_TOPICS[0];

  return (
    <section className="screen-enter mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-primary">
            <Scale className="size-4" />
            Round format
          </div>
          <h1 className="text-balance mt-3 font-display text-4xl font-semibold leading-none sm:text-5xl">
            Choose a motion worth arguing.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Pick the position you can defend clearly. We will find someone
            holding the other side.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="live-dot size-1.5 rounded-full bg-primary" />
          Setup open
        </div>
      </header>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">
            Select one motion
          </p>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {DEBATE_TOPICS.map((item) => {
              const selected = item.id === topicId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTopicId(item.id)}
                  className={cn(
                    "relative flex min-h-36 min-w-0 flex-col border bg-card p-5 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-primary/[0.06]"
                      : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.category}
                  </span>
                  <span className="mt-3 block max-w-[34ch] font-display text-xl font-semibold leading-6">
                    {item.statement}
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                    {item.context}
                    <span
                      className={cn(
                        "ml-3 grid size-6 shrink-0 place-items-center rounded-full border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {selected ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="min-w-0 border border-border bg-card xl:sticky xl:top-36">
          <div className="border-b border-border p-5">
            <p className="font-mono text-[9px] uppercase text-primary">
              Selected motion
            </p>
            <p className="mt-3 font-display text-2xl font-semibold leading-7">
              {topic.statement}
            </p>
          </div>

          <div className="border-b border-border p-5">
            <p className="text-xs font-semibold text-muted-foreground">
              Your position
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ["support", "Support", ThumbsUp],
                  ["challenge", "Challenge", Shield],
                ] as const
              ).map(([value, label, Icon]) => {
                const selected = stance === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStance(value)}
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-sm border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected && value === "support"
                        ? "border-secondary bg-secondary text-secondary-foreground"
                        : selected
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-border p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                Round length
              </p>
              <Clock3 className="size-4 text-primary" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([60, 120] as const).map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setDuration(seconds)}
                  className={cn(
                    "h-12 rounded-sm border font-mono text-sm font-semibold transition-colors",
                    duration === seconds
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {seconds === 60 ? "01:00" : "02:00"}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {duration === 60
                ? "30 seconds each. One clean opening."
                : "40-second openings, then 20-second responses."}
            </p>
          </div>

          <div className="grid gap-2 p-5">
            <Button
              size="lg"
              onClick={() => onComplete({ topicId, stance, duration })}
              className="w-full"
            >
              Check camera
              <ArrowRight />
            </Button>
            <Button variant="ghost" onClick={onBack} className="w-full">
              <ArrowLeft />
              Back
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
