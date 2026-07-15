export interface PublicBackendConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function getPublicBackendConfig(): PublicBackendConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return null;

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";
}
