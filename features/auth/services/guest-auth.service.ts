import type { GuestProfile } from "@/features/debate/types/debate.types";
import { isDemoModeEnabled } from "@/lib/env/public";
import { getSupabaseClient } from "@/lib/supabase/client";

const GUEST_STORAGE_KEY = "civicround.guest";

function clearLegacyPersistentGuest() {
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened privacy modes.
  }
}

function isGuestProfile(value: unknown): value is GuestProfile {
  if (!value || typeof value !== "object") return false;

  const profile = value as Partial<GuestProfile>;
  const name = profile.displayName?.trim();

  return (
    typeof profile.id === "string" &&
    profile.id.length > 0 &&
    typeof name === "string" &&
    name.length >= 2 &&
    name.length <= 32 &&
    profile.isAnonymous === true
  );
}

export function readGuestIdentity(): GuestProfile | null {
  if (typeof window === "undefined") return null;

  clearLegacyPersistentGuest();

  try {
    const stored = window.sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (!stored) return null;

    const profile: unknown = JSON.parse(stored);
    if (!isGuestProfile(profile)) {
      window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
      return null;
    }

    return {
      ...profile,
      displayName: profile.displayName.trim(),
    };
  } catch {
    try {
      window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
}

function saveGuest(guest: GuestProfile) {
  clearLegacyPersistentGuest();

  try {
    window.sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
  } catch {
    // React state still keeps the identity for the current page lifecycle.
  }

  return guest;
}

export async function createGuestIdentity(displayName: string): Promise<GuestProfile> {
  const name = displayName.trim();
  const supabase = getSupabaseClient();

  if (!supabase) {
    if (!isDemoModeEnabled()) {
      throw new Error("Identity service is not configured.");
    }

    return saveGuest({
      id: crypto.randomUUID(),
      displayName: name,
      isAnonymous: true,
    });
  }

  const currentSession = await supabase.auth.getSession();
  let user = currentSession.data.session?.user;

  if (!user) {
    const anonymousSignIn = await supabase.auth.signInAnonymously();
    if (anonymousSignIn.error || !anonymousSignIn.data.user) {
      throw anonymousSignIn.error ?? new Error("Anonymous sign-in failed.");
    }
    user = anonymousSignIn.data.user;
  }

  const profile = await supabase.rpc("upsert_guest_profile", {
    p_display_name: name,
    p_confirmed_adult: true,
    p_accepted_rules: true,
  });

  if (profile.error) throw profile.error;

  const row = (Array.isArray(profile.data) ? profile.data[0] : profile.data) as
    | { display_name?: string }
    | null;

  return saveGuest({
    id: user.id,
    displayName: row?.display_name ?? name,
    isAnonymous: true,
  });
}
