"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Mic,
  MicOff,
  RefreshCw,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DebateMediaPreferences } from "@/features/debate/types/debate.types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MediaDeviceController } from "@/hooks/use-media-devices";
import { cn } from "@/lib/utils";

function subscribeOnlineStatus(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function readOnlineStatus() {
  return navigator.onLine;
}

export function DeviceStep({
  media,
  allowWithoutDevices = false,
  requiresJudgeConsent = false,
  onBack,
  onComplete,
}: {
  media: MediaDeviceController;
  allowWithoutDevices?: boolean;
  requiresJudgeConsent?: boolean;
  onBack: () => void;
  onComplete: (preferences: DebateMediaPreferences) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [judgeConsent, setJudgeConsent] = useState(!requiresJudgeConsent);
  const ready = media.status === "ready";
  const online = useSyncExternalStore(
    subscribeOnlineStatus,
    readOnlineStatus,
    () => true,
  );

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = media.stream;
  }, [media.stream, media.cameraEnabled]);

  useEffect(() => {
    if (media.status === "idle" && !allowWithoutDevices) {
      void media.requestMedia();
    }
  }, [allowWithoutDevices, media.status, media.requestMedia, media]);

  return (
    <section className="screen-enter mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-[1280px] flex-col items-center overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5 sm:pt-5 lg:h-[calc(100svh-4rem)] lg:px-8">
      <header className="mb-2 flex w-full max-w-5xl shrink-0 items-end justify-between gap-4 text-center sm:mb-3 sm:text-left">
        <div className="w-full sm:w-auto">
          <p className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">
            Signal calibration
          </p>
          <h1 className="font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl lg:text-4xl">
            Camera & mic check
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Frame yourself, check your audio, and enter when ready.
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:flex">
          <span
            className={cn(
              "size-1.5 rounded-full",
              ready ? "live-dot bg-secondary" : "bg-muted-foreground/50",
            )}
          />
          {ready ? "Signal online" : "Connecting"}
        </span>
      </header>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center py-1 sm:py-2">
        <div
          className={cn(
            "relative h-full min-h-[13rem] w-full max-w-5xl overflow-hidden rounded-2xl border bg-[#08080c] transition-all duration-500 md:h-auto md:aspect-video md:max-h-full lg:rounded-2xl",
            ready && media.cameraEnabled
              ? "border-primary/25 shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_50px_rgba(128,102,255,0.06)]"
              : "border-white/[0.07]",
          )}
        >
          {ready && media.cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
          ) : (
            <div className="grid h-full place-items-center bg-[#101017]">
              <div className="px-6 text-center">
                <div className="mx-auto grid size-16 border border-white/[0.09] place-items-center rounded-full bg-white/[0.025] sm:size-20">
                  {media.cameraEnabled ? (
                    <Video className="size-6 text-primary/75 sm:size-7" />
                  ) : (
                    <CameraOff className="size-6 text-muted-foreground sm:size-7" />
                  )}
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {media.status === "requesting"
                    ? "Waiting for device access"
                    : media.status === "idle" && allowWithoutDevices
                      ? "Device preview is optional"
                    : media.status === "denied"
                      ? "Camera and mic are blocked"
                      : media.status === "unsupported"
                        ? "Media devices are not supported"
                        : "Your preview will appear here"}
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                  {media.status === "idle" && allowWithoutDevices
                    ? "Enable devices for the full room, or continue with an offline showcase feed."
                    : media.status === "denied"
                    ? "Allow camera and microphone permissions in your browser, then try again."
                    : "CivicRound checks your signal locally before matchmaking."}
                </p>
                {!ready ? (
                  <button
                    type="button"
                    onClick={media.requestMedia}
                    disabled={media.status === "requesting"}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3.5",
                        media.status === "requesting" && "animate-spin",
                      )}
                    />
                    {media.status === "requesting" ? "Requesting access" : "Enable camera & mic"}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />

          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md sm:left-4 sm:top-4 sm:px-3 sm:py-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                ready ? "live-dot bg-secondary" : "bg-white/35",
              )}
            />
            {ready ? "Live preview" : "Preview offline"}
          </div>

          <div className="absolute right-3 top-3 hidden rounded-full border border-white/10 bg-black/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55 backdrop-blur-md sm:block sm:right-4 sm:top-4">
            Local only · not recorded
          </div>

          {ready ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/55 p-1.5 shadow-xl backdrop-blur-md sm:bottom-4 sm:p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={media.toggleMicrophone}
                    aria-label={media.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
                    aria-pressed={media.microphoneEnabled}
                    className={cn(
                      "grid size-10 place-items-center rounded-full transition-colors sm:size-11",
                      media.microphoneEnabled
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-destructive text-white",
                    )}
                  >
                    {media.microphoneEnabled ? (
                      <Mic className="size-4" />
                    ) : (
                      <MicOff className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {media.microphoneEnabled ? "Mute" : "Unmute"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={media.toggleCamera}
                    aria-label={media.cameraEnabled ? "Turn camera off" : "Turn camera on"}
                    aria-pressed={media.cameraEnabled}
                    className={cn(
                      "grid size-10 place-items-center rounded-full transition-colors sm:size-11",
                      media.cameraEnabled
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-destructive text-white",
                    )}
                  >
                    {media.cameraEnabled ? (
                      <Camera className="size-4" />
                    ) : (
                      <CameraOff className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {media.cameraEnabled ? "Camera off" : "Camera on"}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex w-full max-w-5xl shrink-0 items-center justify-center gap-1.5 overflow-x-auto rounded-xl border border-white/[0.07] bg-[#111118] p-1.5 text-[10px] sm:mt-3 sm:w-auto sm:gap-2 sm:p-2 sm:text-[11px]">
        <StatusChip label="Camera" ready={ready && media.cameraEnabled} />
        <StatusChip label="Microphone" ready={ready && media.microphoneEnabled} />
        {ready && media.microphoneEnabled ? (
          <span className="hidden border-x border-white/[0.07] px-2 sm:inline-flex">
            <AudioMeter stream={media.stream} enabled={media.microphoneEnabled} />
          </span>
        ) : null}
        <StatusChip label="Network" ready={online} />
      </div>

      {requiresJudgeConsent ? (
        <label className="mt-2 flex w-full max-w-5xl shrink-0 cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 sm:mt-3 sm:px-4">
          <input
            type="checkbox"
            checked={judgeConsent}
            onChange={(event) => setJudgeConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#8066ff]"
          />
          <span>
            <span className="block text-xs font-semibold text-foreground">
              Enable AI Judge Beta
            </span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
              Timed speech audio is temporarily processed for transcription.
              Audio is discarded; the transcript and scorecard stay with the match.
            </span>
          </span>
        </label>
      ) : null}

      <div className="mt-2 grid w-full max-w-5xl shrink-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-2 sm:mt-3 sm:grid-cols-[3rem_minmax(12rem,1fr)]">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          aria-label="Back to motion selection"
          className="h-11 rounded-lg border border-white/[0.08] px-0 hover:border-white/10 sm:h-12"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {allowWithoutDevices && !requiresJudgeConsent && !ready ? (
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                onComplete({
                  cameraEnabled: false,
                  microphoneEnabled: false,
                  judgeConsent,
                })
              }
              disabled={!online || (requiresJudgeConsent && !judgeConsent)}
              className="h-11 min-w-0 rounded-lg sm:h-12"
            >
              Continue without devices
            </Button>
          ) : null}
          <Button
            size="lg"
            onClick={() =>
              onComplete({
                cameraEnabled: media.cameraEnabled,
                microphoneEnabled: media.microphoneEnabled,
                judgeConsent,
              })
            }
            disabled={
              !ready ||
              !online ||
              (requiresJudgeConsent && !judgeConsent)
            }
            className="h-11 min-w-0 rounded-lg border-[#8066ff] bg-[#8066ff] px-2 font-semibold text-white shadow-[0_10px_28px_rgba(128,102,255,0.18)] transition-all duration-200 hover:-translate-y-px hover:border-[#957fff] hover:bg-[#957fff] hover:shadow-[0_14px_34px_rgba(128,102,255,0.25)] active:translate-y-0 sm:h-12 sm:px-5"
          >
            <span>Find Match</span>
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatusChip({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
        ready
          ? "bg-secondary/[0.08] text-secondary"
          : "bg-white/[0.025] text-muted-foreground",
      )}
    >
      {ready ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <span className="size-1.5 rounded-full bg-muted-foreground" />
      )}
      {label}
    </span>
  );
}

function AudioMeter({
  stream,
  enabled,
}: {
  stream: MediaStream | null;
  enabled: boolean;
}) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || !enabled) {
      const timer = setTimeout(() => setLevel(0), 0);
      return () => clearTimeout(timer);
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrameId: number;

    try {
      audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 32;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setLevel(average);
        animationFrameId = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn("Failed to initialize AudioContext for visualizer", e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, [stream, enabled]);

  const bars = Math.min(5, Math.floor((level / 100) * 5));

  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-1 rounded-full transition-all duration-75",
            i < bars && enabled
              ? i < 3
                ? "bg-secondary"
                : i < 4
                  ? "bg-accent"
                  : "bg-destructive"
              : "bg-white/10"
          )}
          style={{ height: `${6 + i * 2}px` }}
        />
      ))}
    </span>
  );
}
