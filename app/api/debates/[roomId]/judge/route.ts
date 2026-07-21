import { z } from 'zod';

import {
  buildStoredScorecard,
  callGeminiJudge,
  hashTranscripts,
  type JudgeTranscript,
} from '@/lib/judge/gemini';
import {
  authenticateRoomParticipant,
  createJudgeClients,
  GEMINI_JUDGE_MODEL,
  JUDGE_PROMPT_VERSION,
  judgeErrorResponse,
  judgeJson,
  JudgeRequestError,
} from '@/lib/judge/server';

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  let admin: ReturnType<typeof createJudgeClients>['admin'] | null = null;
  let roomId: string | null = null;
  let claimed = false;

  try {
    roomId = (await context.params).roomId;
    if (!z.string().uuid().safeParse(roomId).success) {
      throw new JudgeRequestError('Invalid debate room.', 400, 'invalid_room');
    }

    const participant = await authenticateRoomParticipant(request, roomId);
    if (participant.room.status !== 'complete') {
      throw new JudgeRequestError(
        'The debate must finish before judging.',
        409,
        'debate_not_complete',
      );
    }
    if (participant.room.judgeStatus === 'complete') {
      return judgeJson(
        { status: 'complete', scorecard: participant.room.scorecard },
        200,
      );
    }
    if (participant.room.judgeStatus === 'no_decision') {
      return judgeJson(
        { status: 'no_decision', scorecard: participant.room.scorecard },
        200,
      );
    }
    if (participant.room.judgeStatus === 'not_required') {
      return judgeJson({ status: 'not_required' }, 200);
    }

    const clients = createJudgeClients();
    admin = clients.admin;
    const participants = await admin
      .from('debate_participants')
      .select('user_id, speaker_order, stance, judge_consent_at')
      .eq('room_id', roomId)
      .order('speaker_order');
    const participantRows = participants.data ?? [];
    if (
      participants.error ||
      participantRows.length !== 2 ||
      participantRows.some((entry) => !entry.judge_consent_at)
    ) {
      throw new JudgeRequestError(
        'Both participants must consent before judging.',
        409,
        'judge_consent_pending',
      );
    }

    const transcriptResponse = await admin
      .from('debate_turn_transcripts')
      .select('phase_id, speaker_order, transcript, turn_sequence')
      .eq('room_id', roomId)
      .order('turn_sequence');
    if (transcriptResponse.error) {
      throw new JudgeRequestError(
        'Transcripts could not be loaded.',
        500,
        'transcripts_unavailable',
      );
    }
    const transcriptRows = transcriptResponse.data ?? [];
    const expectedTurnCount = participant.room.durationSeconds === 60 ? 2 : 4;
    if (transcriptRows.length < expectedTurnCount) {
      const completedForMs = participant.room.endedAt
        ? Date.now() - new Date(participant.room.endedAt).getTime()
        : 0;
      if (completedForMs >= 15_000) {
        const partialTranscripts = transcriptRows.map((entry) => ({
          phaseId: entry.phase_id,
          speakerOrder: entry.speaker_order,
          transcript: entry.transcript,
          turnSequence: entry.turn_sequence,
        })) as JudgeTranscript[];
        const transcriptHash = await hashTranscripts(partialTranscripts);
        const scorecard = {
          version: 1,
          provider: 'gemini',
          model: GEMINI_JUDGE_MODEL,
          promptVersion: JUDGE_PROMPT_VERSION,
          verdict: 'no_decision',
          confidence: 0,
          summary:
            'The round ended without every required turn transcript, so no winner was issued.',
          noDecisionReason: 'One or more timed speeches were not captured.',
          decidingFactors: [],
          speakers: [],
          citations: [],
          rubric: {
            reasoning: 25,
            evidence: 25,
            rebuttal: 20,
            clarity: 20,
            ruleAdherence: 10,
          },
        };
        await admin.from('debate_judge_runs').upsert(
          {
            room_id: roomId,
            status: 'no_decision',
            provider: 'gemini',
            model: GEMINI_JUDGE_MODEL,
            prompt_version: JUDGE_PROMPT_VERSION,
            transcript_hash: transcriptHash,
            error_code: 'missing_turn_transcripts',
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'room_id' },
        );
        await admin
          .from('debate_rooms')
          .update({
            scorecard,
            judge_model: GEMINI_JUDGE_MODEL,
            judge_prompt_version: JUDGE_PROMPT_VERSION,
          })
          .eq('id', roomId);
        await admin.rpc('finish_debate_judgement_without_verdict', {
          p_room_id: roomId,
          p_status: 'no_decision',
          p_error_code: 'missing_turn_transcripts',
        });
        return judgeJson({ status: 'no_decision', scorecard }, 200);
      }
      return judgeJson(
        {
          status: 'collecting',
          missingTurns: expectedTurnCount - transcriptRows.length,
        },
        202,
      );
    }

    const transcripts = transcriptRows.map((entry) => ({
      phaseId: entry.phase_id,
      speakerOrder: entry.speaker_order,
      transcript: entry.transcript,
      turnSequence: entry.turn_sequence,
    })) as JudgeTranscript[];
    const transcriptHash = await hashTranscripts(transcripts);

    const claim = await admin
      .from('debate_rooms')
      .update({
        judge_status: 'processing',
        judge_error_code: null,
      })
      .eq('id', roomId)
      .in('judge_status', [
        'not_requested',
        'collecting',
        'queued',
        'failed',
      ])
      .select('id')
      .maybeSingle();
    if (claim.error) {
      throw new JudgeRequestError(
        'The judge could not claim this debate.',
        500,
        'judge_claim_failed',
      );
    }
    if (!claim.data) {
      return judgeJson({ status: 'processing' }, 202);
    }
    claimed = true;

    const topic = await admin
      .from('debate_topics')
      .select('statement, context')
      .eq('id', participant.room.topicId)
      .single();
    if (topic.error || !topic.data) {
      throw new JudgeRequestError(
        'The debate motion could not be loaded.',
        500,
        'motion_unavailable',
      );
    }

    const run = await admin.from('debate_judge_runs').upsert(
      {
        room_id: roomId,
        status: 'processing',
        provider: 'gemini',
        model: GEMINI_JUDGE_MODEL,
        prompt_version: JUDGE_PROMPT_VERSION,
        transcript_hash: transcriptHash,
        error_code: null,
        started_at: new Date().toISOString(),
        completed_at: null,
      },
      { onConflict: 'room_id' },
    );
    if (run.error) {
      throw new JudgeRequestError(
        'The judge audit record could not be created.',
        500,
        'judge_run_failed',
      );
    }

    const modelResult = await callGeminiJudge({
      apiKey: clients.config.geminiApiKey,
      motion: topic.data.statement,
      context: topic.data.context,
      transcripts,
    });
    const verifiedCitations = modelResult.citations.filter((citation) =>
      transcripts.some(
        (turn) =>
          turn.phaseId === citation.phaseId &&
          turn.speakerOrder === citation.speakerOrder &&
          turn.transcript
            .toLocaleLowerCase()
            .includes(citation.excerpt.toLocaleLowerCase()),
      ),
    );
    const resolved = buildStoredScorecard({
      ...modelResult,
      citations: verifiedCitations,
    });

    if (modelResult.noDecision) {
      await admin
        .from('debate_rooms')
        .update({
          scorecard: resolved.scorecard,
          judge_model: GEMINI_JUDGE_MODEL,
          judge_prompt_version: JUDGE_PROMPT_VERSION,
        })
        .eq('id', roomId);
      await admin.rpc('finish_debate_judgement_without_verdict', {
        p_room_id: roomId,
        p_status: 'no_decision',
        p_error_code: 'insufficient_transcript',
      });
      return judgeJson(
        { status: 'no_decision', scorecard: resolved.scorecard },
        200,
      );
    }

    const settlement = await admin.rpc('settle_debate_judgement', {
      p_room_id: roomId,
      p_winner_speaker_order: resolved.winnerSpeakerOrder,
      p_scorecard: resolved.scorecard,
      p_model: GEMINI_JUDGE_MODEL,
      p_prompt_version: JUDGE_PROMPT_VERSION,
      p_transcript_hash: transcriptHash,
    });
    if (settlement.error) {
      throw new JudgeRequestError(
        'The verdict could not be settled.',
        500,
        'rating_settlement_failed',
      );
    }

    return judgeJson(
      { status: 'complete', scorecard: resolved.scorecard },
      200,
    );
  } catch (error) {
    if (claimed && admin && roomId) {
      await admin.rpc('finish_debate_judgement_without_verdict', {
        p_room_id: roomId,
        p_status: 'failed',
        p_error_code:
          error instanceof JudgeRequestError
            ? error.code
            : 'judge_execution_failed',
      });
    }
    return judgeErrorResponse(error);
  }
}
