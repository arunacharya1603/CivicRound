import type {
  DebateRoomOutcome,
  DebateScorecard,
  DebateSession,
  DebateSetup,
  SpeakerOrder,
  StoredJudgeScorecard,
} from "@/features/debate/types/debate.types";

function stableSeed(value: string) {
  return [...value].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) % 997,
    17,
  );
}

export function buildDebateScorecard({
  session,
  setup,
  outcome,
}: {
  session: DebateSession;
  setup: DebateSetup;
  outcome: DebateRoomOutcome;
}): DebateScorecard {
  if (outcome !== "complete") {
    return {
      winner: "opponent",
      confidence: 100,
      summary:
        outcome === "forfeit"
          ? "The round was awarded to the opponent after an early exit."
          : "No argument verdict was issued because the round did not finish.",
      categories: [
        { id: "reasoning", label: "Logical consistency", you: 0, opponent: 0 },
        { id: "evidence", label: "Use of evidence", you: 0, opponent: 0 },
        { id: "rebuttal", label: "Direct rebuttal", you: 0, opponent: 0 },
        { id: "clarity", label: "Clarity", you: 0, opponent: 0 },
      ],
      strengths: [],
      nextSteps: ["Complete every timed turn before leaving a rated fight."],
      ratingDelta: setup.isRated && outcome === "forfeit" ? -24 : 0,
    };
  }

  const seed = stableSeed(session.id + setup.topicId + setup.stance);
  const categories = [
    {
      id: "reasoning" as const,
      label: "Logical consistency",
      you: 15 + (seed % 5),
      opponent: 14 + ((seed + 2) % 5),
    },
    {
      id: "evidence" as const,
      label: "Use of evidence",
      you: 14 + ((seed + 1) % 6),
      opponent: 14 + ((seed + 4) % 6),
    },
    {
      id: "rebuttal" as const,
      label: "Direct rebuttal",
      you: 15 + ((seed + 3) % 5),
      opponent: 14 + ((seed + 1) % 5),
    },
    {
      id: "clarity" as const,
      label: "Clarity",
      you: 16 + ((seed + 2) % 4),
      opponent: 15 + ((seed + 3) % 4),
    },
  ];
  const yourTotal = categories.reduce((total, item) => total + item.you, 0);
  const opponentTotal = categories.reduce(
    (total, item) => total + item.opponent,
    0,
  );
  const winner =
    yourTotal === opponentTotal
      ? "draw"
      : yourTotal > opponentTotal
        ? "you"
        : "opponent";

  return {
    winner,
    confidence: 78 + (seed % 13),
    summary:
      setup.mode === "practice"
        ? "Your structure was clear. The next improvement is to answer the strongest opposing claim earlier."
        : winner === "you"
          ? "Your argument won on structure and direct engagement with the opposing case."
          : winner === "opponent"
            ? "The opposing case edged the round through stronger rebuttal and evidence."
            : "The arguments finished level across the scored criteria.",
    categories,
    strengths: ["Clear position from the opening", "Stayed within timed turns"],
    nextSteps: [
      "Lead with one concrete piece of evidence.",
      "Name and answer the opponent's strongest claim directly.",
    ],
    ratingDelta:
      setup.isRated && winner !== "draw" ? (winner === "you" ? 18 : -16) : 0,
  };
}

export function buildPersistedDebateScorecard({
  scorecard,
  speakerOrder,
  ratingDelta,
}: {
  scorecard: StoredJudgeScorecard;
  speakerOrder: SpeakerOrder;
  ratingDelta: number;
}): DebateScorecard {
  const yourScore = scorecard.speakers.find(
    (speaker) => speaker.speakerOrder === speakerOrder,
  );
  const opponentScore = scorecard.speakers.find(
    (speaker) => speaker.speakerOrder !== speakerOrder,
  );
  if (!yourScore || !opponentScore) {
    throw new Error("The stored judge scorecard is incomplete.");
  }

  const winner =
    scorecard.verdict === "draw"
      ? "draw"
      : (scorecard.verdict === "speaker_1" && speakerOrder === 1) ||
          (scorecard.verdict === "speaker_2" && speakerOrder === 2)
        ? "you"
        : "opponent";

  return {
    winner,
    confidence: scorecard.confidence,
    summary: scorecard.summary,
    categories: [
      {
        id: "reasoning",
        label: "Logical consistency",
        you: yourScore.reasoning,
        opponent: opponentScore.reasoning,
      },
      {
        id: "evidence",
        label: "Evidence quality",
        you: yourScore.evidence,
        opponent: opponentScore.evidence,
      },
      {
        id: "rebuttal",
        label: "Direct rebuttal",
        you: yourScore.rebuttal,
        opponent: opponentScore.rebuttal,
      },
      {
        id: "clarity",
        label: "Clarity and structure",
        you: yourScore.clarity,
        opponent: opponentScore.clarity,
      },
      {
        id: "ruleAdherence",
        label: "Rule adherence",
        you: yourScore.ruleAdherence,
        opponent: opponentScore.ruleAdherence,
      },
    ],
    strengths: yourScore.strengths,
    nextSteps: yourScore.improvements,
    ratingDelta,
    decidingFactors: scorecard.decidingFactors,
    citations: scorecard.citations,
    judgeLabel: "AI Judge Beta · " + scorecard.model,
  };
}
