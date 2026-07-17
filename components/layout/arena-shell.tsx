"use client";

import {
  Check,
  Crosshair,
  Radio,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { RulesDialog } from "@/components/rules/rules-dialog";
import type { AppStage, GuestProfile } from "@/features/debate/types/debate.types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "profile", label: "Identity", icon: UserRound },
  { id: "round", label: "Motion", icon: Crosshair },
  { id: "device", label: "Signal", icon: Video },
  { id: "match", label: "Match", icon: Radio },
] as const;

const stepOrder: AppStage[] = [
  "profile",
  "round",
  "device",
  "match",
  "room",
  "results",
];

export function ArenaShell({
  stage,
  profile,
  children,
}: {
  stage: AppStage;
  profile: GuestProfile | null;
  children: React.ReactNode;
}) {
  const currentIndex = stepOrder.indexOf(stage);
  const showSteps = currentIndex >= 0 && currentIndex < STEPS.length;
  const currentStep = showSteps ? STEPS[currentIndex] : null;

  return (
    <div className="min-h-dvh min-w-0 overflow-x-hidden text-foreground">
      <header className="sticky top-0 z-40 box-border h-14 border-b border-white/[0.08] bg-[#06080c]/94 shadow-[0_10px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl lg:h-16">
        <div className="relative mx-auto grid h-full w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Wordmark className="min-w-0" />

          {showSteps && currentStep ? (
            <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2.5 md:flex">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                Setup
              </span>
              <span className="h-4 w-px bg-white/10" />
              <span className="text-sm font-medium text-foreground/85">
                {currentStep.label}
              </span>
              <span className="font-mono text-[11px] font-normal text-muted-foreground/55">
                0{currentIndex + 1}/0{STEPS.length}
              </span>
            </div>
          ) : null}

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            {showSteps && currentStep ? (
              <div
                className="flex items-center gap-2 md:hidden"
                aria-label={`Step ${currentIndex + 1} of ${STEPS.length}: ${currentStep.label}`}
              >
                <span className="font-mono text-[11px] font-medium text-muted-foreground/75">
                  0{currentIndex + 1}/0{STEPS.length}
                </span>
                <span className="flex items-center gap-1" aria-hidden="true">
                  {STEPS.map((step, index) => (
                    <span
                      key={step.id}
                      className={cn(
                        "h-1 w-1 rounded-full bg-white/15 transition-all duration-300",
                        index < currentIndex && "bg-secondary/70",
                        index === currentIndex && "w-3 bg-primary",
                      )}
                    />
                  ))}
                </span>
              </div>
            ) : null}

            <RulesDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.015] px-3 text-muted-foreground transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground lg:h-10 lg:px-4"
                  aria-label="Read debate rules"
                >
                  <ShieldCheck className="size-4" />
                  <span className="hidden text-[13px] font-normal sm:inline">
                    Rules
                  </span>
                </button>
              }
            />

            {profile ? (
              <span className="hidden min-w-0 items-center gap-3 border-l border-white/[0.08] pl-4 md:flex">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary/10 text-xs font-medium text-secondary ring-1 ring-secondary/25">
                  {profile.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate text-[13px] font-normal text-muted-foreground xl:inline">
                  {profile.displayName}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {showSteps ? (
        <aside className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 2xl:block 2xl:left-8">
          <nav aria-label="Round setup progress">
            <ol className="flex flex-col">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = index === currentIndex;
                const complete = index < currentIndex;

                return (
                  <li
                    key={step.id}
                    aria-current={active ? "step" : undefined}
                    className="relative flex min-h-18 items-center gap-3.5"
                  >
                    {index < STEPS.length - 1 ? (
                      <span
                        className={cn(
                          "absolute left-[1.0625rem] top-11 h-7 w-px",
                          complete ? "bg-secondary/35" : "bg-white/[0.08]",
                        )}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative grid size-9 shrink-0 place-items-center rounded-full border bg-background/90 transition-all",
                        active &&
                          "border-primary/55 text-primary shadow-[0_0_20px_rgba(0,240,255,0.15)]",
                        complete && "border-secondary/35 text-secondary",
                        !active && !complete &&
                          "border-white/[0.09] text-muted-foreground/50",
                      )}
                    >
                      {complete ? (
                        <Check className="size-4" strokeWidth={2.5} />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </span>
                    <span className="min-w-24">
                      <span
                        className={cn(
                          "block text-sm font-medium transition-colors",
                          active && "text-foreground",
                          complete && "text-secondary/85",
                          !active && !complete && "text-muted-foreground/55",
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-muted-foreground/55">
                        {active ? "Current" : `Step 0${index + 1}`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>
      ) : null}

      <main
        className={cn(
          "min-w-0",
          showSteps &&
            "min-h-[calc(100svh-3.5rem)] lg:min-h-[calc(100svh-4rem)]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
