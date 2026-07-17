"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
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

const CATEGORIES = [
  "All",
  "Technology & society",
  "Democratic process",
  "Campaign finance",
  "Artificial intelligence",
  "Voting rights",
  "Local government",
] as const;

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
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const topic =
    DEBATE_TOPICS.find((item) => item.id === topicId) ?? DEBATE_TOPICS[0];

  const filteredTopics = DEBATE_TOPICS.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory,
  );

  const chooseCategory = (category: string) => {
    setSelectedCategory(category);
    if (category === "All") return;
    const firstTopic = DEBATE_TOPICS.find((item) => item.category === category);
    if (firstTopic) setTopicId(firstTopic.id);
  };

  return (
    <section className="screen-enter mx-auto flex h-[calc(100svh-3rem)] w-full max-w-[1180px] flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5 sm:pt-5 lg:h-[calc(100svh-3.5rem)] lg:px-8">
      <header className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">
            Choose your battleground
          </p>
          <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl lg:text-4xl">
            Pick your motion
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Choose a topic and the side you will defend.
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-secondary" />
          {DEBATE_TOPICS.length} live motions
        </div>
      </header>

      <div className="relative mt-3 shrink-0 sm:mt-4">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 pr-7">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategory === category}
              onClick={() => chooseCategory(category)}
              className={cn(
                "h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-[10px] font-medium transition-all duration-200 sm:h-9 sm:px-3.5 sm:text-[11px]",
                selectedCategory === category
                  ? "border-primary/50 bg-primary text-primary-foreground shadow-[0_0_18px_rgba(0,240,255,0.12)]"
                  : "border-white/[0.06] bg-white/[0.035] text-muted-foreground hover:border-white/10 hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              {category}
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
      </div>

      <div className="mt-2 min-h-[7.5rem] flex-1 overflow-y-auto rounded-[1.35rem] border border-white/[0.07] xl:flex-none xl:overflow-hidden bg-black/10 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] sm:mt-3 sm:rounded-[1.6rem] sm:p-2.5">
        <div className="grid w-full gap-1.5 sm:grid-cols-2 sm:gap-2 xl:grid-cols-3">
          {filteredTopics.map((item) => {
            const selected = item.id === topicId;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setTopicId(item.id)}
                className={cn(
                  "group relative flex min-h-[6.25rem] flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 sm:min-h-[6.75rem] sm:p-4",
                  selected
                    ? "border-primary/35 bg-primary/[0.075] shadow-[0_0_24px_rgba(0,240,255,0.06)]"
                    : "border-transparent bg-white/[0.025] hover:border-white/[0.07] hover:bg-white/[0.045]",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-3 left-0 w-0.5 rounded-full transition-colors",
                    selected ? "bg-primary" : "bg-transparent",
                  )}
                />
                <span className="flex items-start justify-between gap-3">
                  <span className="font-mono text-[9px] text-muted-foreground/60">
                    0{DEBATE_TOPICS.indexOf(item) + 1}
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-all",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/10 text-transparent group-hover:border-white/20",
                    )}
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                </span>
                <span className="mt-2 block">
                  <span className="block font-display text-[13px] font-semibold leading-snug sm:text-sm">
                    {item.statement}
                  </span>
                  <span className="mt-1.5 hidden text-[11px] leading-4 text-muted-foreground sm:block">
                    {item.context}
                  </span>
                  <span className="mt-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                    {item.category}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 shrink-0 rounded-[1.25rem] border border-white/[0.07] bg-[#0b0d12]/90 p-2.5 shadow-[0_-16px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:mt-3 sm:p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_15.5rem_10rem_17rem] lg:items-center lg:gap-3">
        <div className="hidden min-w-0 rounded-xl bg-white/[0.025] px-3 py-2 sm:block sm:px-4 lg:bg-transparent lg:py-1">
          <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-[9px]">
            Selected motion
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold leading-snug sm:text-sm">
            {topic.statement}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:mt-2 sm:grid-cols-2 lg:mt-0 lg:contents">
          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1.5 sm:gap-1 sm:p-1"
            aria-label="Choose a stance"
          >
            {(
              [
                ["support", "Support", ThumbsUp],
                ["challenge", "Against", Shield],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={stance === value}
                onClick={() => setStance(value)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-200 sm:gap-1",
                  stance === value
                    ? value === "support"
                      ? "bg-secondary/15 text-secondary shadow-[inset_0_0_0_1px_rgba(56,232,198,0.12)]"
                      : "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(255,215,0,0.12)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1.5 sm:gap-1 sm:p-1"
            aria-label="Choose debate duration"
          >
            {([60, 120] as const).map((seconds) => (
              <button
                key={seconds}
                type="button"
                aria-pressed={duration === seconds}
                onClick={() => setDuration(seconds)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 rounded-lg font-mono text-xs font-semibold transition-all duration-200 sm:gap-1",
                  duration === seconds
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(0,240,255,0.12)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Clock3 className="size-3" />
                {seconds === 60 ? "1 min" : "2 min"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-[2.75rem_1fr] gap-2 lg:mt-0">
          <Button
            variant="ghost"
            size="lg"
            onClick={onBack}
            aria-label="Back to identity"
            className="h-11 rounded-full border border-white/[0.06] px-0 hover:border-white/10 sm:h-12"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Button
            size="lg"
            onClick={() => onComplete({ topicId, stance, duration })}
            className="h-11 rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary px-4 font-semibold text-primary-foreground shadow-[0_0_22px_rgba(0,240,255,0.16)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,240,255,0.28)] sm:h-12"
          >
            <span className="truncate">Check camera & mic</span>
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
