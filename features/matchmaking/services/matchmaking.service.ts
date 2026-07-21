import type {
  DebateSession,
  DebateSetup,
  DebateStance,
  ParticipantProfile,
  SpeakerOrder,
} from "@/features/debate/types/debate.types";
import { isInvestorDemoMember } from "@/features/auth/services/member-auth.service";
import { modeRequiresAccount } from "@/features/modes/data/mode-rules";
import { isDemoModeEnabled } from "@/lib/env/public";
import { getSupabaseClient } from "@/lib/supabase/client";

interface MatchmakingRow {
  match_status: "waiting" | "matched" | "expired";
  matched_room_id: string | null;
  opponent_user_id: string | null;
  opponent_name: string | null;
  opponent_stance: DebateStance | null;
  current_speaker_order: SpeakerOrder | null;
  match_mode?: DebateSetup["mode"] | null;
  is_rated?: boolean | null;
  opponent_rating?: number | null;
}

const POLL_INTERVAL_MS = 750;
const MATCH_TIMEOUT_MS = 120_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOPIC_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;

function firstRow(data: unknown) {
  return (Array.isArray(data) ? data[0] : data) as MatchmakingRow | null;
}

function toSession(
  row: MatchmakingRow,
  setup: DebateSetup,
  profile?: ParticipantProfile,
): DebateSession | null {
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
    mode: row.match_mode ?? setup.mode,
    isRated: row.is_rated ?? setup.isRated,
    ratingBefore:
      profile && !profile.isAnonymous && setup.isRated
        ? profile.rating
        : undefined,
    opponentRating: row.opponent_rating ?? undefined,
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
  setup: DebateSetup,
  profile?: ParticipantProfile,
  signal?: AbortSignal,
) {
  const deadline = Date.now() + MATCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw abortError();

    const row = await requestStatus();
    const session = row ? toSession(row, setup, profile) : null;
    if (session) return session;
    if (row?.match_status === "expired") {
      throw new Error("The matchmaking request expired.");
    }

    await wait(POLL_INTERVAL_MS, signal);
  }

  throw new Error("No opponent joined before the queue expired.");
}

function demoSession(
  setup: DebateSetup,
  profile: ParticipantProfile,
): DebateSession {
  const id = crypto.randomUUID();
  return {
    id,
    roomName: "demo-" + id,
    opponentId: null,
    opponentName: setup.mode === "ranked" ? "Avery Chen" : "Maya",
    opponentStance: setup.stance === "support" ? "challenge" : "support",
    speakerOrder: 1,
    source: "demo",
    mode: setup.mode,
    isRated: setup.isRated,
    ratingBefore: !profile.isAnonymous ? profile.rating : undefined,
    opponentRating: setup.mode === "ranked" ? 1276 : undefined,
  };
}

export async function createAiPracticeSession(
  profile: ParticipantProfile,
  setup: DebateSetup,
): Promise<DebateSession> {
  if (setup.mode !== "practice") {
    throw new Error("AI practice requires practice mode.");
  }

  await wait(650);
  const difficulty = setup.aiDifficulty ?? "challenger";
  const difficultyLabel =
    difficulty.slice(0, 1).toUpperCase() + difficulty.slice(1);
  let id = crypto.randomUUID();
  const supabase = getSupabaseClient();

  if (
    supabase &&
    (profile.isAnonymous || !isInvestorDemoMember(profile))
  ) {
    const { data, error } = await supabase.rpc("create_ai_practice_room", {
      p_topic_id: setup.topicId,
      p_stance: setup.stance,
      p_duration_seconds: setup.duration,
      p_difficulty: difficulty,
    });

    // Keep older demo deployments usable until the product-modes migration
    // has been applied; migrated deployments persist every practice match.
    if (!error && data) id = String(data);
  }

  return {
    id,
    roomName: "practice-" + id,
    opponentId: null,
    opponentName: `Civic AI / ${difficultyLabel}`,
    opponentStance: setup.stance === "support" ? "challenge" : "support",
    speakerOrder: 1,
    source: "ai",
    mode: "practice",
    isRated: false,
  };
}

