"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Flag,
  LogOut,
  Mic,
  MicOff,
  Radio,
  Signal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DebateTopic } from "@/features/debate/types/debate.types";
import { buildDebatePhases } from "@/features/debate/lib/debate-phases";
import type {
  DebateSession,
  DebateSetup,
  GuestProfile,
} from "@/features/debate/types/debate.types";
import { ReportDialog } from "@/features/reporting/components/report-dialog";
import type { MediaDeviceController } from "@/hooks/use-media-devices";
import { useDebateTimer } from "@/hooks/use-debate-timer";
import { cn } from "@/lib/utils";


export function DebateRoom({
  profile,
  topic,
  setup,
  session,
  media,
  onComplete,
}: {
  profile: GuestProfile;
  topic: DebateTopic;
  setup: DebateSetup;
  session: DebateSession;
  media: MediaDeviceController;
  onComplete: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const phases = useMemo(
    () => buildDebatePhases(setup.duration, session.speakerOrder),
    [session.speakerOrder, setup.duration],
  );
  const timer = useDebateTimer(phases, onComplete);
  const isYourTurn = !timer.running || timer.currentPhase?.speaker === "you";

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = media.stream;
    }
  }, [media.stream]);

  const time = String(timer.secondsLeft).padStart(2, "0");

  return (
    <section className="screen-enter mx-auto max-w-[1440px] px-3 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase text-muted-foreground">{topic.category} / Live motion</p>
          <h1 className="mt-1 truncate font-display text-lg font-semibold sm:text-2xl">{topic.statement}</h1>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase text-accent">{timer.running ? timer.currentPhase.label : "Round ready"}</p>
            <p className="font-mono text-3xl font-semibold tabular-nums">00:{time}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
            <Flag />
            <span className="hidden sm:inline">Report</span>
          </Button>
        </div>
      </div>

      <Progress value={timer.phaseProgress} className="h-1 rounded-none bg-border [&>div]:bg-accent" />

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <VideoPlate
          name={profile.displayName}
          stance={setup.stance}
          active={timer.running && isYourTurn}
          status={timer.running && isYourTurn ? "Speaking now" : "You"}
          accent="primary"
        >
          {media.stream && media.cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
          ) : (
            <InitialFeed name={profile.displayName} />
          )}
        </VideoPlate>

        <VideoPlate
          name={session.opponentName}
          stance={session.opponentStance}
          active={timer.running && !isYourTurn}
          status={timer.running && !isYourTurn ? "Speaking now" : session.source === "demo" ? "Demo feed" : "Connected"}
          accent="accent"
        >
          <InitialFeed name={session.opponentName} signal />
        </VideoPlate>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className={cn(
                "bg-card px-3 py-3 font-mono text-[9px] uppercase text-muted-foreground",
                index === timer.phaseIndex && timer.running && "bg-primary text-primary-foreground",
                index < timer.phaseIndex && "text-secondary",
              )}
            >
              <span className="mr-2">0{index + 1}</span>
              {phase.label}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 rounded border border-border bg-card p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant={media.microphoneEnabled ? "ghost" : "destructive"} onClick={media.toggleMicrophone} aria-label="Toggle microphone">
                {media.microphoneEnabled ? <Mic /> : <MicOff />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Microphone</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant={media.cameraEnabled ? "ghost" : "destructive"} onClick={media.toggleCamera} aria-label="Toggle camera">
                {media.cameraEnabled ? <Camera /> : <CameraOff />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Camera</TooltipContent>
          </Tooltip>
          <div className="mx-1 h-6 w-px bg-border" />
          {!timer.running ? (
            <Button onClick={timer.start}>
              <Radio />
              Go live
            </Button>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="destructive" onClick={onComplete} aria-label="Leave room">
                <LogOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave room</TooltipContent>
          </Tooltip>
        </div>
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

function VideoPlate({
  name,
  stance,
  status,
  active,
  accent,
  children,
}: {
  name: string;
  stance: "support" | "challenge";
  status: string;
  active: boolean;
  accent: "primary" | "accent";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded border-2 bg-black",
        active
          ? accent === "primary"
            ? "border-primary"
            : "border-accent"
          : "border-border",
      )}
    >
      {children}
      <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/85 px-2 py-1 font-mono text-[9px] uppercase">
        <span className={cn("size-1.5 rounded-full", active ? "live-dot bg-primary" : "bg-muted-foreground")} />
        {status}
      </div>
      <div className="absolute bottom-3 left-3 bg-black/85 px-3 py-2">
        <p className="font-display text-sm font-semibold">{name}</p>
        <p className={cn("font-mono text-[8px] uppercase", stance === "support" ? "text-secondary" : "text-accent")}>
          {stance}
        </p>
      </div>
    </div>
  );
}

function InitialFeed({ name, signal = false }: { name: string; signal?: boolean }) {
  return (
    <div className="grid h-full place-items-center bg-[#0f1313]">
      <div className="text-center">
        <div className="mx-auto grid size-24 place-items-center rounded-full border border-border bg-card font-display text-4xl font-semibold text-muted-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
        {signal ? (
          <div className="mt-5 flex items-end justify-center gap-1 text-secondary">
            {[10, 22, 15, 28, 17].map((height, index) => (
              <span key={index} className="w-1 bg-current" style={{ height }} />
            ))}
          </div>
        ) : (
          <Signal className="mx-auto mt-5 size-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
