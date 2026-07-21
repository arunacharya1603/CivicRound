import "server-only";

import { z } from "zod";

const serverBackendSchema = z.object({
  supabaseUrl: z.string().url(),
  supabasePublishableKey: z.string().min(20),
  livekitUrl: z.string().startsWith("wss://"),
  livekitApiKey: z.string().min(3),
  livekitApiSecret: z.string().min(8),
});

export function getServerBackendConfig() {
  return serverBackendSchema.parse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  });
}

const judgeBackendSchema = z.object({
  supabaseUrl: z.string().url(),
  supabasePublishableKey: z.string().min(20),
  supabaseSecretKey: z.string().min(20),
  geminiApiKey: z.string().min(20),
});

export function getJudgeBackendConfig() {
  return judgeBackendSchema.parse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseSecretKey:
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  });
}
