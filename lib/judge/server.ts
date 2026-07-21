import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { getJudgeBackendConfig } from '@/lib/env/server';

export const GEMINI_TRANSCRIPTION_MODEL = 'gemini-3.5-flash';
export const GEMINI_JUDGE_MODEL = 'gemini-3.5-flash';
export const JUDGE_PROMPT_VERSION = 'civicround-judge-2026-07-21-v3-gemini-3-5';

export interface AuthenticatedRoomParticipant {
  userId: string;
  speakerOrder: 1 | 2;
  judgeConsentAt: string | null;
  room: {
    id: string;
    topicId: string;
    durationSeconds: 60 | 120;
    endedAt: string | null;
    status: 'ready' | 'live' | 'complete' | 'cancelled';
    judgeStatus: string;
    scorecard: unknown;
    isRated: boolean;
    mode: string;
  };
}

export function judgeJson(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json',
    },
  });
}

export function readBearerToken(request: Request) {
  return request.headers
    .get('authorization')
    ?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export function createJudgeClients() {
  const config = readJudgeConfig();
  const admin = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return { admin, config };
}

export async function authenticateRoomParticipant(
  request: Request,
  roomId: string,
): Promise<AuthenticatedRoomParticipant> {
  const bearer = readBearerToken(request);
  if (!bearer) throw new JudgeRequestError('Authentication required.', 401);

  const config = readJudgeConfig();
  const userClient = createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      global: { headers: { Authorization: 'Bearer ' + bearer } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const authenticated = await userClient.auth.getUser(bearer);
  const user = authenticated.data.user;
  if (authenticated.error || !user) {
    throw new JudgeRequestError('Invalid session.', 401);
  }

  const participant = await userClient
    .from('debate_participants')
    .select('speaker_order, judge_consent_at')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (participant.error || !participant.data) {
    throw new JudgeRequestError('Room membership required.', 403);
  }

  const room = await userClient
    .from('debate_rooms')
    .select('id, topic_id, duration_seconds, ended_at, status, judge_status, scorecard, is_rated, mode')
    .eq('id', roomId)
    .maybeSingle();
  if (room.error || !room.data) {
    throw new JudgeRequestError('Debate room not found.', 404);
  }

  return {
    userId: user.id,
    speakerOrder: participant.data.speaker_order as 1 | 2,
    judgeConsentAt: participant.data.judge_consent_at as string | null,
    room: {
      id: room.data.id as string,
      topicId: room.data.topic_id as string,
      durationSeconds: room.data.duration_seconds as 60 | 120,
      endedAt: room.data.ended_at as string | null,
      status: room.data.status as AuthenticatedRoomParticipant['room']['status'],
      judgeStatus: room.data.judge_status as string,
      scorecard: room.data.scorecard,
      isRated: room.data.is_rated as boolean,
      mode: room.data.mode as string,
    },
  };
}

export class JudgeRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'judge_request_failed',
  ) {
    super(message);
  }
}

function readJudgeConfig() {
  try {
    return getJudgeBackendConfig();
  } catch {
    throw new JudgeRequestError(
      'The AI judge is not configured.',
      503,
      'judge_not_configured',
    );
  }
}

export function judgeErrorResponse(error: unknown) {
  if (error instanceof JudgeRequestError) {
    return judgeJson({ error: error.message, code: error.code }, error.status);
  }
  return judgeJson(
    { error: 'The AI judge could not complete.', code: 'judge_execution_failed' },
    500,
  );
}
