"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MediaDeviceController } from "@/hooks/use-media-devices";
import { cn } from "@/lib/utils";

export function DeviceStep({
  media,
  onBack,
  onComplete,
}: {
  media: MediaDeviceController;
  onBack: () => void;
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ready = media.status === "ready";

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = media.stream;
  }, [media.stream, media.cameraEnabled]);

  useEffect(() => {
    if (media.status === "idle") {
      void media.requestMedia();
    }
  }, [media.status, media.requestMedia, media]);

  return (
    <section className="screen-enter mx-auto flex h-[calc(100svh-3rem)] w-full max-w-[1280px] flex-col items-center overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5 sm:pt-5 lg:h-[calc(100svh-3.5rem)] lg:px-8">
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
            "relative h-full min-h-[13rem] w-full max-w-5xl overflow-hidden rounded-[1.6rem] border bg-[#020304] transition-all duration-500 md:h-auto md:aspect-video md:max-h-full lg:rounded-[2rem]",
            ready && media.cameraEnabled
              ? "border-primary/25 shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_50px_rgba(0,240,255,0.06)]"
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
            <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.06),transparent_52%)]">
              <div className="px-6 text-center">
                <div className="neon-ring mx-auto grid size-16 place-items-center rounded-full bg-white/[0.025] sm:size-20">
                  {media.cameraEnabled ? (
                    <Video className="size-6 text-primary/75 sm:size-7" />
                  ) : (
                    <CameraOff className="size-6 text-muted-foreground sm:size-7" />
                  )}
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {media.status === "requesting"
                    ? "Waiting for device access"
                    : media.status === "denied"
                      ? "Camera and mic are blocked"
                      : media.status === "unsupported"
                        ? "Media devices are not supported"
                        : "Your preview will appear here"}
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                  {media.status === "denied"
                    ? "Allow camera and microphone permissions in your browser, then try again."
                    : "CivicRound checks your signal locally before matchmaking."}
                </p>
                {!ready ? (
                  <button
                    type="button"
                    onClick={media.requestMedia}
                    disabled={media.status === "requesting"}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-wait disabled:opacity-60"
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
            Local only ? not recorded
          </div>

          {ready ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/55 p-1.5 shadow-xl backdrop-blur-md sm:bottom-4 sm:p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={media.toggleMicrophone}
                    aria-label={media.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
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

      <div className="mt-2 flex w-full max-w-5xl shrink-0 items-center justify-center gap-1.5 overflow-x-auto rounded-full border border-white/[0.06] bg-white/[0.025] p-1.5 text-[10px] sm:mt-3 sm:w-auto sm:gap-2 sm:p-2 sm:text-[11px]">
        <StatusChip label="Camera" ready={ready && media.cameraEnabled} />
        <StatusChip label="Microphone" ready={ready && media.microphoneEnabled} />
        {ready && media.microphoneEnabled ? (
          <span className="hidden border-x border-white/[0.07] px-2 sm:inline-flex">
            <AudioMeter stream={media.stream} enabled={media.microphoneEnabled} />
          </span>
        ) : null}
        <StatusChip label="Network" ready />
      </div>

      <div className="mt-2 grid w-full max-w-5xl shrink-0 grid-cols-[2.75rem_minmax(0,0.8fr)_minmax(0,1fr)] gap-2 sm:mt-3 sm:grid-cols-[3rem_minmax(10rem,0.7fr)_minmax(12rem,1fr)]">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          aria-label="Back to motion selection"
          className="h-11 rounded-full border border-white/[0.06] px-0 hover:border-white/10 sm:h-12"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={media.requestMedia}
          disabled={media.status === "requesting"}
          className="h-11 min-w-0 rounded-full border border-white/[0.08] px-2 text-[11px] text-foreground hover:border-primary/25 hover:bg-primary/[0.06] sm:h-12 sm:px-4 sm:text-xs"
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              media.status === "requesting" && "animate-spin",
            )}
          />
          <span className="sm:hidden">Run check</span>
          <span className="hidden sm:inline">
            {ready ? "Run check again" : "Run device check"}
          </span>
        </Button>
        <Button
          size="lg"
          onClick={onComplete}
          className="h-11 min-w-0 rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary px-2 font-semibold text-primary-foreground shadow-[0_0_24px_rgba(0,240,255,0.16)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_32px_rgba(0,240,255,0.28)] sm:h-12 sm:px-5"
        >
          <span className="sm:hidden">Continue</span>
          <span className="hidden sm:inline">Enter matchmaking</span>
          <ArrowRight className="ml-1 size-4" />
        </Button>
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
