import type {
  DebateSession,
  DebateSetup,
  DebateStance,
  GuestProfile,
  SpeakerOrder,
} from "@/features/debate/types/debate.types";
import { isDemoModeEnabled } from "@/lib/env/public";
import { getSupabaseClient } from "@/lib/supabase/client";

interface MatchmakingRow {
  match_status: "waiting" | "matched" | "expired";
  matched_room_id: string | null;
  opponent_user_id: string | null;
  opponent_name: string | null;
  opponent_stance: DebateStance | null;
  current_speaker_order: SpeakerOrder | null;
}

const POLL_INTERVAL_MS = 750;
const MATCH_TIMEOUT_MS = 120_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOPIC_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;

function firstRow(data: unknown) {
  return (Array.isArray(data) ? data[0] : data) as MatchmakingRow | null;
}

function toSession(row: MatchmakingRow): DebateSession | null {
  if (
    row.match_status !== "matched" ||
    !row.matched_room_id ||
    !row.opponent_user_id ||
    !row.opponent_name ||
    !row.opponent_stance ||
    !row.current_speaker_order
  ) {
    return null;
  }

  return {
    id: row.matched_room_id,
    roomName: row.matched_room_id,
    opponentId: row.opponent_user_id,
    opponentName: row.opponent_name,
    opponentStance: row.opponent_stance,
    speakerOrder: row.current_speaker_order,
    source: "live",
  };
}

function abortError() {
  return new DOMException("Matchmaking was cancelled.", "AbortError");
}

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
      reject(abortError());
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function pollForMatch(
  requestStatus: () => Promise<MatchmakingRow | null>,
  signal?: AbortSignal,
) {
  const deadline = Date.now() + MATCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw abortError();

    const row = await requestStatus();
    const session = row ? toSession(row) : null;
    if (session) return session;
    if (row?.match_status === "expired") {
      throw new Error("The matchmaking request expired.");
    }

    await wait(POLL_INTERVAL_MS, signal);
  }

  throw new Error("No opponent joined before the queue expired.");
}

function demoSession(setup: DebateSetup): DebateSession {
  const id = crypto.randomUUID();
  return {
    id,
    roomName: "demo-" + id,
    opponentId: null,
    opponentName: "Maya",
    opponentStance: setup.stance === "support" ? "challenge" : "support",
    speakerOrder: 1,
    source: "demo",
  };
}

export async function findDebateMatch(
  profile: GuestProfile,
  setup: DebateSetup,
  signal?: AbortSignal,
): Promise<DebateSession> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    if (!isDemoModeEnabled()) {
      throw new Error("Matchmaking is not configured.");
    }
    await wait(1_200, signal);
    return demoSession(setup);
  }

  if (setup.inviteCode) {
    const claim = await supabase.rpc("claim_debate_invite", {
      p_invite_code: setup.inviteCode,
    });
    if (claim.error) throw claim.error;
    const session = toSession(firstRow(claim.data) as MatchmakingRow);
    if (!session) throw new Error("The private match could not be created.");
    return session;
  }

  const queueRequest = {
    p_topic_id: setup.topicId,
    p_stance: setup.stance,
    p_duration_seconds: setup.duration,
  };
  const join = await supabase.rpc("join_matchmaking", queueRequest);
  if (join.error) throw join.error;

  const immediate = toSession(firstRow(join.data) as MatchmakingRow);
  if (immediate) return immediate;

  let pollCount = 0;
  try {
    return await pollForMatch(async () => {
      pollCount += 1;
      const status =
        pollCount % 4 === 0
          ? await supabase.rpc("join_matchmaking", queueRequest)
          : await supabase.rpc("get_matchmaking_status");
      if (status.error) throw status.error;
      return firstRow(status.data);
    }, signal);
  } catch (error) {
    await cancelMatchmaking();
    throw error;
  }
}

export async function cancelMatchmaking() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const result = await supabase.rpc("cancel_matchmaking");
  if (result.error) throw result.error;
}

export async function getCurrentDebateMatch() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const status = await supabase.rpc("get_matchmaking_status");
  if (status.error) throw status.error;

  const row = firstRow(status.data);
  return row ? toSession(row) : null;
}

export async function createDebateInvite(setup: DebateSetup) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Invitations require the live backend.");

  const response = await supabase.rpc("create_debate_invite", {
    p_topic_id: setup.topicId,
    p_stance: setup.stance,
    p_duration_seconds: setup.duration,
  });
  if (response.error) throw response.error;

  const code = response.data as string;
  const url = new URL(window.location.origin);
  url.searchParams.set("invite", code);
  url.searchParams.set("topic", setup.topicId);
  url.searchParams.set(
    "stance",
    setup.stance === "support" ? "challenge" : "support",
  );
  url.searchParams.set("duration", String(setup.duration));

  return { code, url: url.toString() };
}

export async function waitForInviteMatch(
  inviteCode: string,
  signal?: AbortSignal,
) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Invitations require the live backend.");

  try {
    return await pollForMatch(async () => {
      const status = await supabase.rpc("get_debate_invite_status", {
        p_invite_code: inviteCode,
      });
      if (status.error) throw status.error;
      return firstRow(status.data);
    }, signal);
  } catch (error) {
    await cancelDebateInvite(inviteCode);
    throw error;
  }
}

export async function cancelDebateInvite(inviteCode: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const result = await supabase.rpc("cancel_debate_invite", {
    p_invite_code: inviteCode,
  });
  if (result.error) throw result.error;
}

export function readInviteSetup(): DebateSetup | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get("invite");
  const topicId = params.get("topic");
  const stance = params.get("stance");
  const duration = Number(params.get("duration"));

  if (
    !inviteCode ||
    !UUID_PATTERN.test(inviteCode) ||
    !topicId ||
    !TOPIC_ID_PATTERN.test(topicId) ||
    (stance !== "support" && stance !== "challenge") ||
    (duration !== 60 && duration !== 120)
  ) {
    return null;
  }

  return {
    inviteCode,
    topicId,
    stance,
    duration,
  };
}
