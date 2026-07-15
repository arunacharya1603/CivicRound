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
    <section className="screen-enter mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between border-b border-border pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase text-primary">
            Matchmaking / Opposing stance
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            {match ? "Match locked." : "Find the other side."}
          </h1>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground sm:flex">
          <span
            className={cn(
              "size-1.5 rounded-full",
              isSearching ? "live-dot bg-primary" : "bg-secondary",
            )}
          />
          {isSearching ? "Scanning" : match ? "Room ready" : "Queue open"}
        </div>
      </div>

      <div className="border border-border bg-card">
        <div className="grid min-h-[320px] items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto_1fr]">
          <DebaterPlate name={profile.displayName} stance={setup.stance} active />          <div className="grid place-items-center">
            <div className="grid size-16 place-items-center rounded-full border border-border bg-background font-display text-xl font-bold">
              VS
            </div>
          </div>
          {match ? (
            <DebaterPlate
              name={match.opponentName}
              stance={match.opponentStance}
              active
            />
          ) : (
            <div className="grid min-h-48 place-items-center border border-dashed border-border bg-background">
              <div className="text-center">
                {isSearching ? (
                  <Radar className="pulse-ring mx-auto size-10 text-primary" />
                ) : (
                  <UsersRound className="mx-auto size-10 text-muted-foreground" />
                )}
                <p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">
                  {isSearching
                    ? setup.inviteCode
                      ? "Claiming private match"
                      : "Searching opposite stance"
                    : "Opponent slot open"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-5">
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
                  {inviteCreation.isPending ? "Creating invite" : "Invite someone"}
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
            <div className="mt-4 flex items-center gap-3 border border-border bg-background p-3">
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

      <Button variant="ghost" onClick={leaveMatchmaking} className="mt-5">
        <ArrowLeft />
        Back
      </Button>
    </section>
  );
}

function DebaterPlate({
  name,
  stance,
  active,
}: {
  name: string;
  stance: "support" | "challenge";
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "border bg-background p-5",        active ? "border-primary" : "border-border",
      )}
    >
      <div
        className={cn(
          "grid size-16 place-items-center rounded-full font-display text-2xl font-bold",
          stance === "support"
            ? "bg-secondary text-secondary-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
      <p className="mt-5 font-display text-2xl font-semibold">{name}</p>
      <p
        className={cn(
          "mt-2 font-mono text-[10px] uppercase",
          stance === "support" ? "text-secondary" : "text-accent",
        )}
      >
        {stance}
      </p>
    </div>
  );
}
