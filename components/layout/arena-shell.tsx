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
import type {
  AppStage,
  ParticipantProfile,
} from "@/features/debate/types/debate.types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "modes", label: "Mode", icon: Crosshair },
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "round", label: "Motion", icon: Crosshair },
  { id: "device", label: "Signal", icon: Video },
  { id: "match", label: "Match", icon: Radio },
] as const;

function getStepIndex(stage: AppStage) {
  if (stage === "modes") return 0;
  if (stage === "profile" || stage === "account") return 1;
  if (stage === "round") return 2;
  if (stage === "device") return 3;
  if (stage === "match") return 4;
  return 5;
}

export function ArenaShell({
  stage,
  profile,
  children,
}: {
  stage: AppStage;
  profile: ParticipantProfile | null;
  children: React.ReactNode;
}) {
  const currentIndex = getStepIndex(stage);
  const showSteps = currentIndex > 0 && currentIndex < STEPS.length;
  const isLandingStage = stage === "profile";
  const isEntryStage = stage === "modes" || isLandingStage;

  return (
    <div
      className={cn(
        "min-h-dvh min-w-0 overflow-x-hidden text-foreground",
        isEntryStage && "bg-[#060608] text-[#f6f4fb]",
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-40 box-border border-b",
          isEntryStage
            ? "h-16 border-white/[0.07] bg-[#060608]/92 shadow-none backdrop-blur-xl lg:h-[4.75rem]"
            : "h-14 border-white/[0.08] bg-[#0b0b10]/94 shadow-[0_10px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl lg:h-16",
        )}
      >
        <div
          className={cn(
            "relative mx-auto grid h-full w-full items-center gap-4 px-4 sm:px-6 lg:px-10",
            isEntryStage
              ? "max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[1fr_auto_1fr]"
              : "max-w-[1600px] grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          <Wordmark
            className="min-w-0"
            tone={isEntryStage ? "violet" : "default"}
            showBeta={!isEntryStage}
          />

          {stage === "modes" ? (
            <nav
              aria-label="Arena sections"
              className="hidden items-center gap-9 text-[13px] font-medium text-[#9d99a8] lg:flex"
            >
              <a className="transition-colors hover:text-white" href="#fight-modes">
                Modes
              </a>
              <a className="transition-colors hover:text-white" href="#arena-format">
                Format
              </a>
              <a className="transition-colors hover:text-white" href="#recent-fights">
                Record
              </a>
            </nav>
          ) : isEntryStage ? (
            <span className="hidden lg:block" aria-hidden="true" />
          ) : null}

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 lg:justify-self-end">
            <RulesDialog
              trigger={
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center justify-center gap-2 px-2 text-[13px] font-medium transition-colors",
                    isEntryStage
                      ? "rounded-lg border border-white/[0.09] bg-white/[0.035] px-3.5 text-[#c5c1cd] hover:border-primary/35 hover:bg-primary/[0.08] hover:text-white"
                      : "rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-muted-foreground hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground lg:px-4",
                  )}
                  aria-label="Read debate rules"
                >
                  <ShieldCheck className="size-4" />
                  <span className={cn(!isEntryStage && "hidden sm:inline")}>
                    Rules
                  </span>
                </button>
              }
            />

            {profile ? (
              <span
                className={cn(
                  "hidden min-w-0 items-center gap-3 border-l pl-4 md:flex",
                  isEntryStage
                    ? "border-[#302e3a]"
                    : "border-white/[0.08]",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium",
                    isEntryStage
                      ? "bg-[#8367ff] text-white"
                      : "bg-secondary/10 text-secondary ring-1 ring-secondary/25",
                  )}
                >
                  {profile.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span
                  className={cn(
                    "hidden max-w-32 truncate text-[13px] font-normal xl:inline",
                    isEntryStage
                      ? "text-[#aaa6b5]"
                      : "text-muted-foreground",
                  )}
                >
                  {profile.displayName}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {showSteps && !isLandingStage ? (
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
                          "border-primary/55 text-primary shadow-[0_0_20px_rgba(128,102,255,0.15)]",
                        complete && "border-secondary/35 text-secondary",
                        !active &&
                          !complete &&
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
                          !active &&
                            !complete &&
                            "text-muted-foreground/55",
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
          isEntryStage
            ? "min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.75rem)]"
            : showSteps &&
                "min-h-[calc(100svh-3.5rem)] lg:min-h-[calc(100svh-4rem)]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
