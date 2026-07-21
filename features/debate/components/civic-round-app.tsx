"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Bot, ShieldCheck } from "lucide-react";

import { ArenaShell } from "@/components/layout/arena-shell";
import { Button } from "@/components/ui/button";
import { AccountStep } from "@/features/auth/components/account-step";
import { readGuestIdentity } from "@/features/auth/services/guest-auth.service";
import { readMemberIdentity } from "@/features/auth/services/member-auth.service";
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
  MatchHistoryEntry,
  MatchMode,
  MemberProfile,
  ParticipantProfile,
} from "@/features/debate/types/debate.types";
import { readMatchHistory } from "@/features/history/services/match-history.service";
import { MatchStep } from "@/features/matchmaking/components/match-step";
import {
  createAiPracticeSession,
  readInviteSetup,
} from "@/features/matchmaking/services/matchmaking.service";
import { ModeStep } from "@/features/modes/components/mode-step";
import { modeRequiresAccount } from "@/features/modes/data/mode-rules";
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
  const [stage, setStage] = useState<AppStage>("modes");
  const [selectedMode, setSelectedMode] = useState<MatchMode | null>(null);
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [identityReady, setIdentityReady] = useState(false);
  const [setup, setSetup] = useState<DebateSetup | null>(null);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [roomOutcome, setRoomOutcome] =
    useState<DebateRoomOutcome>("complete");
  const [mediaPreferences, setMediaPreferences] =
    useState<DebateMediaPreferences>({
      cameraEnabled: true,
      microphoneEnabled: true,
      judgeConsent: false,
    });
  const [inviteSetup] = useState<DebateSetup | null>(() => readInviteSetup());
  const media = useMediaDevices();

  const topicsQuery = useQuery({
    queryKey: ["debate-topics"],
    queryFn: listDebateTopics,
    enabled:
      identityReady &&
      Boolean(profile) &&
      stage !== "modes" &&
      stage !== "profile" &&
      stage !== "account",
    staleTime: 5 * 60_000,
  });
  const topics = topicsQuery.data ?? EMPTY_TOPICS;

  useEffect(() => {
    const restoreIdentity = window.setTimeout(() => {
      const storedGuest = readGuestIdentity();
      const storedMember = readMemberIdentity();
      setGuestProfile(storedGuest);
      setMemberProfile(storedMember);
      setHistory(readMatchHistory());

      if (inviteSetup) {
        setSelectedMode("challenge");
        setSetup(inviteSetup);
        const availableIdentity = inviteSetup.isRated
          ? storedMember
          : storedMember ?? storedGuest;

        if (availableIdentity) {
          setProfile(availableIdentity);
          setStage("device");
        } else {
          setStage(inviteSetup.isRated ? "account" : "profile");
        }
      } else {
        setStage("modes");
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

  const startPractice = useCallback(
    (activeProfile: ParticipantProfile, activeSetup: DebateSetup) => {
      setSession(null);
      setStage("match");
      void createAiPracticeSession(activeProfile, activeSetup)
        .then((practiceSession) => {
          setSession(practiceSession);
          setRoomOutcome("complete");
          setStage("room");
        })
        .catch(() => {
          setStage("device");
        });
    },
    [],
  );

  if (!identityReady) {
    return (
      <ArenaShell stage="modes" profile={null}>
        <SessionBootstrap />
      </ArenaShell>
    );
  }

  const requiresTopics =
    Boolean(profile) &&
    stage !== "modes" &&
    stage !== "profile" &&
    stage !== "account";

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

  const chooseMode = (mode: MatchMode) => {
    setSelectedMode(mode);
    setSetup(null);
    setSession(null);
    setRoomOutcome("complete");

    if (modeRequiresAccount(mode)) {
      setProfile(memberProfile);
      setStage("account");
      return;
    }

    const availableIdentity = memberProfile ?? guestProfile;
    if (availableIdentity) {
      setProfile(availableIdentity);
      setStage("round");
    } else {
      setProfile(null);
      setStage("profile");
    }
  };

  return (
    <ArenaShell stage={stage} profile={profile}>
      {stage === "modes" ? (
        <ModeStep
          member={memberProfile}
          history={history}
          onSelect={chooseMode}
        />
      ) : null}

      {stage === "profile" ? (
        <ProfileStep
          profile={guestProfile}
          onComplete={(nextProfile) => {
            setGuestProfile(nextProfile);
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

      {stage === "account" && selectedMode ? (
        <AccountStep
          mode={selectedMode}
          member={memberProfile}
          onBack={() => {
            if (setup?.mode === "challenge") {
              setStage("round");
            } else {
              setProfile(null);
              setStage("modes");
            }
          }}
          onComplete={(nextProfile) => {
            setMemberProfile(nextProfile);
            setProfile(nextProfile);
            setStage(setup ? "device" : "round");
          }}
        />
      ) : null}

      {stage === "round" && profile && selectedMode ? (
        <RoundStep
          mode={selectedMode}
          topics={topics}
          onBack={() => {
            setProfile(null);
            setSetup(null);
            setStage("modes");
          }}
          onComplete={(nextSetup) => {
            setSetup(nextSetup);
            if (
              modeRequiresAccount(nextSetup.mode, nextSetup.isRated) &&
              profile.isAnonymous
            ) {
              setStage("account");
            } else {
              setStage("device");
            }
          }}
        />
      ) : null}

      {stage === "device" && profile && setup ? (
        <DeviceStep
          media={media}
          requiresJudgeConsent={setup.mode !== "practice"}
          allowWithoutDevices={setup.mode === "practice"}
          onBack={() => {
            if (inviteSetup) {
              setStage(inviteSetup.isRated ? "account" : "profile");
            } else {
              setStage("round");
            }
          }}
          onComplete={(preferences) => {
            setMediaPreferences(preferences);
            media.stopMedia();
            if (setup.mode === "practice") {
              startPractice(profile, setup);
            } else {
              setStage("match");
            }
          }}
        />
      ) : null}

      {stage === "match" && profile && setup && topic ? (
        setup.mode === "practice" ? (
          <PracticePreparing onBack={() => setStage("device")} />
        ) : (
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
        )
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
              setRoomOutcome(
                outcome === "cancelled" && setup.isRated
                  ? "forfeit"
                  : outcome,
              );
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
            onComplete={(outcome) => {
              setRoomOutcome(outcome);
              setStage("results");
            }}
          />
        )
      ) : null}

      {stage === "results" && profile && setup && session && topic ? (
        <ResultsStep
          profile={profile}
          setup={setup}
          session={session}
          topic={topic}
          outcome={roomOutcome}
          onRatingApplied={(nextProfile) => {
            setMemberProfile(nextProfile);
            setProfile(nextProfile);
            setHistory(readMatchHistory());
          }}
          onRematch={() => {
            setSession(null);
            setRoomOutcome("complete");
            const nextSetup = { ...setup, inviteCode: undefined };
            setSetup(nextSetup);
            if (nextSetup.mode === "practice") {
              startPractice(profile, nextSetup);
            } else {
              setStage("match");
            }
          }}
          onNewRound={() => {
            setSession(null);
            setRoomOutcome("complete");
            setSetup(null);
            setSelectedMode(null);
            setProfile(null);
            setHistory(readMatchHistory());
            setStage("modes");
          }}
        />
      ) : null}
    </ArenaShell>
  );
}

function PracticePreparing({ onBack }: { onBack: () => void }) {
  return (
    <section className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 lg:min-h-[calc(100svh-4rem)]">
      <div className="w-full max-w-md border border-border bg-card p-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Bot className="size-6" />
        </span>
        <p className="mt-5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
          AI practice
        </p>
        <h1 className="mt-2 font-editorial text-4xl tracking-[-0.035em]">
          Preparing the opponent
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This room contains one human participant and one clearly labelled AI
          practice opponent.
        </p>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="mt-5 rounded-none"
        >
          Cancel
        </Button>
      </div>
    </section>
  );
}

function SessionBootstrap({
  label = "Preparing your session",
}: {
  label?: string;
}) {
  return (
    <section
      className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 lg:min-h-[calc(100svh-4rem)]"
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
    <section className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4 lg:min-h-[calc(100svh-4rem)]">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#111118] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        <ShieldCheck className="mx-auto size-6 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em]">
          Debate motions unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <Button
          size="lg"
          onClick={onAction}
          className="mt-5 h-11 rounded-lg px-7"
        >
          {actionLabel}
        </Button>
      </div>
    </section>
  );
}
