import { z } from 'zod';

import { callGeminiTranscription } from '@/lib/judge/gemini';
import {
  authenticateRoomParticipant,
  createJudgeClients,
  GEMINI_TRANSCRIPTION_MODEL,
  judgeErrorResponse,
  judgeJson,
  JudgeRequestError,
} from '@/lib/judge/server';

export const maxDuration = 60;

const metadataSchema = z.object({
  phaseId: z.enum([
    'speaker-one-opening',
    'speaker-two-opening',
    'speaker-one-closing',
    'speaker-two-closing',
  ]),
  turnSequence: z.coerce.number().int().min(1).max(4),
  durationSeconds: z.coerce.number().min(1).max(45),
});

const phaseSequence = {
  'speaker-one-opening': 1,
  'speaker-two-opening': 2,
  'speaker-one-closing': 3,
  'speaker-two-closing': 4,
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params;
    if (!z.string().uuid().safeParse(roomId).success) {
      throw new JudgeRequestError('Invalid debate room.', 400, 'invalid_room');
    }

    const participant = await authenticateRoomParticipant(request, roomId);
    if (!['live', 'complete'].includes(participant.room.status)) {
      throw new JudgeRequestError(
        'The debate is not accepting transcripts.',
        409,
        'room_not_active',
      );
    }
    if (!participant.judgeConsentAt) {
      throw new JudgeRequestError(
        'AI judge consent is required.',
        409,
        'judge_consent_required',
      );
    }

    const form = await request.formData();
    const parsed = metadataSchema.safeParse({
      phaseId: form.get('phaseId'),
      turnSequence: form.get('turnSequence'),
      durationSeconds: form.get('durationSeconds'),
    });
    const audio = form.get('audio');
    if (!parsed.success || !(audio instanceof File)) {
      throw new JudgeRequestError(
        'Valid turn audio and metadata are required.',
        400,
        'invalid_turn_audio',
      );
    }
    if (audio.size < 100 || audio.size > 12 * 1024 * 1024) {
      throw new JudgeRequestError(
        'Turn audio must be between 100 bytes and 12 MB.',
        413,
        'invalid_audio_size',
      );
    }
    const audioMimeType = audio.type.toLowerCase().split(';', 1)[0];
    if (audioMimeType !== 'audio/wav' && audioMimeType !== 'audio/x-wav') {
      throw new JudgeRequestError(
        'Turn audio must use the supported WAV format.',
        415,
        'unsupported_audio_format',
      );
    }

    const phaseSpeakerOrder = parsed.data.phaseId.includes('speaker-one')
      ? 1
      : 2;
    if (
      phaseSpeakerOrder !== participant.speakerOrder ||
      phaseSequence[parsed.data.phaseId] !== parsed.data.turnSequence ||
      (participant.room.durationSeconds === 60 &&
        parsed.data.phaseId.includes('closing'))
    ) {
      throw new JudgeRequestError(
        'Turn metadata does not match this participant.',
        403,
        'turn_mismatch',
      );
    }

    const { admin, config } = createJudgeClients();
    let transcript: string;
    try {
      transcript =
        (await callGeminiTranscription({
          apiKey: config.geminiApiKey,
          audioBase64: Buffer.from(await audio.arrayBuffer()).toString('base64'),
          mimeType: 'audio/wav',
        })) ||
        '[No intelligible speech was captured for this timed turn.]';
    } catch {
      throw new JudgeRequestError(
        'Transcription provider was unavailable.',
        502,
        'transcription_provider_failed',
      );
    }

    const inserted = await admin
      .from('debate_turn_transcripts')
      .insert({
        room_id: roomId,
        user_id: participant.userId,
        speaker_order: participant.speakerOrder,
        phase_id: parsed.data.phaseId,
        turn_sequence: parsed.data.turnSequence,
        transcript,
        transcription_model: GEMINI_TRANSCRIPTION_MODEL,
        audio_duration_seconds: parsed.data.durationSeconds,
      })
      .select('id')
      .single();

    if (inserted.error && inserted.error.code !== '23505') {
      throw new JudgeRequestError(
        'The transcript could not be stored.',
        500,
        'transcript_store_failed',
      );
    }

    await admin
      .from('debate_rooms')
      .update({ judge_status: 'collecting', judge_error_code: null })
      .eq('id', roomId)
      .neq('judge_status', 'complete');

    return judgeJson(
      {
        ok: true,
        phaseId: parsed.data.phaseId,
        alreadyStored: inserted.error?.code === '23505',
      },
      200,
    );
  } catch (error) {
    return judgeErrorResponse(error);
  }
}
