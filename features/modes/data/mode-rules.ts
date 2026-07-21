import type { MatchMode } from "@/features/debate/types/debate.types";

export interface ModeRuleSet {
  id: MatchMode;
  name: string;
  eyebrow: string;
  description: string;
  ratingLabel: string;
  requiresAccount: boolean;
  allowsGuests: boolean;
  features: readonly string[];
}

export const MODE_RULES: Record<MatchMode, ModeRuleSet> = {
  casual: {
    id: "casual",
    name: "Casual Fight",
    eyebrow: "Open matchmaking",
    description:
      "A complete competitive round without permanent rating pressure.",
    ratingLabel: "Unrated",
    requiresAccount: false,
    allowsGuests: true,
    features: [
      "Guest identity allowed",
      "Public matchmaking",
      "Scorecard included",
    ],
  },
  ranked: {
    id: "ranked",
    name: "Ranked Fight",
    eyebrow: "Competitive queue",
    description:
      "Rating-matched debates with a recorded verdict and competitive consequences.",
    ratingLabel: "Rating changes",
    requiresAccount: true,
    allowsGuests: false,
    features: [
      "Persistent account required",
      "AI judge verdict",
      "Forfeit penalties",
    ],
  },
  challenge: {
    id: "challenge",
    name: "Challenge a Friend",
    eyebrow: "Private link",
    description:
      "Set the motion and rules, then send one direct challenge link.",
    ratingLabel: "Rated or unrated",
    requiresAccount: false,
    allowsGuests: true,
    features: [
      "Shareable challenge link",
      "Direct rematch",
      "Custom duration",
    ],
  },
  practice: {
    id: "practice",
    name: "AI Practice",
    eyebrow: "Private training",
    description:
      "Rehearse a full timed round against a clearly identified AI opponent.",
    ratingLabel: "No rating changes",
    requiresAccount: false,
    allowsGuests: true,
    features: [
      "Adjustable difficulty",
      "Practice feedback",
      "No human matchmaking",
    ],
  },
};

export function modeAffectsRating(mode: MatchMode, isRated: boolean) {
  return mode === "ranked" || (mode === "challenge" && isRated);
}

export function modeRequiresAccount(mode: MatchMode, isRated = false) {
  return mode === "ranked" || (mode === "challenge" && isRated);
}
