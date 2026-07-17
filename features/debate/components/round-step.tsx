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
  DebateTopic,
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

  const continueToDevices = () =>
    onComplete({ topicId, stance, duration });

  return (
    <section className="screen-enter mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-[1200px] flex-col overflow-hidden px-4 py-3 sm:block sm:h-auto sm:min-h-[calc(100svh-3.5rem)] sm:overflow-visible sm:px-6 sm:py-6 lg:min-h-[calc(100svh-4rem)] lg:px-8 lg:py-7">
      <header className="flex shrink-0 items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-primary">
            Round setup
          </p>
          <h1 className="mt-1.5 font-display text-[1.75rem] font-semibold tracking-[-0.035em] sm:text-[2rem] lg:text-[2.25rem]">
            Choose your motion
          </h1>
          <p className="mt-1.5 max-w-xl text-sm font-normal leading-6 text-muted-foreground sm:text-[15px]">
            Pick a motion, then choose your position and speaking time.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="hidden h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.015] px-4 text-sm font-normal text-muted-foreground transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-foreground lg:inline-flex"
        >
          <ArrowLeft className="size-4" />
          Identity
        </button>
      </header>

      <div className="no-scrollbar mt-3 grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain pb-2 sm:mt-6 sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
        {DEBATE_TOPICS.map((item, index) => (
          <MotionCard
            key={item.id}
            topic={item}
            index={index}
            selected={item.id === topicId}
            onSelect={() => setTopicId(item.id)}
          />
        ))}
      </div>

      <section className="mt-2 shrink-0 rounded-[1.35rem] border border-white/[0.08] bg-[#0a0d12]/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:mt-4 sm:p-4 sm:shadow-[0_20px_55px_rgba(0,0,0,0.22)] lg:grid lg:grid-cols-[minmax(11rem,1fr)_minmax(18rem,1.1fr)_12rem_15rem] lg:items-end lg:gap-4">
        <div className="hidden min-w-0 sm:block">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-primary">
            Selected
          </p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {topic.statement}
          </p>
        </div>

        <div className="sm:mt-3 lg:mt-0">
          <p className="mb-2 text-xs font-medium text-foreground">
            Your position
          </p>
          <StanceSelector stance={stance} onChange={setStance} />
        </div>

        <div className="mt-3 sm:mt-0">
          <p className="mb-2 text-xs font-medium text-foreground">
            Speaking time
          </p>
          <DurationSelector
            duration={duration}
            onChange={setDuration}
          />
        </div>

        <div className="mt-3 flex gap-2 lg:mt-0">
          <Button
            variant="ghost"
            size="lg"
            onClick={onBack}
            aria-label="Back to identity"
            className="h-12 w-12 shrink-0 rounded-full border border-white/[0.08] px-0 hover:border-white/[0.14] hover:bg-white/[0.04] lg:hidden"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <Button
            size="lg"
            onClick={continueToDevices}
            className="h-12 min-w-0 flex-1 rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary px-5 text-sm font-medium text-primary-foreground shadow-[0_0_24px_rgba(0,240,255,0.16)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_32px_rgba(0,240,255,0.26)]"
          >
            <span className="truncate">Check camera & mic</span>
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </section>
    </section>
  );
}

function MotionCard({
  topic,
  index,
  selected,
  onSelect,
}: {
  topic: DebateTopic;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-[7rem] flex-col rounded-2xl border p-4 text-left transition-all sm:min-h-[8rem] sm:p-5",
        selected
          ? "border-primary/35 bg-primary/[0.065] shadow-[0_14px_36px_rgba(0,240,255,0.045)]"
          : "border-white/[0.075] bg-[#090c11]/72 hover:border-white/[0.14] hover:bg-white/[0.025]",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-4 left-0 w-0.5 rounded-r-full transition-colors",
          selected ? "bg-primary" : "bg-transparent",
        )}
      />

      <span className="flex items-center justify-between gap-4">
        <span
          className={cn(
            "font-mono text-[11px] font-medium uppercase tracking-[0.1em]",
            selected ? "text-primary" : "text-muted-foreground/65",
          )}
        >
          {String(index + 1).padStart(2, "0")} / {topic.category}
        </span>

        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white/[0.1] text-transparent group-hover:border-white/20",
          )}
        >
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
      </span>

      <span className="mt-3 line-clamp-2 text-[15px] font-medium leading-[1.35] text-foreground">
        {topic.statement}
      </span>
      <span className="mt-auto line-clamp-1 pt-2 text-xs font-normal leading-5 text-muted-foreground">
        {topic.context}
      </span>
    </button>
  );
}

function StanceSelector({
  stance,
  onChange,
}: {
  stance: DebateStance;
  onChange: (stance: DebateStance) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-1"
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
          onClick={() => onChange(value)}
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200",
            stance === value
              ? value === "support"
                ? "bg-secondary/14 text-secondary shadow-[inset_0_0_0_1px_rgba(56,232,198,0.16)]"
                : "bg-accent/14 text-accent shadow-[inset_0_0_0_1px_rgba(255,215,0,0.16)]"
              : "text-muted-foreground hover:bg-white/[0.025] hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function DurationSelector({
  duration,
  onChange,
}: {
  duration: DebateDuration;
  onChange: (duration: DebateDuration) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-1"
      aria-label="Choose debate duration"
    >
      {([60, 120] as const).map((seconds) => (
        <button
          key={seconds}
          type="button"
          aria-pressed={duration === seconds}
          onClick={() => onChange(seconds)}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-lg font-mono text-sm font-medium transition-all duration-200",
            duration === seconds
              ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(0,240,255,0.16)]"
              : "text-muted-foreground hover:bg-white/[0.025] hover:text-foreground",
          )}
        >
          <Clock3 className="size-3.5" />
          {seconds === 60 ? "1 min" : "2 min"}
        </button>
      ))}
    </div>
  );
}
