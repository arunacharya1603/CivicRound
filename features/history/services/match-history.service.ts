import type {
  MatchHistoryEntry,
  MemberProfile,
} from "@/features/debate/types/debate.types";
import { applyMemberRating } from "@/features/auth/services/member-auth.service";
import { getSupabaseClient } from "@/lib/supabase/client";

const HISTORY_STORAGE_KEY = "civicround.match-history.v1";
const APPEAL_STORAGE_KEY = "civicround.appeals.v1";

export function readMatchHistory(): MatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(value)
      ? (value as MatchHistoryEntry[]).slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

export function recordMatchHistory(
  entry: MatchHistoryEntry,
  member: MemberProfile | null,
) {
  const existing = readMatchHistory();
  if (existing.some((item) => item.id === entry.id)) {
    return { history: existing, member };
  }

  const history = [entry, ...existing].slice(0, 20);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

  return {
    history,
    member:
      member && entry.isRated
        ? applyMemberRating(member, entry.ratingDelta)
        : member,
  };
}

export function submitLocalAppeal({
  matchId,
  reason,
}: {
  matchId: string;
  reason: string;
}) {
  const existing = (() => {
    try {
      const parsed: unknown = JSON.parse(
        window.localStorage.getItem(APPEAL_STORAGE_KEY) ?? "[]",
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const appeal = {
    id: crypto.randomUUID(),
    matchId,
    reason: reason.trim(),
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    APPEAL_STORAGE_KEY,
    JSON.stringify([appeal, ...existing]),
  );
  return appeal;
}


export async function submitMatchAppeal({
  matchId,
  reason,
  source,
}: {
  matchId: string;
  reason: string;
  source: "demo" | "live" | "ai";
}) {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 12 || normalizedReason.length > 500) {
    throw new Error("Appeal reason must be between 12 and 500 characters.");
  }

  if (source !== "live") {
    return submitLocalAppeal({ matchId, reason: normalizedReason });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("The appeal service is not configured.");
  }

  const { data, error } = await supabase.rpc("submit_match_appeal", {
    p_room_id: matchId,
    p_reason: normalizedReason,
  });
  if (error) throw new Error(error.message);

  return {
    id: String(data),
    matchId,
    reason: normalizedReason,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
}
