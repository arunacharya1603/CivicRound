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
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_34%,rgba(0,240,255,0.045),transparent_28%),linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:auto,60px_60px,60px_60px]" />

      <div className="w-full max-w-[56rem] overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#090c11]/95 shadow-[0_32px_110px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-xl sm:rounded-[2rem]">
        <header className="border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[9px]">
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
                  ? "Queue in progress"
                  : setup.inviteCode
                    ? "Private queue"
                    : "Public queue"}
            </div>

            <button
              type="button"
              onClick={leaveMatchmaking}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.06] px-2.5 text-[9px] text-muted-foreground transition-colors hover:border-white/10 hover:bg-white/[0.035] hover:text-foreground sm:px-3 sm:text-[10px]"
            >
              <ArrowLeft className="size-3" />
              Signal check
            </button>
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            {match
              ? "Your opponent is ready"
              : isSearching
                ? "Finding the right opponent"
                : "Find your opponent"}
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-5 text-muted-foreground sm:text-sm">
            {match
              ? "Both sides are confirmed. Enter the room when you are ready."
              : isSearching
                ? "We are matching this motion with someone defending the other side."
                : "One motion, two positions, and a focused live debate."}
          </p>
        </header>

        <div className="border-b border-white/[0.07] bg-white/[0.018] sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
          <div className="flex min-w-0 items-center gap-3 px-5 py-3.5 sm:px-7 sm:py-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/15 bg-primary/[0.07] text-primary">
              <Swords className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[7px] font-semibold uppercase tracking-[0.17em] text-muted-foreground/50 sm:text-[8px]">
                Selected motion
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-foreground sm:text-xs">
                {topic.statement}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-white/[0.07] border-t border-white/[0.07] sm:border-l sm:border-t-0">
            <div className="min-w-[6.75rem] px-4 py-3 text-center sm:flex sm:flex-col sm:justify-center">
              <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-muted-foreground/45">
                Your position
              </p>
              <p
                className={cn(
                  "mt-1 text-[10px] font-semibold",
                  setup.stance === "support" ? "text-secondary" : "text-accent",
                )}
              >
                {setup.stance === "support" ? "Support" : "Against"}
              </p>
            </div>
            <div className="min-w-[5.5rem] px-4 py-3 text-center sm:flex sm:flex-col sm:justify-center">
              <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-muted-foreground/45">
                Duration
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-foreground">
                <Clock3 className="size-3 text-primary" />
                {setup.duration / 60} min
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-7 sm:py-6">
          <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-stretch gap-1.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] sm:gap-3">
            <div className="relative flex min-h-[13.5rem] min-w-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-secondary/15 bg-[radial-gradient(circle_at_50%_42%,rgba(56,232,198,0.09),transparent_58%)] p-3 sm:min-h-[15rem] sm:rounded-[1.5rem] sm:p-5">
              <span className="absolute left-3 top-3 font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/45">
                Your seat
              </span>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[8px] font-medium text-secondary">
                <Check className="size-3" />
                Ready
              </span>
              <Avatar
                name={profile.displayName}
                stance={setup.stance}
                ready
              />
            </div>

            <div className="relative flex items-center justify-center">
              <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-white/[0.04] via-primary/25 to-white/[0.04]" />
              <span className="relative grid size-9 place-items-center rounded-full border border-white/10 bg-[#0d1015] font-display text-[8px] font-bold tracking-[0.14em] text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.38)] sm:size-11 sm:text-[9px]">
                VS
              </span>
            </div>

            {match ? (
              <div className="relative flex min-h-[13.5rem] min-w-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-primary/15 bg-[radial-gradient(circle_at_50%_42%,rgba(0,240,255,0.07),transparent_58%)] p-3 sm:min-h-[15rem] sm:rounded-[1.5rem] sm:p-5">
                <span className="absolute left-3 top-3 font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/45">
                  Opponent
                </span>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[8px] font-medium text-secondary">
                  <Check className="size-3" />
                  Ready
                </span>
                <Avatar
                  name={match.opponentName}
                  stance={match.opponentStance}
                    ready
                />
              </div>
            ) : (
              <div
                className={cn(
                  "relative flex min-h-[13.5rem] min-w-0 flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-dashed p-3 transition-colors sm:min-h-[15rem] sm:rounded-[1.5rem] sm:p-5",
                  isSearching
                    ? "border-primary/25 bg-primary/[0.025]"
                    : "border-white/[0.09] bg-white/[0.012]",
                )}
              >
                <span className="absolute left-3 top-3 font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/45">
                  Opponent seat
                </span>
                <div className="relative grid size-20 place-items-center sm:size-28">
                  {isSearching ? (
                    <SearchScanner />
                  ) : (
                    <>
                      <span className="absolute inset-0 rounded-full border border-dashed border-white/[0.12]" />
                      <span className="absolute inset-3 rounded-full border border-white/[0.04]" />
                      <UsersRound className="relative size-7 text-muted-foreground/45 sm:size-9" />
                    </>
                  )}
                </div>
                <div className="mt-2 min-w-0 text-center">
                  {isSearching ? (
                    <SearchingLabel />
                  ) : (
                    <p className="text-[11px] font-semibold text-muted-foreground sm:text-xs">
                      Waiting for match
                    </p>
                  )}
                  <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-accent sm:text-[9px]">
                    {setup.stance === "support" ? "Against" : "Support"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/[0.018] px-3 py-2.5 text-center text-[9px] text-muted-foreground/65 sm:text-[10px]">
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
              ? "Both debaters are ready to enter"
              : isSearching
                ? "Your place in the queue is secured"
                : "The open seat will defend the opposite position"}
          </div>
        </div>

        <footer className="border-t border-white/[0.07] bg-black/15 px-4 py-4 sm:px-7">
          {match ? (
            <Button
              size="lg"
              onClick={() => onMatched(match)}
              className="h-12 w-full rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary font-semibold text-primary-foreground shadow-[0_0_28px_rgba(0,240,255,0.18)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_38px_rgba(0,240,255,0.3)]"
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
                className="h-12 rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary px-7 font-semibold text-primary-foreground shadow-[0_0_24px_rgba(0,240,255,0.16)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_34px_rgba(0,240,255,0.28)]"
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
        </footer>
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
  ready,
}: {
  name: string;
  stance: "support" | "challenge";
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
            "relative grid size-20 place-items-center rounded-full border font-display text-2xl font-bold shadow-[0_16px_45px_rgba(0,0,0,0.3)] sm:size-28 sm:text-3xl",
            stance === "support"
              ? "border-secondary/35 bg-[radial-gradient(circle_at_35%_30%,rgba(56,232,198,0.25),rgba(56,232,198,0.07)_55%,rgba(0,0,0,0.2))] text-secondary"
              : "border-accent/35 bg-[radial-gradient(circle_at_35%_30%,rgba(255,215,0,0.22),rgba(255,215,0,0.06)_55%,rgba(0,0,0,0.2))] text-accent",
          )}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        {ready ? (
          <span className="absolute bottom-0.5 right-0.5 grid size-5 place-items-center rounded-full border-2 border-background bg-secondary sm:bottom-1 sm:right-1 sm:size-6">
            <Check className="size-3 text-secondary-foreground" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 text-center">
        <p className="mt-1 max-w-24 truncate text-xs font-semibold sm:max-w-32 sm:text-sm">
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
