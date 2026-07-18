"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

import { ArenaShell } from "@/components/layout/arena-shell";
import { Button } from "@/components/ui/button";
import { readGuestIdentity } from "@/features/auth/services/guest-auth.service";
import { DeviceStep } from "@/features/device/components/device-step";
import { DebateRoom } from "@/features/debate/components/debate-room";
import { ResultsStep } from "@/features/debate/components/results-step";
import { RoundStep } from "@/features/debate/components/round-step";
import { getDebateTopic } from "@/features/debate/data/topics";
import { listDebateTopics } from "@/features/debate/services/topics.service";
import type {
  AppStage,
  DebateMediaPreferences,
  DebateRoomOutcome,
  DebateSession,
  DebateSetup,
  DebateTopic,
  GuestProfile,
} from "@/features/debate/types/debate.types";
import { MatchStep } from "@/features/matchmaking/components/match-step";
import { readInviteSetup } from "@/features/matchmaking/services/matchmaking.service";
import { ProfileStep } from "@/features/onboarding/components/profile-step";
import { useMediaDevices } from "@/hooks/use-media-devices";

const EMPTY_TOPICS: DebateTopic[] = [];

const LiveKitDebateRoom = dynamic(
  () =>
    import("@/features/video/components/livekit-debate-room").then(
      (module) => module.LiveKitDebateRoom,
    ),
  { ssr: false },
);

export function CivicRoundApp() {
  const [stage, setStage] = useState<AppStage>("profile");
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [setup, setSetup] = useState<DebateSetup | null>(null);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [roomOutcome, setRoomOutcome] =
    useState<DebateRoomOutcome>("complete");
  const [mediaPreferences, setMediaPreferences] =
    useState<DebateMediaPreferences>({
      cameraEnabled: true,
      microphoneEnabled: true,
    });
  const [inviteSetup] = useState<DebateSetup | null>(() => readInviteSetup());
  const media = useMediaDevices();
  const topicsQuery = useQuery({
    queryKey: ["debate-topics"],
    queryFn: listDebateTopics,
    enabled: Boolean(profile),
    staleTime: 5 * 60_000,
  });
  const topics = topicsQuery.data ?? EMPTY_TOPICS;

  useEffect(() => {
    const storedProfile = readGuestIdentity();
    const restoreIdentity = window.setTimeout(() => {
      if (storedProfile) {
        setProfile(storedProfile);
        if (inviteSetup) {
          setSetup(inviteSetup);
          setStage("device");
        } else {
          setStage("round");
        }
      }

      setIdentityReady(true);
    }, 0);

    return () => window.clearTimeout(restoreIdentity);
  }, [inviteSetup]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage]);

  const topic = useMemo(
    () => (setup ? getDebateTopic(setup.topicId, topics) : null),
    [setup, topics],
  );

  if (!identityReady) {
    return (
      <ArenaShell stage="profile" profile={null}>
        <SessionBootstrap />
      </ArenaShell>
    );
  }

  const requiresTopics = Boolean(profile && stage !== "profile");

  if (requiresTopics && topicsQuery.isPending) {
    return (
      <ArenaShell stage={stage} profile={profile}>
        <SessionBootstrap label="Loading debate motions" />
      </ArenaShell>
    );
  }

  if (requiresTopics && topicsQuery.isError) {
    return (
      <ArenaShell stage={stage} profile={profile}>
        <TopicsUnavailable
          message="We could not load the debate motions. Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void topicsQuery.refetch()}
        />
      </ArenaShell>
    );
  }

  if (requiresTopics && setup && !topic) {
    return (
      <ArenaShell stage={stage} profile={profile}>
        <TopicsUnavailable
          message="This debate motion is no longer available."
          actionLabel="Choose another motion"
          onAction={() => {
            setSession(null);
            setSetup(null);
            window.history.replaceState({}, "", window.location.pathname);
            setStage("round");
          }}
        />
      </ArenaShell>
    );
  }

  return (
    <ArenaShell stage={stage} profile={profile}>
      {stage === "profile" ? (
        <ProfileStep
          profile={profile}
          onComplete={(nextProfile) => {
            setProfile(nextProfile);
            if (inviteSetup) {
              setSetup(inviteSetup);
              setStage("device");
            } else {
              setStage("round");
            }
          }}
        />
      ) : null}

      {stage === "round" && profile ? (
        <RoundStep
          topics={topics}
          onBack={() => setStage("profile")}
          onComplete={(nextSetup) => {
            setSetup(nextSetup);
            setStage("device");
          }}
        />
      ) : null}

      {stage === "device" && profile && setup ? (
        <DeviceStep
          media={media}
          onBack={() => setStage(inviteSetup ? "profile" : "round")}
          onComplete={(preferences) => {
            setMediaPreferences(preferences);
            media.stopMedia();
            setStage("match");
          }}
        />
      ) : null}

      {stage === "match" && profile && setup && topic ? (
        <MatchStep
          profile={profile}
          setup={setup}
          topic={topic}
          onBack={() => setStage("device")}
          onMatched={(nextSession) => {
            setSession(nextSession);
            setRoomOutcome("complete");
            window.history.replaceState({}, "", window.location.pathname);
            setStage("room");
          }}
        />
      ) : null}

      {stage === "room" && profile && setup && session && topic ? (
        session.source === "live" ? (
          <LiveKitDebateRoom
            profile={profile}
            setup={setup}
            session={session}
            topic={topic}
            mediaPreferences={mediaPreferences}
            onLeave={(outcome) => {
              setRoomOutcome(outcome);
              setStage("results");
            }}
          />
        ) : (
          <DebateRoom
            profile={profile}
            setup={setup}
            session={session}
            topic={topic}
            media={media}
            onComplete={() => {
              setRoomOutcome("complete");
              setStage("results");
            }}
          />
        )
      ) : null}

      {stage === "results" && setup && session && topic ? (
        <ResultsStep
          setup={setup}
          session={session}
          topic={topic}
          outcome={roomOutcome}
          onRematch={() => {
            setSession(null);
            setRoomOutcome("complete");
            setSetup({ ...setup, inviteCode: undefined });
            setStage("match");
          }}
          onNewRound={() => {
            setSession(null);
            setRoomOutcome("complete");
            setSetup(null);
            setStage("round");
          }}
        />
      ) : null}
    </ArenaShell>
  );
}

function SessionBootstrap({
  label = "Preparing your session",
}: {
  label?: string;
}) {
  return (
    <section
      className="flex min-h-[calc(100svh-3rem)] items-center justify-center px-4 lg:min-h-[calc(100svh-3.5rem)]"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <span className="relative mx-auto grid size-11 place-items-center rounded-full border border-primary/15 bg-primary/[0.05]">
          <span className="live-dot size-2 rounded-full bg-primary" />
        </span>
        <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
      </div>
    </section>
  );
}

function TopicsUnavailable({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="flex min-h-[calc(100svh-3rem)] items-center justify-center px-4 lg:min-h-[calc(100svh-3.5rem)]">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#090c11]/95 p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
          Debate motions unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <Button
          size="lg"
          onClick={onAction}
          className="mt-5 h-11 rounded-full px-7"
        >
          {actionLabel}
        </Button>
      </div>
    </section>
  );
}