export async function findDebateMatch(
  profile: ParticipantProfile,
  setup: DebateSetup,
  signal?: AbortSignal,
): Promise<DebateSession> {
  if (modeRequiresAccount(setup.mode, setup.isRated) && profile.isAnonymous) {
    throw new Error("A persistent competitor account is required.");
  }

  const supabase = getSupabaseClient();

  if (
    !supabase ||
    (!profile.isAnonymous && isInvestorDemoMember(profile))
  ) {
    if (!isDemoModeEnabled()) {
      if (!profile.isAnonymous && isInvestorDemoMember(profile)) {
        await wait(1_200, signal);
        return demoSession(setup, profile);
      }
      throw new Error("Matchmaking is not configured.");
    }
    await wait(1_200, signal);
    return demoSession(setup, profile);
  }

  if (setup.inviteCode) {
    let claim = await supabase.rpc("claim_mode_debate_invite", {
      p_invite_code: setup.inviteCode,
    });
    if (claim.error) {
      claim = await supabase.rpc("claim_debate_invite", {
        p_invite_code: setup.inviteCode,
      });
    }
    if (claim.error) throw claim.error;
    const session = toSession(
      firstRow(claim.data) as MatchmakingRow,
      setup,
      profile,
    );
    if (!session) throw new Error("The private match could not be created.");
    return session;
  }

  const queueRequest = {
    p_topic_id: setup.topicId,
    p_stance: setup.stance,
    p_duration_seconds: setup.duration,
  };
  const joinQueue = async () =>
    setup.mode === "ranked"
      ? await supabase.rpc("join_mode_matchmaking", {
          ...queueRequest,
          p_mode: setup.mode,
          p_is_rated: true,
        })
      : await supabase.rpc("join_matchmaking", queueRequest);
  const join = await joinQueue();
  if (join.error) throw join.error;

  const immediate = toSession(
    firstRow(join.data) as MatchmakingRow,
    setup,
    profile,
  );
  if (immediate) return immediate;

  let pollCount = 0;
  try {
    return await pollForMatch(async () => {
      pollCount += 1;
      const status =
        pollCount % 4 === 0
          ? await joinQueue()
          : setup.mode === "ranked"
            ? await supabase.rpc("get_mode_matchmaking_status")
            : await supabase.rpc("get_matchmaking_status");
      if (status.error) throw status.error;
      return firstRow(status.data);
    }, setup, profile, signal);
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

export async function getCurrentDebateMatch(
  profile: ParticipantProfile,
  setup: DebateSetup,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const status = await supabase.rpc("get_matchmaking_status");
  if (status.error) throw status.error;

  const row = firstRow(status.data);
  return row ? toSession(row, setup, profile) : null;
}

export async function createDebateInvite(
  setup: DebateSetup,
  profile?: ParticipantProfile,
) {
  if (profile && !profile.isAnonymous && isInvestorDemoMember(profile)) {
    const code = crypto.randomUUID();
    return {
      code,
      url: buildInviteUrl(code, setup),
      localDemo: true,
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Invitations require the live backend.");

  const payload = {
    p_topic_id: setup.topicId,
    p_stance: setup.stance,
    p_duration_seconds: setup.duration,
  };
  let response =
    setup.mode === "challenge"
      ? await supabase.rpc("create_mode_debate_invite", {
          ...payload,
          p_mode: setup.mode,
          p_is_rated: setup.isRated,
        })
      : await supabase.rpc("create_debate_invite", payload);
  if (response.error && setup.mode === "challenge") {
    response = await supabase.rpc("create_debate_invite", payload);
  }
  if (response.error) throw response.error;

  const code = response.data as string;
  return { code, url: buildInviteUrl(code, setup), localDemo: false };
}

function buildInviteUrl(code: string, setup: DebateSetup) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set("invite", code);
  url.searchParams.set("topic", setup.topicId);
  url.searchParams.set(
    "stance",
    setup.stance === "support" ? "challenge" : "support",
  );
  url.searchParams.set("duration", String(setup.duration));
  url.searchParams.set("mode", "challenge");
  url.searchParams.set("rated", setup.isRated ? "1" : "0");

  return url.toString();
}

export async function waitForInviteMatch(
  inviteCode: string,
  setup: DebateSetup,
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
    }, setup, undefined, signal);
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
  const rated = params.get("rated") === "1";

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
    mode: "challenge",
    isRated: rated,
    inviteCode,
    topicId,
    stance,
    duration,
  };
}
