import type {
  DebateJudgeResult,
  DebateJudgeStatus,
  StoredJudgeScorecard,
} from '@/features/debate/types/debate.types';
import { requireSupabaseClient } from '@/lib/supabase/client';

async function getAccessToken() {
  const supabase = requireSupabaseClient();
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error('Your session has expired.');
  return accessToken;
}

export async function registerJudgeConsent(
  roomId: string,
  consented: boolean,
) {
  const supabase = requireSupabaseClient();
  const response = await supabase.rpc('set_debate_judge_consent', {
    p_room_id: roomId,
    p_consented: consented,
  });
  if (response.error) throw new Error(response.error.message);
  return response.data as string | null;
}

export async function uploadDebateTurn({
  roomId,
  phaseId,
  turnSequence,
  durationSeconds,
  audio,
}: {
  roomId: string;
  phaseId: string;
  turnSequence: number;
  durationSeconds: number;
  audio: Blob;
}) {
  const accessToken = await getAccessToken();
  const body = new FormData();
  body.set('phaseId', phaseId);
  body.set('turnSequence', String(turnSequence));
  body.set('durationSeconds', String(durationSeconds));
  body.set('audio', audio, phaseId + '.webm');

  const response = await fetch(
    '/api/debates/' + roomId + '/turns/transcribe',
    {
      method: 'POST',
      cache: 'no-store',
      headers: { authorization: 'Bearer ' + accessToken },
      body,
    },
  );
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'The turn could not be transcribed.');
  }
}

export async function requestDebateJudge(roomId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/debates/' + roomId + '/judge', {
    method: 'POST',
    cache: 'no-store',
    headers: { authorization: 'Bearer ' + accessToken },
  });
  const result = (await response.json().catch(() => null)) as {
    status?: DebateJudgeStatus;
    error?: string;
    code?: string;
  } | null;
  if (!response.ok) {
    throw new JudgeClientError(
      result?.error ?? 'The AI judge could not run.',
      result?.code ?? 'judge_request_failed',
      response.status,
    );
  }
  return result?.status ?? 'processing';
}

export async function getDebateJudgeResult(
  roomId: string,
): Promise<DebateJudgeResult> {
  const supabase = requireSupabaseClient();
  const response = await supabase.rpc('get_debate_judge_result', {
    p_room_id: roomId,
  });
  if (response.error) throw new Error(response.error.message);
  const row = (Array.isArray(response.data)
    ? response.data[0]
    : response.data) as
    | {
        result_status?: DebateJudgeStatus;
        result_scorecard?: StoredJudgeScorecard | null;
        result_rating_delta?: number | null;
        result_rating_after?: number | null;
        result_rating_processed_at?: string | null;
        result_winner_user_id?: string | null;
        result_current_rating?: number | null;
        result_current_matches_played?: number | null;
      }
    | null;
  if (!row?.result_status) throw new Error('Judge result was not returned.');

  return {
    status: row.result_status,
    scorecard: row.result_scorecard ?? null,
    ratingDelta: row.result_rating_delta ?? null,
    ratingAfter: row.result_rating_after ?? null,
    ratingProcessedAt: row.result_rating_processed_at ?? null,
    winnerUserId: row.result_winner_user_id ?? null,
    currentRating: row.result_current_rating ?? null,
    currentMatchesPlayed: row.result_current_matches_played ?? null,
  };
}

export async function ensureDebateJudgeResult(roomId: string) {
  const current = await getDebateJudgeResult(roomId);
  if (
    current.status === 'complete' ||
    current.status === 'no_decision' ||
    current.status === 'failed' ||
    current.status === 'not_required'
  ) {
    return current;
  }
  await requestDebateJudge(roomId);
  return getDebateJudgeResult(roomId);
}

export class JudgeClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
