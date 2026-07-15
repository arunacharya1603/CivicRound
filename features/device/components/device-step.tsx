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
    <section className="screen-enter mx-auto max-w-5xl">
      <div className="mb-6 border-b border-border pb-5">
        <p className="font-mono text-[10px] uppercase text-primary">Pre-match check / Signal</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Camera. Voice. Ready.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your feed is never recorded in this showcase. Verify the frame and sound before entering matchmaking.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative aspect-video overflow-hidden rounded border border-border bg-black">
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
                  {media.cameraEnabled ? <Video className="size-6 text-muted-foreground" /> : <CameraOff className="size-6 text-muted-foreground" />}
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

          <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/80 px-2 py-1 font-mono text-[9px] uppercase">
            <span className={cn("size-1.5 rounded-full", ready ? "bg-secondary" : "bg-muted-foreground")} />
            {ready ? "Local preview" : "Offline"}
          </div>

          {ready ? (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded border border-border bg-black/85 p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={media.microphoneEnabled ? "outline" : "destructive"}
                    onClick={media.toggleMicrophone}
                    aria-label={media.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
                  >
                    {media.microphoneEnabled ? <Mic /> : <MicOff />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{media.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={media.cameraEnabled ? "outline" : "destructive"}
                    onClick={media.toggleCamera}
                    aria-label={media.cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  >
                    {media.cameraEnabled ? <Camera /> : <CameraOff />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{media.cameraEnabled ? "Turn camera off" : "Turn camera on"}</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <div className="border border-border bg-card p-5">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Readiness board</p>
            <div className="mt-5 grid gap-3">
              <StatusRow label="Camera" ready={ready && media.cameraEnabled} />
              <StatusRow label="Microphone" ready={ready && media.microphoneEnabled} />
              <StatusRow label="Connection" ready />
            </div>
          </div>

          <Button
            size="lg"
            onClick={media.requestMedia}
            disabled={media.status === "requesting"}
            variant={ready ? "outline" : "default"}
            className="w-full"
          >
            {ready ? <RefreshCw /> : <Camera />}
            {ready ? "Run check again" : "Enable camera & microphone"}
          </Button>

          <Button size="lg" onClick={onComplete} className="w-full">
            Enter matchmaking
            <ArrowRight />
          </Button>

          {!ready ? (
            <p className="text-center text-xs leading-5 text-muted-foreground">
              You can continue camera-off and enable it inside the room.
            </p>
          ) : null}

          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft />
            Back
          </Button>
        </aside>
      </div>
    </section>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
      <span>{label}</span>
      <span className={cn("inline-flex items-center gap-1.5 font-mono text-[9px] uppercase", ready ? "text-secondary" : "text-muted-foreground")}>
        {ready ? <CheckCircle2 className="size-3.5" /> : <span className="size-1.5 rounded-full bg-muted-foreground" />}
        {ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}
