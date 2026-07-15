export type AppStage =
  | "profile"
  | "round"
  | "device"
  | "match"
  | "room"
  | "results";

export type DebateDuration = 60 | 120;
export type DebateStance = "support" | "challenge";
export type SpeakerOrder = 1 | 2;
export type DebateRoomStatus = "ready" | "live" | "complete" | "cancelled";

export interface GuestProfile {
  id: string;
  displayName: string;
  isAnonymous: true;
}

export interface DebateTopic {
  id: string;
  category: string;
  statement: string;
  context: string;
}

export interface DebateSetup {
  topicId: string;
  stance: DebateStance;
  duration: DebateDuration;
  inviteCode?: string;
}

export interface DebateSession {
  id: string;
  roomName: string;
  opponentId: string | null;
  opponentName: string;
  opponentStance: DebateStance;
  speakerOrder: SpeakerOrder;
  source: "demo" | "live";
}

export interface DebatePhase {
  id: string;
  label: string;
  speaker: "you" | "opponent";
  duration: number;
}

export interface DebateRoomState {
  status: DebateRoomStatus;
  startedAt: string | null;
  endedAt: string | null;
  serverNow: string;
}
