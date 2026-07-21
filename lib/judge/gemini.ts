import 'server-only';

import { z } from 'zod';

import {
  GEMINI_JUDGE_MODEL,
  GEMINI_TRANSCRIPTION_MODEL,
  JUDGE_PROMPT_VERSION,
} from '@/lib/judge/server';

const phaseIdSchema = z.enum([
  'speaker-one-opening',
  'speaker-two-opening',
  'speaker-one-closing',
  'speaker-two-closing',
]);

const speakerAssessmentSchema = z.object({
  speakerOrder: z.union([z.literal(1), z.literal(2)]),
  reasoning: z.number().int().min(0).max(25),
  evidence: z.number().int().min(0).max(25),
  rebuttal: z.number().int().min(0).max(20),
  clarity: z.number().int().min(0).max(20),
  ruleAdherence: z.number().int().min(0).max(10),
  strengths: z.array(z.string().min(1).max(180)).max(3),
  improvements: z.array(z.string().min(1).max(180)).max(3),
});

export const judgeModelResponseSchema = z
  .object({
    noDecision: z.boolean(),
    noDecisionReason: z.string().max(240),
    confidence: z.number().int().min(0).max(100),
    summary: z.string().min(1).max(700),
    decidingFactors: z.array(z.string().min(1).max(180)).max(4),
    speakers: z.array(speakerAssessmentSchema).length(2),
    citations: z
      .array(
        z.object({
          speakerOrder: z.union([z.literal(1), z.literal(2)]),
          phaseId: phaseIdSchema,
          excerpt: z.string().min(1).max(240),
          explanation: z.string().min(1).max(240),
        }),
      )
      .max(6),
  })
  .refine(
    (value) =>
      new Set(value.speakers.map((speaker) => speaker.speakerOrder)).size === 2,
    { message: 'One assessment is required for each speaker.' },
  );

const transcriptionResponseSchema = z.object({
  transcript: z.string().max(8000),
});

export type JudgeModelResponse = z.infer<typeof judgeModelResponseSchema>;

export interface JudgeTranscript {
  phaseId: z.infer<typeof phaseIdSchema>;
  speakerOrder: 1 | 2;
  transcript: string;
  turnSequence: number;
}

const speakerResponseSchema = {
  type: 'OBJECT',
  required: [
    'speakerOrder',
    'reasoning',
    'evidence',
    'rebuttal',
    'clarity',
    'ruleAdherence',
    'strengths',
    'improvements',
  ],
  properties: {
    speakerOrder: { type: 'INTEGER' },
    reasoning: { type: 'INTEGER', minimum: 0, maximum: 25 },
    evidence: { type: 'INTEGER', minimum: 0, maximum: 25 },
    rebuttal: { type: 'INTEGER', minimum: 0, maximum: 20 },
    clarity: { type: 'INTEGER', minimum: 0, maximum: 20 },
    ruleAdherence: { type: 'INTEGER', minimum: 0, maximum: 10 },
    strengths: {
      type: 'ARRAY',
      maxItems: 3,
      items: { type: 'STRING' },
    },
    improvements: {
      type: 'ARRAY',
      maxItems: 3,
      items: { type: 'STRING' },
    },
  },
} as const;

const debateScorecardResponseSchema = {
  type: 'OBJECT',
  required: [
    'noDecision',
    'noDecisionReason',
    'confidence',
    'summary',
    'decidingFactors',
    'speakers',
    'citations',
  ],
  properties: {
    noDecision: { type: 'BOOLEAN' },
    noDecisionReason: { type: 'STRING' },
    confidence: { type: 'INTEGER', minimum: 0, maximum: 100 },
    summary: { type: 'STRING' },
    decidingFactors: {
      type: 'ARRAY',
      maxItems: 4,
      items: { type: 'STRING' },
    },
    speakers: {
      type: 'ARRAY',
      minItems: 2,
      maxItems: 2,
      items: speakerResponseSchema,
    },
    citations: {
      type: 'ARRAY',
      maxItems: 6,
      items: {
        type: 'OBJECT',
        required: ['speakerOrder', 'phaseId', 'excerpt', 'explanation'],
        properties: {
          speakerOrder: { type: 'INTEGER' },
          phaseId: {
            type: 'STRING',
            enum: [
              'speaker-one-opening',
              'speaker-two-opening',
              'speaker-one-closing',
              'speaker-two-closing',
            ],
          },
          excerpt: { type: 'STRING' },
          explanation: { type: 'STRING' },
        },
      },
    },
  },
} as const;

