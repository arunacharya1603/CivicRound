"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Link2,
  Radar,
  Swords,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

  const isSearching = matchmaking.isPending || inviteWaiting.isPending;
  const error =
    matchmaking.error ?? inviteCreation.error ?? inviteWaiting.error;

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
    <section className="screen-enter mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-primary">
            <Swords className="size-4" />
            Opposing stance
          </div>
          <h1 className="text-balance mt-3 font-display text-4xl font-semibold leading-none sm:text-5xl">
            {match ? "Your round is ready." : "Find the other side."}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {match
              ? "Both debaters are present. Enter when you are ready."
              : "Join the public queue or send a private invite to someone you know."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              isSearching ? "live-dot bg-primary" : "bg-secondary",
            )}
          />
          {isSearching ? "Scanning" : match ? "Room ready" : "Queue open"}
        </div>
      </header>

      <div className="min-w-0">
        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:items-stretch lg:gap-6">
          <DebaterPlate
            name={profile.displayName}
            stance={setup.stance}
            label="You"
            active
          />

          <div className="flex min-h-10 items-center justify-center gap-3 md:min-h-48 md:flex-col">
            <span className="h-px flex-1 bg-border md:h-auto md:w-px" />
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background font-mono text-[10px] font-bold">
              VS
            </span>
            <span className="h-px flex-1 bg-border md:h-auto md:w-px" />
          </div>

          {match ? (
            <DebaterPlate
              name={match.opponentName}
              stance={match.opponentStance}
              label="Opponent"
              active
            />
          ) : (
            <div className="grid min-h-48 min-w-0 place-items-center border border-dashed border-border bg-background p-5">
              <div className="text-center">
                {isSearching ? (
                  <Radar className="pulse-ring mx-auto size-9 text-primary" />
                ) : (
                  <UsersRound className="mx-auto size-9 text-muted-foreground" />
                )}
                <p className="mt-4 text-sm font-semibold">
                  {isSearching ? "Looking for a debater" : "Opponent slot open"}
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">
                  {isSearching
                    ? setup.inviteCode
                      ? "Claiming private match"
                      : "Searching opposite stance"
                    : "Waiting for your action"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-y border-border py-5">
          {match ? (
            <Button size="lg" className="w-full" onClick={() => onMatched(match)}>
              Enter live room
              <ArrowRight />
            </Button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                onClick={() => matchmaking.mutate()}
                disabled={isSearching || inviteCreation.isPending}
              >
                <Swords />
                {matchmaking.isPending
                  ? "Finding opponent"
                  : setup.inviteCode
                    ? "Join private match"
                    : "Find a match"}
              </Button>
              {!setup.inviteCode ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => inviteCreation.mutate()}
                  disabled={isSearching || inviteCreation.isPending}
                >
                  <Link2 />
                  {inviteCreation.isPending
                    ? "Creating invite"
                    : "Invite someone"}
                </Button>
              ) : null}
            </div>
          )}

          {error && error.name !== "AbortError" ? (
            <p className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">
              {error.message || "Matchmaking is unavailable. Please try again."}
            </p>
          ) : null}

          {inviteUrl ? (
            <div className="mt-4 flex min-w-0 items-center gap-3 border border-border bg-background p-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
                {inviteUrl}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                }}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Button variant="ghost" onClick={leaveMatchmaking} className="mt-4">
        <ArrowLeft />
        Back
      </Button>
    </section>
  );
}

function DebaterPlate({
  name,
  stance,
  label,
  active,
}: {
  name: string;
  stance: "support" | "challenge";
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-48 min-w-0 flex-col justify-between border bg-background p-5",
        active ? "border-muted-foreground" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "size-2 rounded-full",
            stance === "support" ? "bg-secondary" : "bg-accent",
          )}
        />
      </div>

      <div className="mt-8 min-w-0">
        <div
          className={cn(
            "grid size-12 place-items-center rounded-full font-display text-xl font-bold",
            stance === "support"
              ? "bg-secondary text-secondary-foreground"
              : "bg-accent text-accent-foreground",
          )}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <p className="mt-4 truncate font-display text-2xl font-semibold">
          {name}
        </p>
        <p
          className={cn(
            "mt-1 font-mono text-[9px] uppercase",
            stance === "support" ? "text-secondary" : "text-accent",
          )}
        >
          {stance}
        </p>
      </div>
    </div>
  );
}
