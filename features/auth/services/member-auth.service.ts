import type { MemberProfile } from "@/features/debate/types/debate.types";
import { getSupabaseClient } from "@/lib/supabase/client";

const MEMBER_STORAGE_KEY = "civicround.member.v1";

function normalizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

function isMemberProfile(value: unknown): value is MemberProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<MemberProfile>;

  return (
    typeof profile.id === "string" &&
    typeof profile.displayName === "string" &&
    profile.displayName.trim().length >= 2 &&
    typeof profile.handle === "string" &&
    profile.handle.length >= 2 &&
    profile.isAnonymous === false &&
    typeof profile.rating === "number" &&
    typeof profile.matchesPlayed === "number" &&
    typeof profile.provisional === "boolean"
  );
}

export function readMemberIdentity(): MemberProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(MEMBER_STORAGE_KEY);
    if (!stored) return null;
    const profile: unknown = JSON.parse(stored);
    if (!isMemberProfile(profile)) {
      window.localStorage.removeItem(MEMBER_STORAGE_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

function saveMember(profile: MemberProfile) {
  window.localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function syncMemberIdentity(profile: MemberProfile) {
  return saveMember(profile);
}

export function createInvestorMemberIdentity({
  displayName,
  handle,
}: {
  displayName: string;
  handle: string;
}) {
  const safeHandle = normalizeHandle(handle);
  if (displayName.trim().length < 2 || safeHandle.length < 2) {
    throw new Error("Enter a display name and a valid competitor handle.");
  }

  return saveMember({
    id: `demo-member:${crypto.randomUUID()}`,
    displayName: displayName.trim().slice(0, 32),
    handle: safeHandle,
    isAnonymous: false,
    rating: 1248,
    matchesPlayed: 12,
    provisional: false,
  });
}

export async function signInMemberIdentity({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Account sign-in is not configured.");

  const response = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (response.error || !response.data.user) {
    throw response.error ?? new Error("Sign-in failed.");
  }
  if (response.data.user.is_anonymous) {
    throw new Error("Ranked play requires a permanent account.");
  }

  const metadata = response.data.user.user_metadata ?? {};
  const displayName =
    typeof metadata.display_name === "string"
      ? metadata.display_name
      : email.split("@")[0] ?? "Competitor";
  const handle =
    typeof metadata.handle === "string"
      ? normalizeHandle(metadata.handle)
      : normalizeHandle(email.split("@")[0] ?? "competitor");
  const profileResponse = await supabase.rpc("upsert_competitor_profile", {
    p_display_name: displayName,
    p_handle: handle,
  });
  if (profileResponse.error) throw profileResponse.error;
  const profileRow = (
    Array.isArray(profileResponse.data)
      ? profileResponse.data[0]
      : profileResponse.data
  ) as
    | {
        display_name?: string;
        handle?: string;
        rating?: number;
        matches_played?: number;
      }
    | null;

  return saveMember({
    id: response.data.user.id,
    displayName: profileRow?.display_name ?? displayName,
    handle: profileRow?.handle ?? handle,
    isAnonymous: false,
    rating: profileRow?.rating ?? 1200,
    matchesPlayed:
      profileRow?.matches_played ?? 0,
    provisional: (profileRow?.matches_played ?? 0) < 5,
  });
}

export function applyMemberRating(
  profile: MemberProfile,
  delta: number,
): MemberProfile {
  const nextProfile = {
    ...profile,
    rating: Math.max(100, profile.rating + delta),
    matchesPlayed: profile.matchesPlayed + 1,
    provisional: profile.matchesPlayed + 1 < 5,
  };
  return saveMember(nextProfile);
}

export function isInvestorDemoMember(profile: MemberProfile) {
  return profile.id.startsWith("demo-member:");
}
