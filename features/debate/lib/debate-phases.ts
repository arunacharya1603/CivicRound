import type {
  DebateDuration,
  DebatePhase,
  SpeakerOrder,
} from "@/features/debate/types/debate.types";

interface AbsolutePhase {
  id: string;
  action: "opening" | "closing";
  speakerOrder: SpeakerOrder;
  duration: number;
}

export function buildDebatePhases(
  duration: DebateDuration,
  currentSpeakerOrder: SpeakerOrder,
): DebatePhase[] {
  const phases: AbsolutePhase[] =
    duration === 60
      ? [
          { id: "speaker-one-opening", action: "opening", speakerOrder: 1, duration: 30 },
          { id: "speaker-two-opening", action: "opening", speakerOrder: 2, duration: 30 },
        ]
      : [
          { id: "speaker-one-opening", action: "opening", speakerOrder: 1, duration: 40 },
          { id: "speaker-two-opening", action: "opening", speakerOrder: 2, duration: 40 },
          { id: "speaker-one-closing", action: "closing", speakerOrder: 1, duration: 20 },
          { id: "speaker-two-closing", action: "closing", speakerOrder: 2, duration: 20 },
        ];

  return phases.map((phase) => {
    const isCurrentUser = phase.speakerOrder === currentSpeakerOrder;
    return {
      id: phase.id,
      label: `${isCurrentUser ? "Your" : "Their"} ${phase.action}`,
      speaker: isCurrentUser ? "you" : "opponent",
      duration: phase.duration,
    };
  });
}

export function getDebateDuration(phases: DebatePhase[]) {
  return phases.reduce((total, phase) => total + phase.duration, 0);
}
