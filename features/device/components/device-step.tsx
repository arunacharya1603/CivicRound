"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Mic,
  MicOff,
  RefreshCw,
  Signal,
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
  }, [media.stream]);

  return (
    <section className="screen-enter mx-auto max-w-6xl">
      <header className="mb-8 border-b border-border pb-7">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-primary">
          <Signal className="size-4" />
          Pre-match signal
        </div>
        <h1 className="text-balance mt-3 font-display text-4xl font-semibold leading-none sm:text-5xl">
          Check your frame and voice.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your feed is never recorded. Make sure your opponent can see and hear
          you before matchmaking begins.
        </p>
      </header>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
        <div className="relative aspect-video min-w-0 overflow-hidden rounded-sm border border-border bg-black">
          {ready && media.cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
          ) : (
            <div className="grid h-full place-items-center">
              <div className="text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-full border border-border bg-card">
                  {media.cameraEnabled ? (
                    <Video className="size-6 text-muted-foreground" />
                  ) : (
                    <CameraOff className="size-6 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">
                  {media.status === "requesting"
                    ? "Requesting signal"
                    : media.status === "denied"
                      ? "Permission blocked"
                      : "Camera signal pending"}
                </p>
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 flex h-7 items-center gap-2 rounded-sm border border-white/10 bg-black/80 px-2 text-[10px] font-semibold">
            <span
              className={cn(
                "size-1.5 rounded-full",
                ready ? "bg-secondary" : "bg-muted-foreground",
              )}
            />
            {ready ? "Local preview" : "Offline"}
          </div>

          {ready ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-white/10 bg-black/85 p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={
                      media.microphoneEnabled ? "outline" : "destructive"
                    }
                    onClick={media.toggleMicrophone}
                    aria-label={
                      media.microphoneEnabled
                        ? "Mute microphone"
                        : "Unmute microphone"
                    }
                  >
                    {media.microphoneEnabled ? <Mic /> : <MicOff />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {media.microphoneEnabled
                    ? "Mute microphone"
                    : "Unmute microphone"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={media.cameraEnabled ? "outline" : "destructive"}
                    onClick={media.toggleCamera}
                    aria-label={
                      media.cameraEnabled
                        ? "Turn camera off"
                        : "Turn camera on"
                    }
                  >
                    {media.cameraEnabled ? <Camera /> : <CameraOff />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {media.cameraEnabled ? "Turn camera off" : "Turn camera on"}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 border border-border bg-card xl:sticky xl:top-36">
          <div className="p-5">
            <p className="font-mono text-[9px] uppercase text-primary">
              Readiness
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              Signal board
            </h2>
            <div className="mt-5 divide-y divide-border border-y border-border">
              <StatusRow
                label="Camera"
                ready={ready && media.cameraEnabled}
              />
              <StatusRow
                label="Microphone"
                ready={ready && media.microphoneEnabled}
              />
              <StatusRow label="Connection" ready />
            </div>
          </div>

          <div className="grid gap-2 border-t border-border p-5">
            <Button
              size="lg"
              onClick={media.requestMedia}
              disabled={media.status === "requesting"}
              variant={ready ? "outline" : "default"}
              className="w-full"
            >
              {ready ? <RefreshCw /> : <Camera />}
              {ready ? "Run check again" : "Enable camera and mic"}
            </Button>

            <Button size="lg" onClick={onComplete} className="w-full">
              Enter matchmaking
              <ArrowRight />
            </Button>

            {!ready ? (
              <p className="px-2 py-2 text-center text-xs leading-5 text-muted-foreground">
                Camera-off entry is available. You can enable it in the room.
              </p>
            ) : null}

            <Button variant="ghost" onClick={onBack} className="w-full">
              <ArrowLeft />
              Back
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex min-h-12 items-center justify-between text-sm">
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-mono text-[9px] uppercase",
          ready ? "text-secondary" : "text-muted-foreground",
        )}
      >
        {ready ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <span className="size-1.5 rounded-full bg-muted-foreground" />
        )}
        {ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}