const transcriptionJsonSchema = {
  type: 'OBJECT',
  required: ['transcript'],
  properties: {
    transcript: {
      type: 'STRING',
      description:
        'A verbatim transcript of the intelligible speech, without commentary.',
    },
  },
} as const;

interface GeminiGenerateResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

async function generateGeminiContent({
  apiKey,
  model,
  body,
}: {
  apiKey: string;
  model: string;
  body: Record<string, unknown>;
}) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) +
      ':generateContent',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      'Gemini request failed with status ' + response.status + '.',
    );
  }

  const payload = (await response.json()) as GeminiGenerateResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) {
    const reason =
      payload.promptFeedback?.blockReason ??
      payload.candidates?.[0]?.finishReason ??
      'empty_response';
    throw new Error('Gemini returned no usable content: ' + reason + '.');
  }
  return text;
}

export async function callGeminiTranscription({
  apiKey,
  audioBase64,
  mimeType,
}: {
  apiKey: string;
  audioBase64: string;
  mimeType: 'audio/wav';
}) {
  const content = await generateGeminiContent({
    apiKey,
    model: GEMINI_TRANSCRIPTION_MODEL,
    body: {
      systemInstruction: {
        parts: [
          {
            text:
              'You are a precise transcription service. Transcribe only the ' +
              'intelligible spoken words. Preserve claims, negations, numbers, ' +
              'names, and the original language. Do not summarize, translate, ' +
              'fact-check, correct arguments, or add commentary.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text:
                'Return the verbatim transcript of this CivicRound timed debate turn.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: transcriptionJsonSchema,
      },
    },
  });

  return transcriptionResponseSchema.parse(JSON.parse(content)).transcript.trim();
}

export async function callGeminiJudge({
  apiKey,
  motion,
  context,
  transcripts,
}: {
  apiKey: string;
  motion: string;
  context: string;
  transcripts: JudgeTranscript[];
}) {
  const content = await generateGeminiContent({
    apiKey,
    model: GEMINI_JUDGE_MODEL,
    body: {
      systemInstruction: {
        parts: [
          {
            text:
              'You are CivicRound Judge Beta. Evaluate only the supplied transcript. ' +
              'Do not reward accent, identity, charisma, emotion, political agreement, ' +
              'or speaking style unrelated to clarity. Score reasoning 25, evidence 25, ' +
              'rebuttal 20, clarity and structure 20, and rule adherence 10. Treat ' +
              'evidence as support and relevance within the transcript; do not invent ' +
              'fact checks. Cite exact short excerpts and their phase IDs. Return ' +
              'noDecision when the transcript is materially incomplete or cannot ' +
              'support a fair comparison. Keep every string within the requested limits.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: JSON.stringify({
                motion,
                context,
                speakers: {
                  1: 'Speaker 1 takes the stance stored with participant 1.',
                  2: 'Speaker 2 takes the opposing stance.',
                },
                transcript: transcripts,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: debateScorecardResponseSchema,
      },
    },
  });

  return judgeModelResponseSchema.parse(JSON.parse(content));
}

export function buildStoredScorecard(result: JudgeModelResponse) {
  const speakers = [...result.speakers].sort(
    (left, right) => left.speakerOrder - right.speakerOrder,
  );
  const withTotals = speakers.map((speaker) => ({
    ...speaker,
    total:
      speaker.reasoning +
      speaker.evidence +
      speaker.rebuttal +
      speaker.clarity +
      speaker.ruleAdherence,
  }));
  const scoreDifference = withTotals[0]!.total - withTotals[1]!.total;
  const winnerSpeakerOrder: 1 | 2 | null = result.noDecision
    ? null
    : Math.abs(scoreDifference) <= 3
      ? null
      : scoreDifference > 0
        ? 1
        : 2;
  const verdict = result.noDecision
    ? 'no_decision'
    : winnerSpeakerOrder === null
      ? 'draw'
      : winnerSpeakerOrder === 1
        ? 'speaker_1'
        : 'speaker_2';

  return {
    winnerSpeakerOrder,
    scorecard: {
      version: 1,
      provider: 'gemini',
      model: GEMINI_JUDGE_MODEL,
      promptVersion: JUDGE_PROMPT_VERSION,
      verdict,
      confidence: result.confidence,
      summary: result.summary,
      noDecisionReason: result.noDecisionReason,
      decidingFactors: result.decidingFactors,
      speakers: withTotals,
      citations: result.citations,
      rubric: {
        reasoning: 25,
        evidence: 25,
        rebuttal: 20,
        clarity: 20,
        ruleAdherence: 10,
      },
    },
  };
}

export async function hashTranscripts(transcripts: JudgeTranscript[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(transcripts));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
