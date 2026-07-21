export type AppStage =
  | "modes"
  | "profile"
  | "account"
  | "round"
  | "device"
  | "match"
  | "room"
  | "results";

export type DebateDuration = 60 | 120;
export type DebateStance = "support" | "challenge";
export type MatchMode = "casual" | "ranked" | "challenge" | "practice";
export type AiDifficulty = "rookie" | "challenger" | "expert";
export type SpeakerOrder = 1 | 2;
export type DebateRoomStatus = "ready" | "live" | "complete" | "cancelled";
export type DebateRoomOutcome = "complete" | "cancelled" | "forfeit";

export interface DebateMediaPreferences {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  judgeConsent: boolean;
}

export interface GuestProfile {
  id: string;
  displayName: string;
  isAnonymous: true;
}

export interface MemberProfile {
  id: string;
  displayName: string;
  handle: string;
  isAnonymous: false;
  rating: number;
  matchesPlayed: number;
  provisional: boolean;
}

export type ParticipantProfile = GuestProfile | MemberProfile;

export interface DebateTopic {
  id: string;
  category: string;
  statement: string;
  context: string;
}

export interface DebateSetup {
  mode: MatchMode;
  isRated: boolean;
  topicId: string;
  stance: DebateStance;
  duration: DebateDuration;
  aiDifficulty?: AiDifficulty;
  inviteCode?: string;
}

export interface DebateSession {
  id: string;
  roomName: string;
  opponentId: string | null;
  opponentName: string;
  opponentStance: DebateStance;
  speakerOrder: SpeakerOrder;
  source: "demo" | "live" | "ai";
  mode: MatchMode;
  isRated: boolean;
  ratingBefore?: number;
  opponentRating?: number;
}

export interface DebateScoreCategory {
  id:
    | "reasoning"
    | "evidence"
    | "rebuttal"
    | "clarity"
    | "ruleAdherence";
  label: string;
  you: number;
  opponent: number;
}

export interface DebateScorecard {
  winner: "you" | "opponent" | "draw";
  confidence: number;
  summary: string;
  categories: DebateScoreCategory[];
  strengths: string[];
  nextSteps: string[];
  ratingDelta: number;
  decidingFactors?: string[];
  citations?: StoredJudgeCitation[];
  judgeLabel?: string;
}

export interface MatchHistoryEntry {
  id: string;
  playedAt: string;
  mode: MatchMode;
  isRated: boolean;
  topic: string;
  stance: DebateStance;
  opponentName: string;
  outcome: DebateRoomOutcome;
  verdict: DebateScorecard["winner"] | "no-verdict";
  ratingDelta: number;
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

export type DebateJudgeStatus =
  | "not_requested"
  | "collecting"
  | "queued"
  | "processing"
  | "complete"
  | "failed"
  | "no_decision"
  | "not_required";

export interface StoredJudgeSpeakerScore {
  speakerOrder: SpeakerOrder;
  reasoning: number;
  evidence: number;
  rebuttal: number;
  clarity: number;
  ruleAdherence: number;
  strengths: string[];
  improvements: string[];
  total: number;
}

export interface StoredJudgeCitation {
  speakerOrder: SpeakerOrder;
  phaseId: string;
  excerpt: string;
  explanation: string;
}

export interface StoredJudgeScorecard {
  version: number;
  provider: "gemini" | "groq";
  model: string;
  promptVersion: string;
  verdict: "speaker_1" | "speaker_2" | "draw" | "no_decision";
  confidence: number;
  summary: string;
  noDecisionReason: string;
  decidingFactors: string[];
  speakers: StoredJudgeSpeakerScore[];
  citations: StoredJudgeCitation[];
  rubric: {
    reasoning: number;
    evidence: number;
    rebuttal: number;
    clarity: number;
    ruleAdherence: number;
  };
}

export interface DebateJudgeResult {
  status: DebateJudgeStatus;
  scorecard: StoredJudgeScorecard | null;
  ratingDelta: number | null;
  ratingAfter: number | null;
  ratingProcessedAt: string | null;
  winnerUserId: string | null;
  currentRating: number | null;
  currentMatchesPlayed: number | null;
}
