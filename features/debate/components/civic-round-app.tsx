"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { ArenaShell } from "@/components/layout/arena-shell";
import { DeviceStep } from "@/features/device/components/device-step";
import { DebateRoom } from "@/features/debate/components/debate-room";
import { ResultsStep } from "@/features/debate/components/results-step";
import { RoundStep } from "@/features/debate/components/round-step";
import { getDebateTopic } from "@/features/debate/data/topics";
import type {
  AppStage,
  DebateSession,
  DebateSetup,
  GuestProfile,
} from "@/features/debate/types/debate.types";
import { MatchStep } from "@/features/matchmaking/components/match-step";
import { readInviteSetup } from "@/features/matchmaking/services/matchmaking.service";
import { ProfileStep } from "@/features/onboarding/components/profile-step";
import { useMediaDevices } from "@/hooks/use-media-devices";

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
  const [setup, setSetup] = useState<DebateSetup | null>(null);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [inviteSetup] = useState<DebateSetup | null>(() => readInviteSetup());
  const media = useMediaDevices();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage]);

  const topic = useMemo(
    () => (setup ? getDebateTopic(setup.topicId) : null),
    [setup],
  );

  return (
    <ArenaShell stage={stage} profile={profile}>
      {stage === "profile" ? (
        <ProfileStep
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
          onComplete={() => setStage("match")}
        />
      ) : null}

      {stage === "match" && profile && setup ? (
        <MatchStep
          profile={profile}
          setup={setup}
          onBack={() => setStage("device")}
          onMatched={(nextSession) => {
            setSession(nextSession);
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
            onLeave={() => setStage("results")}
          />
        ) : (
          <DebateRoom
            profile={profile}
            setup={setup}
            session={session}
            topic={topic}
            media={media}
            onComplete={() => setStage("results")}
          />
        )
      ) : null}

      {stage === "results" && setup && session && topic ? (
        <ResultsStep
          setup={setup}
          session={session}
          topic={topic}
          onRematch={() => {
            setSession(null);            setSetup({ ...setup, inviteCode: undefined });
            setStage("match");
          }}
          onNewRound={() => {
            setSession(null);
            setSetup(null);
            setStage("round");
          }}
        />
      ) : null}
    </ArenaShell>
  );
}
