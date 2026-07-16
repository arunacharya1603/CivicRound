"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Camera,
  CameraOff,
  Flag,
  LoaderCircle,
  LogOut,
  Mic,
  MicOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildDebatePhases } from "@/features/debate/lib/debate-phases";
import type {
  DebateSession,
  DebateSetup,
  DebateTopic,
  GuestProfile,
} from "@/features/debate/types/debate.types";
import { ReportDialog } from "@/features/reporting/components/report-dialog";
import {
  completeDebateRoom,
  getDebateRoomState,
  leaveDebateRoom,
  markDebateRoomReady,
} from "@/features/video/services/room-lifecycle.service";
import { useSynchronizedDebateTimer } from "@/hooks/use-synchronized-debate-timer";
import { requireSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface RoomToken {
  token: string;
  serverUrl: string;
}

async function getRoomToken(session: DebateSession): Promise<RoomToken> {
  const supabase = requireSupabaseClient();
  const currentSession = await supabase.auth.getSession();
  const accessToken = currentSession.data.session?.access_token;

  if (!accessToken) {
    throw new Error("Your guest session has expired.");
  }

  const response = await fetch("/api/livekit/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      authorization: "Bearer " + accessToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      roomName: session.roomName,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Unable to join the video room.");
  }

  return response.json() as Promise<RoomToken>;
}

export function LiveKitDebateRoom({
  profile,
  session,
  setup,
  topic,
  onLeave,
}: {
  profile: GuestProfile;
  session: DebateSession;
  setup: DebateSetup;
  topic: DebateTopic;
  onLeave: () => void;
}) {
  const leftRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    onLeave();
  }, [onLeave]);

  const token = useQuery({
    queryKey: ["livekit-token", session.roomName, profile.id],
    queryFn: () => getRoomToken(session),
    retry: 1,
    staleTime: Infinity,
  });

  if (token.isPending) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">
            Opening authorized room
          </p>
        </div>
      </div>
    );
  }

  if (token.error || !token.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">
          The live room did not open.
        </h1>
        <p className="mt-3 text-muted-foreground">
          {token.error?.message ??
            "Return to matchmaking and request a fresh room."}
        </p>
        <Button className="mt-6" onClick={finishOnce}>
          Return
        </Button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token.data.token}
      serverUrl={token.data.serverUrl}
      connect
      video
      audio
      onDisconnected={finishOnce}
      className="min-h-[calc(100vh-64px)]"
    >
      <LiveRoomSurface
        session={session}
        setup={setup}
        topic={topic}
        onLeave={finishOnce}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function LiveRoomSurface({
  session,
  setup,
  topic,
  onLeave,
}: {
  session: DebateSession;
  setup: DebateSetup;
  topic: DebateTopic;
  onLeave: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const completionRef = useRef(false);
  const cancelledRef = useRef(false);
  const phases = useMemo(
    () => buildDebatePhases(setup.duration, session.speakerOrder),
    [session.speakerOrder, setup.duration],
  );

  const ready = useQuery({
    queryKey: ["debate-room-ready", session.id],
    queryFn: () => markDebateRoomReady(session.id),
    retry: 2,
    staleTime: Infinity,
  });

  const roomState = useQuery({
    queryKey: ["debate-room-state", session.id],
    queryFn: () => getDebateRoomState(session.id),
    enabled: ready.isSuccess,
    initialData: ready.data,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "ready" || status === "live" ? 750 : false;
    },
  });

  const effectiveState = roomState.data ?? ready.data ?? null;

  const finishRound = useCallback(async () => {
    if (completionRef.current) return;
    completionRef.current = true;
    try {
      await completeDebateRoom(session.id);
    } finally {
      await room.disconnect();
      onLeave();
    }
  }, [onLeave, room, session.id]);

  const timer = useSynchronizedDebateTimer({
    phases,
    startedAt: effectiveState?.startedAt ?? null,
    serverNow: effectiveState?.serverNow ?? null,
    active: effectiveState?.status === "live",
    onComplete: finishRound,
  });

  useEffect(() => {
    if (
      effectiveState?.status === "cancelled" &&
      !cancelledRef.current
    ) {
      cancelledRef.current = true;
      void room.disconnect().finally(onLeave);
    }
  }, [effectiveState?.status, onLeave, room]);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const isYourTurn =
    effectiveState?.status === "live" &&
    timer.currentPhase?.speaker === "you";
  const statusLabel =
    effectiveState?.status === "ready"
      ? "Waiting for opponent"
      : timer.running
        ? timer.currentPhase?.label
        : "Closing round";
  const seconds = String(
    effectiveState?.status === "ready"
      ? phases[0]?.duration ?? 0
      : timer.secondsLeft,
  ).padStart(2, "0");

  const handleLeave = async () => {
    if (completionRef.current) return;
    completionRef.current = true;
    try {
      await leaveDebateRoom(session.id);
    } finally {
      await room.disconnect();
      onLeave();
    }
  };

  if (ready.error || roomState.error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">
          Room synchronization failed.
        </h1>
        <p className="mt-3 text-muted-foreground">
          {(ready.error ?? roomState.error)?.message}
        </p>
        <Button className="mt-6" onClick={() => void handleLeave()}>
          Return
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-[1280px] px-3 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">
            {topic.category} / Authorized live room
          </p>
          <h1 className="mt-1 truncate font-display text-lg font-semibold sm:text-2xl">
            {topic.statement}
          </h1>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase text-accent">
              {ready.isPending ? "Registering presence" : statusLabel}
            </p>
            <p className="font-mono text-3xl font-semibold tabular-nums">
              00:{seconds}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
          >
            <Flag />
            <span className="hidden sm:inline">Report</span>
          </Button>
        </div>
      </div>

      <Progress
        value={timer.phaseProgress}
        className="h-1 rounded-none bg-border [&>div]:bg-accent"
      />

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {tracks.slice(0, 2).map((trackRef) => {
          const isLocal =
            trackRef.participant.identity === localParticipant.identity;
          const active =
            effectiveState?.status === "live" &&
            (isLocal ? isYourTurn : !isYourTurn);

          return (
            <div
              key={trackRef.participant.identity}
              className={cn(
                "relative aspect-video overflow-hidden rounded-sm border bg-black",
                active
                  ? isLocal
                    ? "border-primary"
                    : "border-accent"
                  : "border-border",
              )}
            >
              <ParticipantTile trackRef={trackRef} className="h-full w-full" />
              <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/85 px-2 py-1 font-mono text-[9px] uppercase">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    active ? "live-dot bg-primary" : "bg-muted-foreground",
                  )}
                />
                {active ? "Speaking now" : isLocal ? "You" : "Connected"}
              </div>
              <div className="absolute bottom-3 left-3 bg-black/85 px-3 py-2 font-display text-sm font-semibold">
                {trackRef.participant.name || trackRef.participant.identity}
              </div>
            </div>
          );
        })}

        {tracks.length < 2 ? (
          <div className="grid aspect-video place-items-center rounded-sm border border-dashed border-border bg-black">
            <div className="text-center">
              <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
              <p className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
                Waiting for opponent connection
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div
          className={cn(
            "grid gap-px border border-border bg-border",
            phases.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className={cn(
                "bg-card px-3 py-3 font-mono text-[9px] uppercase text-muted-foreground",
                index === timer.phaseIndex &&
                  timer.running &&
                  "bg-primary text-primary-foreground",
                index < timer.phaseIndex && "text-secondary",
              )}
            >
              <span className="mr-2">0{index + 1}</span>
              {phase.label}
            </div>
          ))}
        </div>

        <LiveControls
          canSpeak={isYourTurn}
          waiting={effectiveState?.status !== "live"}
          onLeave={handleLeave}
        />
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        matchId={session.id}
        opponentId={session.opponentId}
        opponentName={session.opponentName}
      />
    </section>
  );
}

