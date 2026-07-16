"use client";

import Link from "next/link";
import {
  Check,
  Crosshair,
  Radio,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
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
  const showSteps = currentIndex < STEPS.length;

  return (
    <div className="arena-grid min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Wordmark />

          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <span className="live-dot size-1.5 rounded-full bg-secondary" />
              Arena online
            </div>
            <Link
              href="/rules"
              className="inline-flex size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-auto sm:gap-2 sm:px-3"
              aria-label="Read debate rules"
            >
              <ShieldCheck className="size-4" />
              <span className="hidden text-xs font-semibold sm:inline">Rules</span>
            </Link>
            <span className="grid h-8 min-w-8 place-items-center rounded-sm border border-border px-2 font-mono text-[10px] font-semibold">
              18+
            </span>
            {profile ? (
              <span className="hidden max-w-36 truncate border-l border-border pl-4 text-xs font-semibold lg:inline">
                {profile.displayName}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {showSteps ? (
        <nav
          className="border-b border-border bg-card/35"
          aria-label="Round setup progress"
        >
          <ol className="mx-auto grid max-w-[1280px] grid-cols-4 px-4 sm:px-6 lg:px-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const active = index === currentIndex;
              const complete = index < currentIndex;

              return (
                <li
                  key={step.id}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative flex h-14 min-w-0 items-center justify-center gap-2 border-b-2 px-1 text-muted-foreground transition-colors sm:h-16 sm:justify-start sm:gap-3 sm:px-3",
                    active && "border-primary text-foreground",
                    complete && "border-secondary text-foreground",
                    !active && !complete && "border-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                      active && "border-primary bg-primary text-primary-foreground",
                      complete && "border-secondary bg-secondary text-secondary-foreground",
                      !active && !complete && "border-border bg-background",
                    )}
                  >
                    {complete ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-semibold sm:text-xs">
                      {step.label}
                    </span>
                    <span className="hidden font-mono text-[9px] text-muted-foreground sm:block">
                      0{index + 1}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <main
        className={cn(
          "min-w-0",
          showSteps &&
            "mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12",
        )}
      >
        {children}
      </main>
    </div>
  );
}
