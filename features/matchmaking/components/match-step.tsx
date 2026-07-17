"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Copy,
  Link2,
  Radar,
  Swords,
  UsersRound,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDebateTopic } from "@/features/debate/data/topics";
import type {
  DebateSession,
  DebateSetup,
  GuestProfile,
} from "@/features/debate/types/debate.types";
import {
  cancelDebateInvite,
  cancelMatchmaking,
  createDebateInvite,
  findDebateMatch,
  waitForInviteMatch,
} from "@/features/matchmaking/services/matchmaking.service";
import { cn } from "@/lib/utils";

export function MatchStep({
  profile,
  setup,
  onBack,
  onMatched,
}: {
  profile: GuestProfile;
  setup: DebateSetup;
  onBack: () => void;
  onMatched: (session: DebateSession) => void;
}) {
  const [match, setMatch] = useState<DebateSession | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const queueAbortRef = useRef<AbortController | null>(null);
  const inviteAbortRef = useRef<AbortController | null>(null);
  const inviteCodeRef = useRef<string | null>(null);
  const topic = getDebateTopic(setup.topicId);

  const matchmaking = useMutation({
    mutationFn: () => {
      queueAbortRef.current?.abort();
      queueAbortRef.current = new AbortController();
      return findDebateMatch(profile, setup, queueAbortRef.current.signal);
    },
    onSuccess: setMatch,
  });

  const inviteWaiting = useMutation({
    mutationFn: (inviteCode: string) => {
      inviteAbortRef.current?.abort();
      inviteAbortRef.current = new AbortController();
      return waitForInviteMatch(inviteCode, inviteAbortRef.current.signal);
    },
    onSuccess: setMatch,
  });

  const inviteCreation = useMutation({
    mutationFn: () => createDebateInvite(setup),
    onSuccess: async ({ code, url }) => {
      inviteCodeRef.current = code;
      setInviteUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        setCopied(false);
      }
      inviteWaiting.mutate(code);
    },
  });

  useEffect(() => {
    return () => {
      queueAbortRef.current?.abort();
      inviteAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!match) return;
    playMatchChime();
    let intervalId: number;
    if (document.hidden) {
      const originalTitle = document.title;
      let toggle = false;
      intervalId = window.setInterval(() => {
        document.title = toggle ? "Match found | CivicRound" : originalTitle;
        toggle = !toggle;
      }, 1000);
      const handleFocus = () => {
        window.clearInterval(intervalId);
        document.title = originalTitle;
        window.removeEventListener("focus", handleFocus);
      };
      window.addEventListener("focus", handleFocus);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [match]);

  const isSearching = matchmaking.isPending || inviteWaiting.isPending;
  const error = matchmaking.error ?? inviteCreation.error ?? inviteWaiting.error;

  const leaveMatchmaking = () => {
    queueAbortRef.current?.abort();
    inviteAbortRef.current?.abort();
    void cancelMatchmaking().catch(() => undefined);
    if (inviteCodeRef.current) {
      void cancelDebateInvite(inviteCodeRef.current).catch(() => undefined);
    }
    onBack();
  };

  return (
    <section className="screen-enter relative isolate flex min-h-[calc(100svh-3rem)] items-center justify-center overflow-hidden px-3 py-4 sm:px-6 sm:py-6 lg:min-h-[calc(100svh-3.5rem)] lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(circle_at_50%_46%,rgba(0,240,255,0.045),transparent_30%),radial-gradient(circle_at_18%_88%,rgba(56,232,198,0.025),transparent_24%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[48%] -z-20 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.025] sm:size-[48rem]" />

      <div className="w-full max-w-[64rem]">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-[9px]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                match
                  ? "bg-secondary"
                  : isSearching
                    ? "live-dot bg-primary"
                    : "bg-white/30",
              )}
            />
            {match
              ? "Match confirmed"
              : isSearching
                ? "Searching public queue"
                : setup.inviteCode
                  ? "Private matchmaking"
                  : "Public matchmaking"}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-none tracking-[-0.045em] sm:mt-4 sm:text-4xl lg:text-5xl">
            {match
              ? "Opponent found"
              : isSearching
                ? "Searching the arena"
                : "Find your opponent"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-muted-foreground sm:mt-3 sm:text-sm sm:leading-6">
            {match
              ? "Both positions are locked. Your live room is ready."
              : isSearching
                ? "We are looking for a debater ready to defend the other side."
                : "We will pair you with someone taking the opposite position."}
          </p>
        </header>

        <div className="mx-auto mt-4 grid max-w-3xl gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:mt-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-0 sm:rounded-full sm:p-1.5">
          <div className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left sm:rounded-full sm:px-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
              <Swords className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/50">
                Motion
              </p>
              <p className="truncate text-[10px] font-semibold text-foreground sm:text-[11px]">
                {topic.statement}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-white/[0.08] border-t border-white/[0.07] sm:border-l sm:border-t-0">
            <div className="min-w-[5.5rem] px-3 py-1.5 text-center">
              <p className="font-mono text-[7px] uppercase tracking-[0.15em] text-muted-foreground/45">
                Your side
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[10px] font-semibold",
                  setup.stance === "support" ? "text-secondary" : "text-accent",
                )}
              >
                {setup.stance === "support" ? "Support" : "Against"}
              </p>
            </div>
            <div className="min-w-[4.5rem] px-3 py-1.5 text-center">
              <p className="font-mono text-[7px] uppercase tracking-[0.15em] text-muted-foreground/45">
                Round
              </p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-foreground">
                <Clock3 className="size-3 text-primary" />
                {setup.duration / 60} min
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-4 max-w-[58rem] overflow-hidden border-y border-white/[0.07] py-5 sm:mt-6 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(56,232,198,0.055),transparent_23%),radial-gradient(circle_at_75%_50%,rgba(0,240,255,0.035),transparent_23%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[23rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.035]" />

          <div className="relative grid grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:gap-3">
            <Avatar
              name={profile.displayName}
              stance={setup.stance}
              label="You"
              ready
            />

            <div className="relative flex min-h-36 flex-col items-center justify-center sm:min-h-48">
              <span className="absolute left-[-1.75rem] right-[-1.75rem] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent sm:left-[-3rem] sm:right-[-3rem]" />
              <span className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-2xl" />
              <span className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-[#0d1116] font-display text-[9px] font-bold tracking-[0.16em] text-foreground shadow-[0_12px_34px_rgba(0,0,0,0.38)] sm:size-12 sm:text-[10px]">
                VS
                <span className="absolute inset-1 rounded-full border border-primary/10" />
              </span>
              <span className="relative mt-3 hidden rounded-full border border-white/[0.06] bg-black/20 px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-muted-foreground/55 sm:inline">
                Opposite sides
              </span>
            </div>

            {match ? (
              <Avatar
                name={match.opponentName}
                stance={match.opponentStance}
                label="Opponent"
                ready
              />
            ) : (
              <div className="flex min-w-0 flex-col items-center gap-2.5 sm:gap-3">
                <div className="relative grid size-24 place-items-center sm:size-36">
                  {isSearching ? (
                    <SearchScanner />
                  ) : (
                    <>
                      <span className="absolute inset-0 rounded-full border border-dashed border-white/[0.14] bg-white/[0.018]" />
                      <span className="absolute inset-3 rounded-full border border-white/[0.045]" />
                      <UsersRound className="relative size-8 text-muted-foreground/50 sm:size-10" />
                    </>
                  )}
                </div>
                <div className="min-w-0 text-center">
                  <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
                    Opponent
                  </p>
                  {isSearching ? (
                    <SearchingLabel />
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm">
                      Waiting for match
                    </p>
                  )}
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-accent sm:text-[10px]">
                    {setup.stance === "support" ? "Against" : "Support"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="relative mt-4 flex items-center justify-center gap-2 text-center text-[9px] text-muted-foreground/65 sm:mt-5 sm:text-[10px]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                match
                  ? "bg-secondary"
                  : isSearching
                    ? "live-dot bg-primary"
                    : "bg-white/20",
              )}
            />
            {match
              ? "Both debaters are ready"
              : isSearching
                ? "Your place in the queue is secured"
                : "The other seat will defend the opposite position"}
          </div>
        </div>

        <div className="mx-auto mt-4 w-full max-w-xl sm:mt-5">
          {match ? (
            <Button
              size="lg"
              onClick={() => onMatched(match)}
              className="h-12 w-full rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary font-semibold text-primary-foreground shadow-[0_0_30px_rgba(0,240,255,0.2)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_40px_rgba(0,240,255,0.34)]"
            >
              <Zap className="mr-1 size-4" />
              Enter live room
              <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : isSearching ? (
            <Button
              size="lg"
              variant="ghost"
              onClick={leaveMatchmaking}
              className="h-12 w-full rounded-full border border-destructive/25 bg-destructive/[0.07] text-destructive hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive"
            >
              <span className="live-dot mr-1 size-2 rounded-full bg-destructive" />
              Stop matchmaking
            </Button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Button
                size="lg"
                onClick={() => matchmaking.mutate()}
                disabled={inviteCreation.isPending}
                className="h-12 rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary px-7 font-semibold text-primary-foreground shadow-[0_0_26px_rgba(0,240,255,0.18)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_34px_rgba(0,240,255,0.3)]"
              >
                <Swords className="mr-1 size-4" />
                {setup.inviteCode ? "Join private match" : "Find a match"}
              </Button>
              {!setup.inviteCode ? (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => inviteCreation.mutate()}
                  disabled={inviteCreation.isPending}
                  className="h-12 rounded-full border border-white/[0.07] px-6 text-muted-foreground hover:border-white/12 hover:bg-white/[0.04] hover:text-foreground"
                >
                  <Link2 className="mr-1 size-4" />
                  {inviteCreation.isPending ? "Creating..." : "Invite a friend"}
                </Button>
              ) : null}
            </div>
          )}

          {error && error.name !== "AbortError" ? (
            <p className="mt-3 text-center text-sm text-destructive" role="alert">
              {error.message || "Matchmaking unavailable. Try again."}
            </p>
          ) : null}

          {inviteUrl ? (
            <div className="mt-3 flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                {inviteUrl}
              </span>
              <button
                type="button"
                aria-label={copied ? "Invite link copied" : "Copy invite link"}
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 text-primary transition-colors hover:text-primary/80"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={leaveMatchmaking}
            className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.035] hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to signal check
          </button>
        </div>
      </div>
    </section>
  );
}

function SearchScanner() {
  return (
    <div className="match-scanner" aria-hidden="true">
      <span className="match-scanner-grid" />
      <span className="match-scanner-sweep" />
      <span className="match-scanner-core">
        <Radar className="size-5 sm:size-6" />
      </span>
      <span className="match-scanner-dot match-scanner-dot-one" />
      <span className="match-scanner-dot match-scanner-dot-two" />
    </div>
  );
}

function Avatar({
  name,
  stance,
  label,
  ready,
}: {
  name: string;
  stance: "support" | "challenge";
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-3">
      <div className="relative">
        <span
          className={cn(
            "absolute -inset-2 rounded-full border opacity-70 sm:-inset-3",
            stance === "support"
              ? "border-secondary/20"
              : "border-accent/20",
          )}
        />
        <div
          className={cn(
            "relative grid size-24 place-items-center rounded-full border font-display text-3xl font-bold shadow-[0_18px_55px_rgba(0,0,0,0.3)] sm:size-36 sm:text-4xl",
            stance === "support"
              ? "border-secondary/35 bg-[radial-gradient(circle_at_35%_30%,rgba(56,232,198,0.25),rgba(56,232,198,0.07)_55%,rgba(0,0,0,0.2))] text-secondary"
              : "border-accent/35 bg-[radial-gradient(circle_at_35%_30%,rgba(255,215,0,0.22),rgba(255,215,0,0.06)_55%,rgba(0,0,0,0.2))] text-accent",
          )}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        {ready ? (
          <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full border-2 border-background bg-secondary sm:bottom-2 sm:right-2 sm:size-6">
            <Check className="size-3 text-secondary-foreground" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 text-center">
        <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 sm:text-[9px]">
          {label}
        </p>
        <p className="mt-1 max-w-28 truncate text-xs font-semibold sm:max-w-40 sm:text-base">
          {name}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px]",
            stance === "support" ? "text-secondary" : "text-accent",
          )}
        >
          {stance === "support" ? "Support" : "Against"}
        </p>
      </div>
    </div>
  );
}

const SEARCH_MESSAGES = [
  "Scanning debaters",
  "Checking stances",
  "Holding queue",
] as const;

function SearchingLabel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setI((c) => (c + 1) % SEARCH_MESSAGES.length),
      1800
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="opponent-search-copy text-[11px] text-muted-foreground">
      {SEARCH_MESSAGES[i]}
    </span>
  );
}

function playMatchChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.45);
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.52);
    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 0.57);
  } catch (e) {
    console.warn("Failed to play matchmaking chime:", e);
  }
}
