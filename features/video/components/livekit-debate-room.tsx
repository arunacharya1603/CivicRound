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
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import {
  AudioPresets,
  ConnectionState,
  Track,
  VideoPresets,
} from "livekit-client";
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
import { useTurnTranscription } from "@/features/debate/hooks/use-turn-transcription";
import { registerJudgeConsent } from "@/features/debate/services/judge.service";
import type {
  DebateMediaPreferences,
  DebateRoomOutcome,
  DebateSession,
  DebateSetup,
  DebateTopic,
  ParticipantProfile,
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
  mediaPreferences,
  onLeave,
}: {
  profile: ParticipantProfile;
  session: DebateSession;
  setup: DebateSetup;
  topic: DebateTopic;
  mediaPreferences: DebateMediaPreferences;
  onLeave: (outcome: DebateRoomOutcome) => void;
}) {
  const leftRef = useRef(false);
  const finishOnce = useCallback(
    (outcome: DebateRoomOutcome) => {
      if (leftRef.current) return;
      leftRef.current = true;
      onLeave(outcome);
    },
    [onLeave],
  );

  const leaveOnce = useCallback(async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    try {
      await leaveDebateRoom(session.id, setup.isRated);
    } catch {
      // A failed cleanup must not trap the participant on a broken room screen.
    } finally {
      onLeave("cancelled");
    }
  }, [onLeave, session.id, setup.isRated]);

  const token = useQuery({
    queryKey: ["livekit-token", session.roomName, profile.id],
    queryFn: () => getRoomToken(session),
    retry: 1,
    staleTime: Infinity,
  });

  if (token.isPending) {
    return (
      <div className="grid min-h-[calc(100dvh-3.5rem)] lg:min-h-[calc(100dvh-4rem)] place-items-center">
        <div className="text-center">
          <div className="relative mx-auto size-16">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
            <LoaderCircle className="absolute inset-0 m-auto size-8 animate-spin text-primary drop-shadow-[0_0_8px_rgba(128,102,255,0.4)]" />
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Opening authorized room
          </p>
        </div>
      </div>
    );
  }

  if (token.error || !token.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">
          The live room did not open.
        </h1>
        <p className="mt-3 text-muted-foreground">
          {token.error?.message ??
            "Return to matchmaking and request a fresh room."}
        </p>
        <Button className="mt-6 rounded-xl" onClick={() => void leaveOnce()}>
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
      video={
        mediaPreferences.cameraEnabled
          ? {
              resolution: VideoPresets.h540.resolution,
              facingMode: "user",
            }
          : false
      }
      audio={
        mediaPreferences.microphoneEnabled
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false
      }
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: AudioPresets.speech,
          dtx: true,
          red: true,
          forceStereo: false,
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        },
      }}
      connectOptions={{
        autoSubscribe: true,
        maxRetries: 3,
        websocketTimeout: 10_000,
        peerConnectionTimeout: 10_000,
      }}
      onDisconnected={() => void leaveOnce()}
      className="min-h-[calc(100dvh-3.5rem)] lg:min-h-[calc(100dvh-4rem)]"
    >
      <LiveRoomSurface
        session={session}
        setup={setup}
        topic={topic}
        judgeConsentEnabled={mediaPreferences.judgeConsent}
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
  judgeConsentEnabled,
  onLeave,
}: {
  session: DebateSession;
  setup: DebateSetup;
  topic: DebateTopic;
  judgeConsentEnabled: boolean;
  onLeave: (outcome: DebateRoomOutcome) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const completionRef = useRef(false);
  const cancelledRef = useRef(false);
  const flushTranscriptRef = useRef<() => Promise<void>>(async () => {});
  const phases = useMemo(
    () => buildDebatePhases(setup.duration, session.speakerOrder),
    [session.speakerOrder, setup.duration],
  );

  const judgeConsent = useQuery({
    queryKey: ["debate-judge-consent", session.id],
    queryFn: () => registerJudgeConsent(session.id, judgeConsentEnabled),
    enabled:
      connectionState === ConnectionState.Connected && judgeConsentEnabled,
    retry: 2,
    staleTime: Infinity,
  });

  const ready = useQuery({
    queryKey: ["debate-room-ready", session.id],
    queryFn: () => markDebateRoomReady(session.id),
    enabled:
      connectionState === ConnectionState.Connected &&
      (!judgeConsentEnabled || judgeConsent.isSuccess),
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
    let outcome: DebateRoomOutcome = "cancelled";
    try {
      await flushTranscriptRef.current();
      if (await completeDebateRoom(session.id)) {
        outcome = "complete";
      }
    } finally {
      onLeave(outcome);
      void room.disconnect();
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
      effectiveState?.status === "complete" &&
      !completionRef.current
    ) {
      completionRef.current = true;
      void (async () => {
        await flushTranscriptRef.current();
        onLeave("complete");
        await room.disconnect();
      })();
      return;
    }

    if (
      effectiveState?.status === "cancelled" &&
      !cancelledRef.current
    ) {
      cancelledRef.current = true;
      onLeave("cancelled");
      void room.disconnect();
    }
  }, [effectiveState?.status, onLeave, room]);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const isYourTurn =
    effectiveState?.status === "live" &&
    timer.currentPhase?.speaker === "you";
  const transcription = useTurnTranscription({
    enabled: judgeConsentEnabled && judgeConsent.isSuccess,
    roomId: session.id,
    roomStatus: effectiveState?.status,
    localParticipant,
    isMicrophoneEnabled,
    isYourTurn,
    phaseId: timer.currentPhase?.id ?? null,
    phaseIndex: timer.phaseIndex,
    phaseDuration: timer.currentPhase?.duration ?? 0,
  });

  useEffect(() => {
    flushTranscriptRef.current = transcription.flush;
  }, [transcription.flush]);

  const reconnecting =
    connectionState === ConnectionState.Reconnecting ||
    connectionState === ConnectionState.SignalReconnecting;
  const statusLabel =
    connectionState === ConnectionState.Connecting
      ? "Connecting"
      : reconnecting
        ? "Reconnecting"
        : effectiveState?.status === "ready"
          ? "Waiting for opponent"
          : timer.running
            ? timer.currentPhase?.label
            : "Debate complete";
  const totalSeconds =
    effectiveState?.status === "ready"
      ? phases[0]?.duration ?? 0
      : timer.secondsLeft;
  const minutesStr = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secondsStr = String(totalSeconds % 60).padStart(2, "0");

  const handleLeave = async () => {
    if (completionRef.current) return;
    completionRef.current = true;
    try {
      await leaveDebateRoom(session.id, setup.isRated);
    } finally {
      onLeave("cancelled");
      void room.disconnect();
    }
  };

  if (judgeConsent.error || ready.error || roomState.error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">
          Room synchronization failed.
        </h1>
        <p className="mt-3 text-muted-foreground">
          {(judgeConsent.error ?? ready.error ?? roomState.error)?.message}
        </p>
        <Button className="mt-6 rounded-xl" onClick={() => void handleLeave()}>
          Return
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
      {/* ─── Topic Header Bar ─── */}
      <div className="relative grid gap-3 overflow-hidden rounded-xl border border-white/[0.09] bg-[#111118] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[9px] uppercase tracking-wider text-primary/70">
              {topic.category} / Authorized live room
            </p>
            {judgeConsentEnabled ? (
              <span
                title={transcription.errorMessage ?? undefined}
                className={cn(
                  "border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                  transcription.status === "error"
                    ? "border-destructive/40 text-destructive"
                    : "border-emerald-400/30 text-emerald-300",
                )}
              >
                {transcription.status === "recording"
                  ? "AI transcript recording"
                  : transcription.status === "uploading"
                    ? "Securing transcript"
                    : transcription.status === "secured"
                      ? "Transcript secured"
                      : transcription.status === "error"
                        ? "Transcript issue"
                        : "AI judge consented"}
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 font-display text-lg font-bold leading-tight [overflow-wrap:anywhere] sm:text-2xl">
            {topic.statement}
          </h1>
          <p className="mt-1 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {topic.context}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-wider text-accent">
              {ready.isPending ? "Registering presence" : statusLabel}
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {minutesStr}:{secondsStr}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            aria-label="Report opponent"
            className="text-muted-foreground hover:text-destructive rounded-xl"
          >
            <Flag className="size-4" />
            <span className="hidden sm:inline">Report</span>
          </Button>
        </div>
      </div>

      {/* ─── Phase Progress Bar ─── */}
      <Progress
        value={timer.phaseProgress}
        className="mt-[-1px] h-1 rounded-none bg-border/60 [&>div]:bg-primary"
      />

      {/* ─── Video Grid ─── */}
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
                "relative aspect-video overflow-hidden rounded-xl border bg-black transition-all duration-500",
                active
                  ? isLocal
                    ? "border-primary/40 shadow-[0_0_24px_rgba(128,102,255,0.2)] ring-1 ring-primary/30"
                    : "border-accent/40 shadow-[0_0_24px_rgba(195,183,255,0.2)] ring-1 ring-accent/30"
                  : "border-border/30 opacity-70",
              )}
            >
              <ParticipantTile
                trackRef={trackRef}
                className="civic-participant-tile h-full w-full"
              />
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 font-mono text-[9px] uppercase tracking-wider">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    active
                      ? "live-dot bg-primary shadow-[0_0_6px_rgba(128,102,255,0.5)]"
                      : "bg-muted-foreground",
                  )}
                />
                {active ? "Speaking now" : isLocal ? "You" : "Connected"}
              </div>
              <div className="absolute bottom-3 left-3 rounded-xl bg-black/70 backdrop-blur-sm px-3 py-2 font-display text-sm font-bold">
                {trackRef.participant.name || trackRef.participant.identity}
              </div>
            </div>
          );
        })}

        {tracks.length < 2 ? (
          <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-border/50 bg-[#111118]">
            <div className="text-center">
              <LoaderCircle className="mx-auto size-6 animate-spin text-primary drop-shadow-[0_0_6px_rgba(128,102,255,0.3)]" />
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Waiting for opponent connection
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── Phase Indicators + Controls ─── */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div
          className={cn(
            "grid gap-px rounded-xl overflow-hidden border border-border/30",
            phases.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className={cn(
                "bg-white/[0.02] px-3 py-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-all duration-300",
                index === timer.phaseIndex &&
                  timer.running &&
                  "bg-primary/15 text-primary shadow-[inset_0_0_12px_rgba(128,102,255,0.05)]",
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
    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-[#111118] p-2">
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
              ? isMicrophoneEnabled
                ? "Mute microphone"
                : "Unmute microphone"
              : "Microphone locked outside your turn"
        }
        aria-pressed={isMicrophoneEnabled}
        className="rounded-full size-9"
      >
        {isMicrophoneEnabled ? <Mic /> : <MicOff />}
      </Button>
      <Button
        size="icon"
        variant={isCameraEnabled ? "ghost" : "destructive"}
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
        aria-pressed={isCameraEnabled}
        className="rounded-full size-9"
      >
        {isCameraEnabled ? <Camera /> : <CameraOff />}
      </Button>
      <div className="mx-1 h-6 w-px bg-border/30" />
      <Button
        size="icon"
        variant="destructive"
        onClick={() => void onLeave()}
        aria-label="Leave room"
        className="rounded-full size-9"
      >
        <LogOut />
      </Button>
    </div>
  );
}
