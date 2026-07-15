"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Shield, ThumbsUp } from "lucide-react";

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
  const topic = DEBATE_TOPICS.find((item) => item.id === topicId) ?? DEBATE_TOPICS[0];

  return (
    <section className="screen-enter mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase text-primary">Match setup / Round format</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Choose your argument.</h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
          <span className="live-dot size-1.5 rounded-full bg-primary" />
          Waiting for setup
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">Subject of debate</p>
          <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
            {DEBATE_TOPICS.map((item) => {
              const selected = item.id === topicId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTopicId(item.id)}
                  className={cn(
                    "min-h-28 bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "bg-primary text-primary-foreground",
                  )}
                >
                  <span className={cn("font-mono text-[9px] uppercase text-muted-foreground", selected && "text-primary-foreground/70")}>
                    {item.category}
                  </span>
                  <span className="mt-2 block font-display text-base font-semibold leading-6">{item.statement}</span>
                  {selected ? <Check className="mt-3 size-4" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 border border-border bg-[#f3f1e8] p-5 text-[#101313] sm:p-7">
            <p className="font-mono text-[9px] uppercase text-[#55605d]">Selected motion</p>
            <p className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">{topic.statement}</p>
            <p className="mt-3 text-sm text-[#55605d]">{topic.context}</p>
          </div>
        </div>

        <aside className="grid content-start gap-5">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">Declare stance</p>
            <div className="grid grid-cols-2 gap-px border border-border bg-border">
              {([
                ["support", "Support", ThumbsUp],
                ["challenge", "Challenge", Shield],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStance(value)}
                  className={cn(
                    "grid min-h-28 place-items-center gap-2 bg-card p-3 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    stance === value && value === "support" && "bg-secondary text-secondary-foreground",
                    stance === value && value === "challenge" && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="font-display text-lg font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">Round clock</span>
              <Clock3 className="size-4 text-primary" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([60, 120] as const).map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setDuration(seconds)}
                  className={cn(
                    "border border-border px-3 py-3 font-mono text-sm font-semibold",
                    duration === seconds && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {seconds === 60 ? "01:00" : "02:00"}
                </button>
              ))}
            </div>
            <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              {duration === 60
                ? "30 seconds each. One clean opening."
                : "40-second openings, then 20-second responses."}
            </p>
          </div>

          <Button size="lg" onClick={() => onComplete({ topicId, stance, duration })} className="w-full">
            Check camera
            <ArrowRight />
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft />
            Back
          </Button>
        </aside>
      </div>
    </section>
  );
}
