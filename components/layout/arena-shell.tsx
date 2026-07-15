"use client";

import Link from "next/link";
import {
  Crosshair,
  Radio,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import type { AppStage, GuestProfile } from "@/features/debate/types/debate.types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "profile", label: "Identity", icon: UserRound },
  { id: "round", label: "Round", icon: Crosshair },
  { id: "device", label: "Camera", icon: Video },
  { id: "match", label: "Match", icon: Radio },
] as const;

const stepOrder: AppStage[] = ["profile", "round", "device", "match", "room", "results"];

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
  const showSteps = currentIndex < 4;

  return (
    <div className="arena-grid min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Wordmark />
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground md:flex">
              <span className="live-dot size-1.5 rounded-full bg-secondary" />
              Arena online
            </div>
            <Link
              href="/rules"
              className="inline-flex h-9 items-center gap-2 rounded-sm px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ShieldCheck className="size-4" />
              <span className="hidden sm:inline">Rules</span>
            </Link>
            <Badge variant="outline" className="rounded-sm font-mono">18+</Badge>
            {profile ? (
              <span className="hidden border-l border-border pl-4 text-sm font-semibold sm:inline">
                {profile.displayName}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {showSteps ? (
        <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full min-w-0 max-w-[1440px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-border bg-card/60 lg:border-b-0 lg:border-r">
            <div className="grid w-full max-w-full grid-cols-4 px-2 py-3 lg:sticky lg:top-16 lg:grid-cols-1 lg:gap-1 lg:px-5 lg:py-8">
              <p className="mb-3 hidden font-mono text-[9px] uppercase text-muted-foreground lg:block">
                Readiness
              </p>
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = step.id === stage;
                const complete = index < currentIndex;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex min-w-0 items-center justify-center gap-1 border-l px-1 py-2.5 text-[10px] font-semibold transition-colors sm:gap-2 sm:px-2 sm:text-xs lg:justify-start lg:gap-3 lg:px-3",
                      active && "border-primary bg-muted text-foreground",
                      complete && "border-secondary text-secondary",
                      !active && !complete && "border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{step.label}</span>
                    <span className="ml-auto hidden font-mono text-[9px] sm:inline">0{index + 1}</span>
                  </div>
                );
              })}
            </div>
          </aside>
          <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
