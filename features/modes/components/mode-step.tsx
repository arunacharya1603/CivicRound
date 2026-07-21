"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Clock3,
  History,
  Link2,
  ShieldCheck,
  Swords,
  Trophy,
  UserRoundCheck,
} from "lucide-react";

import type {
  MatchHistoryEntry,
  MatchMode,
  MemberProfile,
} from "@/features/debate/types/debate.types";
import { MODE_RULES } from "@/features/modes/data/mode-rules";
import { cn } from "@/lib/utils";

const MODE_ICONS = {
  casual: Swords,
  ranked: Trophy,
  challenge: Link2,
  practice: Bot,
} as const;

const MODE_ORDER: MatchMode[] = [
  "ranked",
  "casual",
  "challenge",
  "practice",
];

const MODE_LAYOUT: Record<MatchMode, string> = {
  ranked: "lg:col-span-7",
  casual: "lg:col-span-5",
  challenge: "lg:col-span-6",
  practice: "lg:col-span-6",
};

export function ModeStep({
  member,
  history,
  onSelect,
}: {
  member: MemberProfile | null;
  history: MatchHistoryEntry[];
  onSelect: (mode: MatchMode) => void;
}) {
  return (
    <section className="screen-enter mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-10 lg:pb-16">
      <header
        id="arena-format"
        className="relative flex min-h-[calc(100svh-4rem)] scroll-mt-20 flex-col items-center justify-center border-b border-white/[0.08] py-16 text-center lg:min-h-[620px] lg:py-20"
      >
        <span className="inline-flex items-center gap-3 rounded-full border border-white/[0.11] bg-white/[0.045] py-1.5 pl-4 pr-1.5 text-[12px] font-medium text-[#d7d3dd]">
          Four modes. One competitive arena.
          <span className="grid size-7 place-items-center rounded-full bg-white/[0.08] text-white">
            <ArrowDown className="size-3.5" strokeWidth={1.8} />
          </span>
        </span>

        <h1 className="mt-8 max-w-[1080px] font-display text-[clamp(3.2rem,9vw,8.2rem)] font-bold uppercase leading-[0.82] tracking-[-0.055em] text-white">
          Choose how
          <br />
          you fight
        </h1>

        <p className="mt-7 max-w-[670px] text-[15px] leading-6 text-[#aaa6b2] sm:text-[17px]">
          Timed 1v1 debate. Clear turn order. AI scorecards. Pick the level of
          competition and enter with the rules understood.
        </p>

        <a
          href="#fight-modes"
          className="mt-8 inline-flex h-14 min-w-56 items-center justify-center gap-3 rounded-xl bg-primary px-7 text-[15px] font-semibold text-white shadow-[0_16px_44px_rgba(128,102,255,0.28)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-[#8d75ff] hover:shadow-[0_20px_54px_rgba(128,102,255,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-[#060608] motion-reduce:transform-none"
        >
          Explore fight modes
          <ArrowDown className="size-4" strokeWidth={2} />
        </a>

        <div className="mt-12 flex flex-nowrap items-center justify-center gap-x-3 font-mono text-[7px] font-semibold uppercase tracking-[0.17em] text-[#7f7a89] sm:gap-x-8 sm:text-[9px] sm:tracking-[0.22em] lg:absolute lg:inset-x-0 lg:bottom-8 lg:mt-0">
          <span>Equal time</span>
          <span className="text-primary" aria-hidden="true">
            ·
          </span>
          <span>Enforced turns</span>
          <span className="text-primary" aria-hidden="true">
            ·
          </span>
          <span>One verdict</span>
        </div>
      </header>

      <div id="fight-modes" className="scroll-mt-20 py-12 sm:py-16 lg:py-20">
        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Select your format
            </p>
            <h2 className="mt-3 font-display text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
              Every fight has stakes.
              <br />
              You decide which ones.
            </h2>
          </div>
          <p className="max-w-[420px] text-sm leading-6 text-[#918c9a] lg:justify-self-end lg:border-l lg:border-primary/50 lg:pl-5">
            The speaking format stays fair in every mode. Identity,
            matchmaking, rating impact and opponent type change before you
            enter the room.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {MODE_ORDER.map((mode, index) => {
            const rules = MODE_RULES[mode];
            const Icon = MODE_ICONS[mode];
            const competitive = mode === "ranked";

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onSelect(mode)}
                aria-label={`Choose ${rules.name}`}
                className={cn(
                  "group relative flex min-h-[330px] flex-col overflow-hidden rounded-[1.6rem] border p-6 text-left transition-[transform,border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-[#060608] sm:p-8 lg:min-h-[350px]",
                  MODE_LAYOUT[mode],
                  competitive
                    ? "border-primary/35 bg-[#151221] shadow-[0_26px_80px_rgba(60,39,130,0.2)] hover:border-primary/60 hover:bg-[#191527] hover:shadow-[0_30px_90px_rgba(78,55,164,0.28)]"
                    : "border-white/[0.09] bg-[#0e0e13] hover:border-white/[0.18] hover:bg-[#121218]",
                  "hover:-translate-y-1 motion-reduce:transform-none",
                )}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-5 top-1 font-display text-[88px] font-bold leading-none tracking-[-0.08em] text-white/[0.035] sm:right-8 sm:text-[108px]"
                >
                  0{index + 1}
                </span>

                <div className="relative flex items-start justify-between gap-5">
                  <span
                    className={cn(
                      "grid size-12 place-items-center rounded-xl border",
                      competitive
                        ? "border-primary bg-primary text-white shadow-[0_12px_34px_rgba(128,102,255,0.32)]"
                        : "border-white/[0.1] bg-white/[0.045] text-[#c8bcff]",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.7} />
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.13em]",
                      competitive
                        ? "border-primary/45 bg-primary/[0.09] text-[#c9beff]"
                        : "border-white/[0.09] bg-black/20 text-[#898491]",
                    )}
                  >
                    {rules.ratingLabel}
                  </span>
                </div>

                <div className="relative mt-9">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#807b89]">
                    {rules.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-[clamp(2.15rem,4vw,3.55rem)] font-semibold leading-none tracking-[-0.055em] text-white">
                    {rules.name}
                  </h3>
                  <p className="mt-4 max-w-xl text-[13px] leading-6 text-[#9b96a3] sm:text-sm">
                    {rules.description}
                  </p>
                </div>

                <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
                  {rules.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-2 text-[11px] font-medium text-[#c4c0ca]"
                    >
                      <span className="size-1 rounded-full bg-primary" />
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="relative mt-auto flex items-end justify-between gap-5 pt-8">
                  <span className="text-[12px] font-semibold text-white transition-colors group-hover:text-[#d7d0ff]">
                    Enter {rules.name.toLowerCase()}
                  </span>
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-xl border transition-[background-color,border-color,transform] group-hover:translate-x-0.5",
                      competitive
                        ? "border-primary bg-primary text-white"
                        : "border-white/[0.11] bg-white/[0.045] text-white group-hover:border-primary/50 group-hover:bg-primary group-hover:text-white",
                    )}
                  >
                    <ArrowRight className="size-4" strokeWidth={1.9} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 border-t border-white/[0.08] pt-12 lg:grid-cols-[0.9fr_1.1fr]">
        <section
          id="competitive-profile"
          className="rounded-[1.35rem] border border-white/[0.08] bg-[#0d0d12] p-6 sm:p-7"
          aria-labelledby="competitive-profile-title"
        >
          <div className="flex items-center gap-2.5">
            <UserRoundCheck className="size-4 text-primary" strokeWidth={1.7} />
            <p
              id="competitive-profile-title"
              className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8d8896]"
            >
              Competitive identity
            </p>
          </div>

          {member ? (
            <div className="mt-6 flex items-center justify-between gap-5 border-t border-white/[0.08] pt-6">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">
                  {member.displayName}
                </p>
                <p className="mt-1.5 font-mono text-[9px] text-[#817c8a]">
                  @{member.handle} / {member.matchesPlayed} recorded fights
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-4xl font-semibold tracking-[-0.05em] text-primary">
                  {member.rating}
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#817c8a]">
                  Current rating
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 border-t border-white/[0.08] pt-6">
              <p className="max-w-lg text-sm leading-6 text-[#96919e]">
                Start as a guest in Casual, Challenge, or AI Practice. Ranked
                creates a persistent competitor profile before matchmaking.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[8px] font-semibold uppercase tracking-[0.13em] text-[#77727f]">
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="size-3.5 text-primary" />
                  Timed turns
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Rules enforced
                </span>
              </div>
            </div>
          )}
        </section>

        <section
          id="recent-fights"
          className="scroll-mt-20 rounded-[1.35rem] border border-white/[0.08] bg-[#0d0d12] p-6 sm:p-7"
          aria-labelledby="recent-fights-title"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <History className="size-4 text-primary" strokeWidth={1.7} />
              <p
                id="recent-fights-title"
                className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8d8896]"
              >
                Recent fights
              </p>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#6f6a77]">
              This device
            </span>
          </div>

          {history.length ? (
            <div className="mt-5 border-t border-white/[0.08]">
              {history.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/[0.07] py-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#e8e5eb]">
                      {entry.topic}
                    </p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#7e7987]">
                      {MODE_RULES[entry.mode].name} / {entry.opponentName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold",
                      entry.ratingDelta > 0 && "text-emerald-400",
                      entry.ratingDelta < 0 && "text-destructive",
                      entry.ratingDelta === 0 && "text-[#817c8a]",
                    )}
                  >
                    {entry.isRated
                      ? `${entry.ratingDelta > 0 ? "+" : ""}${entry.ratingDelta}`
                      : "UNRATED"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 border-t border-white/[0.08] pt-6">
              <p className="text-sm font-semibold text-white">
                Your fight record starts here.
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[#85808d]">
                Completed scorecards and rated results will appear after your
                first round.
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6 text-[11px] text-[#77727f]">
        <span className="font-mono uppercase tracking-[0.14em]">
          Argue the case. Earn the result.
        </span>
        <Link
          href="/"
          className="transition-colors hover:text-white"
        >
          CivicRound home
        </Link>
      </footer>
    </section>
  );
}