function LiveControls({
  canSpeak,
  waiting,
  onLeave,
}: {
  canSpeak: boolean;
  waiting: boolean;
  onLeave: () => Promise<void>;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  useEffect(() => {
    if (!canSpeak && isMicrophoneEnabled) {
      void localParticipant.setMicrophoneEnabled(false);
    }
  }, [canSpeak, isMicrophoneEnabled, localParticipant]);

  return (
    <div className="flex items-center justify-center gap-2 rounded-sm border border-border bg-card p-2">
      <Button
        size="icon"
        variant={isMicrophoneEnabled ? "ghost" : "destructive"}
        onClick={() =>
          localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
        }
        disabled={!canSpeak}
        aria-label={
          waiting
            ? "Microphone unlocks when the round starts"
            : canSpeak
              ? "Toggle microphone"
              : "Microphone locked outside your turn"
        }
      >
        {isMicrophoneEnabled ? <Mic /> : <MicOff />}
      </Button>
      <Button
        size="icon"
        variant={isCameraEnabled ? "ghost" : "destructive"}
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        aria-label="Toggle camera"
      >
        {isCameraEnabled ? <Camera /> : <CameraOff />}
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button
        size="icon"
        variant="destructive"
        onClick={() => void onLeave()}
        aria-label="Leave room"
      >
        <LogOut />
      </Button>
    </div>
  );
}
