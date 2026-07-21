"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  Flag,
  LoaderCircle,
  MessageSquareQuote,
  RefreshCw,
  Scale,
  Send,
  Sparkles,
  Swords,
  TimerReset,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { syncMemberIdentity } from "@/features/auth/services/member-auth.service";
import {
  buildDebateScorecard,
  buildPersistedDebateScorecard,
} from "@/features/debate/services/scorecard.service";
import { ensureDebateJudgeResult } from "@/features/debate/services/judge.service";
import type {
  DebateRoomOutcome,
  DebateSession,
  DebateSetup,
  DebateTopic,
  MemberProfile,
  ParticipantProfile,
} from "@/features/debate/types/debate.types";
import {
  recordMatchHistory,
  submitMatchAppeal,
} from "@/features/history/services/match-history.service";
import { MODE_RULES } from "@/features/modes/data/mode-rules";
import { submitRoundFeedback } from "@/features/reporting/services/feedback.service";
import { cn } from "@/lib/utils";

const FEEDBACK = [
  ["respectful", "Respectful", Check],
  ["clear", "Clear argument", MessageSquareQuote],
  ["thoughtful", "Thought-provoking", Sparkles],
] as const;

export function ResultsStep({
  profile,
  topic,
  setup,
  session,
  outcome,
  onRatingApplied,
  onRematch,
  onNewRound,
}: {
  profile: ParticipantProfile;
  topic: DebateTopic;
  setup: DebateSetup;
  session: DebateSession;
  outcome: DebateRoomOutcome;
  onRatingApplied: (profile: MemberProfile) => void;
  onRematch: () => void;
  onNewRound: () => void;
}) {
  const completed = outcome === "complete";
  const isPractice = setup.mode === "practice";
  const usesModelJudge = session.source === "live" && completed;
  const fallbackScorecard = useMemo(
    () => buildDebateScorecard({ session, setup, outcome }),
    [outcome, session, setup],
  );
  const judge = useQuery({
    queryKey: ["debate-judge-result", session.id],
    queryFn: () => ensureDebateJudgeResult(session.id),
    enabled: usesModelJudge,
    retry: 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "complete" ||
        status === "no_decision" ||
        status === "failed" ||
        status === "not_required"
        ? false
        : 2_000;
    },
  });
  const persistedScorecard = useMemo(() => {
    if (
      !usesModelJudge ||
      judge.data?.status !== "complete" ||
      !judge.data.scorecard
    ) {
      return null;
    }
    return buildPersistedDebateScorecard({
      scorecard: judge.data.scorecard,
      speakerOrder: session.speakerOrder,
      ratingDelta: judge.data.ratingDelta ?? 0,
    });
  }, [
    judge.data?.ratingDelta,
    judge.data?.scorecard,
    judge.data?.status,
    session.speakerOrder,
    usesModelJudge,
  ]);
  const scorecard = persistedScorecard ?? fallbackScorecard;
  const judgeNotRequired =
    usesModelJudge && judge.data?.status === "not_required";
  const judgePending =
    usesModelJudge &&
    !judge.error &&
    judge.data?.status !== "complete" &&
    judge.data?.status !== "no_decision" &&
    judge.data?.status !== "failed" &&
    judge.data?.status !== "not_required";
  const judgeNoDecision =
    usesModelJudge &&
    (judge.data?.status === "no_decision" ||
      judge.data?.status === "failed" ||
      Boolean(judge.error));
  const hasArgumentScorecard =
    completed && !judgePending && !judgeNoDecision && !judgeNotRequired;
  const resolvedWinner =
    judgeNotRequired && judge.data?.winnerUserId
      ? judge.data.winnerUserId === profile.id
        ? "you"
        : "opponent"
      : scorecard.winner;
  const resolvedRatingDelta = usesModelJudge
    ? judge.data?.ratingDelta ?? 0
    : scorecard.ratingDelta;
  const recordedRef = useRef(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  const feedbackSubmission = useMutation({
    mutationFn: () =>
      submitRoundFeedback({
        roomId: session.id,
        tags: feedback,
      }),
  });
  const appealSubmission = useMutation({
    mutationFn: () =>
      submitMatchAppeal({
        matchId: session.id,
        reason: appealReason,
        source: session.source,
      }),
    onSuccess: () => {
      setAppealOpen(false);
      setAppealSubmitted(true);
    },
  });

  useEffect(() => {
    if (
      recordedRef.current ||
      judgePending ||
      (usesModelJudge && Boolean(judge.error))
    ) {
      return;
    }
    recordedRef.current = true;

    const result = recordMatchHistory(
      {
        id: session.id,
        playedAt: new Date().toISOString(),
        mode: setup.mode,
        isRated: setup.isRated,
        topic: topic.statement,
        stance: setup.stance,
        opponentName: session.opponentName,
        outcome,
        verdict:
          completed && !judgeNoDecision ? resolvedWinner : "no-verdict",
        ratingDelta: judgeNoDecision ? 0 : resolvedRatingDelta,
      },
      profile.isAnonymous || usesModelJudge ? null : profile,
    );

    if (
      usesModelJudge &&
      !profile.isAnonymous &&
      judge.data?.currentRating != null &&
      judge.data.currentMatchesPlayed != null
    ) {
      onRatingApplied(
        syncMemberIdentity({
          ...profile,
          rating: judge.data.currentRating,
          matchesPlayed: judge.data.currentMatchesPlayed,
          provisional: judge.data.currentMatchesPlayed < 5,
        }),
      );
    } else if (result.member) {
      onRatingApplied(result.member);
    }
  }, [
    completed,
    judge.data?.currentMatchesPlayed,
    judge.data?.currentRating,
    judge.error,
    judgeNoDecision,
    judgePending,
    onRatingApplied,
    outcome,
    profile,
    resolvedRatingDelta,
    resolvedWinner,
    session.id,
    session.opponentName,
    setup.isRated,
    setup.mode,
    setup.stance,
    topic.statement,
    usesModelJudge,
  ]);

  const yourTotal = scorecard.categories.reduce(
    (total, category) => total + category.you,
    0,
  );
  const opponentTotal = scorecard.categories.reduce(
    (total, category) => total + category.opponent,
    0,
  );

  return (
    <section className="screen-enter mx-auto max-w-[1280px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="grid gap-7 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-primary/40 px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-primary">
              {MODE_RULES[setup.mode].name}
            </span>
            <span
              className={cn(
                "border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.12em]",
                setup.isRated
                  ? "border-amber-400/40 text-amber-300"
                  : "border-border text-muted-foreground",
              )}
            >
              {setup.isRated ? "Rating affected" : "Rating protected"}
            </span>
          </div>

          <h1 className="mt-5 font-editorial text-[clamp(3.5rem,7vw,7rem)] font-medium leading-[0.86] tracking-[-0.05em]">
            {isPractice
              ? "Practice reviewed."
              : outcome === "forfeit"
                ? "Fight forfeited."
                : judgeNotRequired
                  ? resolvedWinner === "you"
                    ? "Fight awarded."
                    : "Fight forfeited."
                : judgePending
                  ? "Judge reviewing."
                  : judgeNoDecision
                    ? "No AI verdict issued."
                : completed
                  ? resolvedWinner === "you"
                    ? "You won the argument."
                    : resolvedWinner === "opponent"
                      ? "The other side won."
                      : "The round is a draw."
                  : "Round ended early."}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {judgeNotRequired
              ? resolvedWinner === "you"
                ? "The opponent forfeited. The database settled the penalty without asking the AI judge to invent an argument verdict."
                : "The round was settled under the forfeit rule without an AI argument verdict."
              : judgePending
              ? "The server is securing both transcripts and running the model-backed rubric. No winner or rating change exists until settlement completes."
              : judgeNoDecision
                ? judge.error instanceof Error
                  ? judge.error.message
                  : judge.data?.scorecard?.noDecisionReason ||
                    "The available transcript could not support a fair verdict. Ratings were not changed."
                : scorecard.summary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border border-border bg-border">
          <ResultStat
            icon={TimerReset}
            value={
              completed
                ? setup.duration === 60
                  ? "01:00"
                  : "02:00"
                : "No result"
            }
            label={completed ? "Round time" : "Round status"}
            tone="primary"
          />
          <ResultStat
            icon={setup.isRated ? Trophy : Swords}
            value={
              judgePending
                ? "Pending"
                : judgeNoDecision
                  ? "0"
                  : setup.isRated
                ? `${resolvedRatingDelta > 0 ? "+" : ""}${resolvedRatingDelta}`
                : "0"
            }
            label={judgePending ? "Rating settlement" : "Rating change"}
            tone={
              judgePending || resolvedRatingDelta >= 0
                ? "secondary"
                : "danger"
            }
          />
        </div>
      </header>

      <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Motion debated
            </p>
            <div className="mt-3 border-l-2 border-primary bg-[#111118] p-5 sm:p-7">
              <p className="max-w-3xl font-editorial text-3xl leading-tight tracking-[-0.025em]">
                {topic.statement}
              </p>
            </div>
          </div>

          <section className="mt-8 border border-border bg-[#0f0f15]">
            <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.13em] text-primary">
                  {outcome !== "complete"
                    ? "Round disposition"
                    : judgeNotRequired
                      ? "Forfeit settlement"
                    : judgePending
                      ? "AI judge processing"
                      : judgeNoDecision
                        ? "AI judge no-decision"
                    : isPractice
                      ? "Practice analysis"
                      : session.source === "demo"
                        ? "Judge simulation"
                        : "AI Judge Beta"}
                </p>
                <h2 className="mt-1 text-sm font-semibold">
                  {hasArgumentScorecard
                    ? "Argument scorecard"
                    : judgePending
                      ? "Transcripts and rubric are being processed"
                      : "No judge score issued"}
                </h2>
              </div>
              {judgePending ? (
                <LoaderCircle className="size-5 animate-spin text-primary" />
              ) : isPractice ? (
                <Bot className="size-5 text-primary" strokeWidth={1.5} />
              ) : (
                <Scale className="size-5 text-primary" strokeWidth={1.5} />
              )}
            </header>

            {hasArgumentScorecard ? (
              <>
                <div className="grid grid-cols-[1fr_62px_62px] border-b border-border px-5 py-3 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-[1fr_82px_82px] sm:px-6">
                  <span>Criteria</span>
                  <span className="text-center text-primary">You</span>
                  <span className="text-center">Opponent</span>
                </div>

                <div className="px-5 sm:px-6">
                  {scorecard.categories.map((category) => (
                    <div
                      key={category.id}
                      className="grid grid-cols-[1fr_62px_62px] items-center border-b border-border py-4 last:border-b-0 sm:grid-cols-[1fr_82px_82px]"
                    >
                      <div>
                        <p className="text-xs font-medium sm:text-sm">
                          {category.label}
                        </p>
                        <div className="mt-2 h-1 max-w-64 bg-border">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(
                                100,
                                (category.you /
                                  getCategoryMaximum(category.id)) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-center font-mono text-lg font-semibold text-primary">
                        {category.you}
                      </span>
                      <span className="text-center font-mono text-lg font-semibold text-muted-foreground">
                        {category.opponent}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 border-t border-border">
                  <div className="border-r border-border px-5 py-5 sm:px-6">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                      Your total
                    </p>
                    <p className="mt-1 font-editorial text-4xl text-primary">
                      {yourTotal}
                    </p>
                  </div>
                  <div className="px-5 py-5 sm:px-6">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                      Opponent total
                    </p>
                    <p className="mt-1 font-editorial text-4xl">
                      {opponentTotal}
                    </p>
                  </div>
                </div>

                {scorecard.judgeLabel ? (
                  <div className="border-t border-border px-5 py-5 sm:px-6">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-primary">
                      {scorecard.judgeLabel} · confidence {scorecard.confidence}%
                    </p>
                    {scorecard.decidingFactors?.length ? (
                      <ul className="mt-3 space-y-2">
                        {scorecard.decidingFactors.map((factor) => (
                          <li
                            key={factor}
                            className="text-xs leading-5 text-muted-foreground"
                          >
                            {factor}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {scorecard.citations?.length ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {scorecard.citations.slice(0, 4).map((citation) => (
                          <blockquote
                            key={
                              citation.phaseId +
                              citation.speakerOrder +
                              citation.excerpt
                            }
                            className="border-l border-primary/50 bg-primary/[0.05] px-3 py-2"
                          >
                            <p className="text-xs leading-5">
                              “{citation.excerpt}”
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                              {citation.explanation}
                            </p>
                          </blockquote>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="px-5 py-6 sm:px-6">
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {judgePending
                    ? "CivicRound is waiting for every consented turn transcript, then one stored model verdict will be settled by the database."
                    : judgeNotRequired
                      ? "The database applied the mode's forfeit rule. No AI argument score was generated."
                    : judgeNoDecision
                      ? "No winner was invented and no rating was changed because the model-backed judge could not issue a fair verdict."
                      : "Argument criteria are scored only after every timed turn is completed. This result records the early exit without inventing a judge verdict."}
                </p>
              </div>
            )}
          </section>

          {isPractice ? (
            <PracticeFeedback
              strengths={scorecard.strengths}
              nextSteps={scorecard.nextSteps}
            />
          ) : completed ? (
            <OpponentFeedback
              feedback={feedback}
              onChange={(nextFeedback) => {
                feedbackSubmission.reset();
                setFeedback(nextFeedback);
              }}
              onSubmit={() => feedbackSubmission.mutate()}
              pending={feedbackSubmission.isPending}
              success={feedbackSubmission.isSuccess}
              error={Boolean(feedbackSubmission.error)}
            />
          ) : null}
        </div>

        <aside className="border-y border-border py-5 lg:sticky lg:top-24">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {isPractice ? "Practice opponent" : "Opponent"}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={cn(
                "grid size-11 place-items-center rounded-full font-editorial text-lg",
                isPractice
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : "bg-accent text-accent-foreground",
              )}
            >
              {isPractice ? (
                <Bot className="size-5" />
              ) : (
                session.opponentName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {session.opponentName}
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-accent">
                {isPractice
                  ? "AI — not a human"
                  : session.opponentRating
                    ? `Rating ${session.opponentRating}`
                    : session.opponentStance === "support"
                      ? "Support"
                      : "Against"}
              </p>
            </div>
          </div>

          {judgePending ? (
            <div className="mt-5 border border-primary/25 bg-primary/[0.05] p-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-primary">
                Settlement pending
              </p>
              <p className="mt-2 text-sm font-semibold">
                No rating has changed yet
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The database applies Elo only after a stored model verdict.
              </p>
            </div>
          ) : judgeNoDecision ? (
            <div className="mt-5 border border-border p-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                Judge no-decision
              </p>
              <p className="mt-2 text-sm font-semibold">Rating unchanged</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                CivicRound does not settle a competitive result without a valid
                transcript-backed verdict.
              </p>
            </div>
          ) : setup.isRated && !profile.isAnonymous ? (
            <div className="mt-5 border border-border p-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                Rating movement
              </p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-sm text-muted-foreground">
                  {session.ratingBefore ?? profile.rating}
                </span>
                <ChevronRight className="mb-1 size-4 text-muted-foreground" />
                <span
                  className={cn(
                    "font-editorial text-3xl",
                    resolvedRatingDelta >= 0
                      ? "text-emerald-400"
                      : "text-destructive",
                  )}
                >
                  {(session.ratingBefore ?? profile.rating) +
                    resolvedRatingDelta}
                </span>
              </div>
              {outcome === "forfeit" ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="size-3.5" />
                  Standard forfeit penalty applied.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 border border-border p-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                Rating protection
              </p>
              <p className="mt-2 text-sm font-semibold">No permanent change</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This mode records the scorecard without changing competitive
                rating.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-2">
            <Button
              size="lg"
              onClick={onRematch}
              disabled={judgePending}
              className="w-full rounded-none"
            >
              <RefreshCw />
              {setup.mode === "challenge"
                ? "Challenge again"
                : setup.mode === "practice"
                  ? "Practice same motion"
                  : setup.mode === "ranked"
                    ? "Queue another ranked fight"
                    : "Find another opponent"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onNewRound}
              disabled={judgePending}
              className="w-full rounded-none"
            >
              Choose another mode
            </Button>
          </div>

          {setup.mode === "challenge" ? (
            <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
              Best-of-three series coming later
            </p>
          ) : null}

          {setup.isRated && !judgePending && !judgeNoDecision ? (
            <div className="mt-6 border-t border-border pt-5">
              {!appealOpen && !appealSubmitted ? (
                <button
                  type="button"
                  onClick={() => setAppealOpen(true)}
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Flag className="size-3.5" />
                  Appeal this result
                </button>
              ) : null}

              {appealOpen ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (appealReason.trim().length < 12) return;
                    appealSubmission.mutate();
                  }}
                >
                  <label className="text-xs font-semibold">
                    Appeal reason
                    <textarea
                      value={appealReason}
                      onChange={(event) => setAppealReason(event.target.value)}
                      minLength={12}
                      maxLength={500}
                      className="mt-2 min-h-24 w-full resize-none border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                      placeholder="Explain the scoring or conduct issue."
                    />
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      appealReason.trim().length < 12 ||
                      appealSubmission.isPending
                    }
                    className="mt-2 rounded-none"
                  >
                    {appealSubmission.isPending
                      ? "Submitting appeal..."
                      : "Submit appeal"}
                  </Button>
                  {appealSubmission.isError ? (
                    <p className="mt-3 text-xs leading-5 text-destructive">
                      {appealSubmission.error instanceof Error
                        ? appealSubmission.error.message
                        : "The appeal could not be submitted."}
                    </p>
                  ) : null}
                </form>
              ) : null}

              {appealSubmitted ? (
                <p className="flex items-center gap-2 text-xs text-emerald-400">
                  <Check className="size-3.5" />
                  Appeal submitted for review.
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function PracticeFeedback({
  strengths,
  nextSteps,
}: {
  strengths: string[];
  nextSteps: string[];
}) {
  return (
    <section className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2">
      <div className="bg-card p-5 sm:p-6">
        <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
          What worked
        </p>
        <ul className="mt-4 space-y-3">
          {strengths.map((strength) => (
            <li
              key={strength}
              className="flex gap-2 text-sm leading-6 text-muted-foreground"
            >
              <Check className="mt-1 size-4 shrink-0 text-emerald-400" />
              {strength}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-card p-5 sm:p-6">
        <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-primary">
          Next practice target
        </p>
        <ul className="mt-4 space-y-3">
          {nextSteps.map((step) => (
            <li
              key={step}
              className="flex gap-2 text-sm leading-6 text-muted-foreground"
            >
              <ChevronRight className="mt-1 size-4 shrink-0 text-primary" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OpponentFeedback({
  feedback,
  onChange,
  onSubmit,
  pending,
  success,
  error,
}: {
  feedback: string[];
  onChange: (feedback: string[]) => void;
  onSubmit: () => void;
  pending: boolean;
  success: boolean;
  error: boolean;
}) {
  return (
    <section className="mt-8 border-t border-border pt-7">
      <p className="text-sm font-semibold">Recognize the opponent</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Optional private feedback reinforces better competitive conduct.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {FEEDBACK.map(([id, label, Icon]) => {
          const selected = feedback.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected
                    ? feedback.filter((item) => item !== id)
                    : [...feedback, id],
                )
              }
              className={cn(
                "flex min-h-24 flex-col items-start justify-between border border-border bg-card p-4 text-left text-sm font-semibold transition-colors",
                selected && "border-primary bg-primary/15",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={onSubmit}
          disabled={!feedback.length || pending}
          className="rounded-none"
        >
          <Send />
          {pending ? "Saving" : success ? "Feedback saved" : "Send feedback"}
        </Button>
        {error ? (
          <span className="text-xs text-destructive">
            Feedback could not be saved.
          </span>
        ) : null}
      </div>
    </section>
  );
}

function ResultStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof TimerReset;
  value: string;
  label: string;
  tone: "primary" | "secondary" | "danger";
}) {
  return (
    <div className="bg-card p-4">
      <Icon
        className={cn(
          "size-4",
          tone === "primary" && "text-primary",
          tone === "secondary" && "text-emerald-400",
          tone === "danger" && "text-destructive",
        )}
      />
      <p className="mt-3 font-mono text-xl font-semibold">{value}</p>
      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function getCategoryMaximum(
  category: "reasoning" | "evidence" | "rebuttal" | "clarity" | "ruleAdherence",
) {
  if (category === "ruleAdherence") return 10;
  if (category === "rebuttal" || category === "clarity") return 20;
  return 25;
}
