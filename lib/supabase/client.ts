import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicBackendConfig } from "@/lib/env/public";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseClient() {
  if (browserClient !== undefined) return browserClient;

  const config = getPublicBackendConfig();
  browserClient = config
    ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  return browserClient;
}

export function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  return client;
}
