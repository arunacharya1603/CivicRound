import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { RoomServiceClient } from "livekit-server-sdk";

function loadEnvironment() {
  const values = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
  ];

  for (const name of required) {
    if (!values[name]) throw new Error("Missing " + name + " in .env.local");
  }

  return values;
}

function first(data) {
  return Array.isArray(data) ? data[0] : data;
}

async function call(client, functionName, parameters = {}) {
  const response = await client.rpc(functionName, parameters);
  if (response.error) {
    throw new Error(functionName + ": " + response.error.message);
  }
  return response.data;
}

async function createGuest(env, displayName) {
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signIn = await client.auth.signInAnonymously();
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    throw new Error(signIn.error?.message ?? "Anonymous sign-in failed");
  }

  await call(client, "upsert_guest_profile", {
    p_display_name: displayName,
    p_confirmed_adult: true,
    p_accepted_rules: true,
  });

  return {
    client,
    user: signIn.data.user,
    accessToken: signIn.data.session.access_token,
  };
}

async function main() {
  const env = loadEnvironment();
  const suffix = Date.now().toString().slice(-6);
  const firstGuest = await createGuest(env, "Backend A " + suffix);
  const secondGuest = await createGuest(env, "Backend B " + suffix);

  const queued = first(
    await call(firstGuest.client, "join_matchmaking", {
      p_topic_id: "political-ad-verification",
      p_stance: "support",
      p_duration_seconds: 60,
    }),
  );
  if (queued?.match_status !== "waiting") {
    throw new Error("First participant did not enter the waiting queue");
  }

  const secondMatch = first(
    await call(secondGuest.client, "join_matchmaking", {
      p_topic_id: "political-ad-verification",
      p_stance: "challenge",
      p_duration_seconds: 60,
    }),
  );
  const firstMatch = first(
    await call(firstGuest.client, "get_matchmaking_status"),
  );

  if (
    secondMatch?.match_status !== "matched" ||
    firstMatch?.match_status !== "matched" ||
    firstMatch.matched_room_id !== secondMatch.matched_room_id
  ) {
    throw new Error("Both participants did not receive the same room");
  }

  const roomId = firstMatch.matched_room_id;
  const tokenResponse = await fetch(
    (process.env.BACKEND_BASE_URL ?? "http://localhost:3000") +
      "/api/livekit/token",
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + firstGuest.accessToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({ roomName: roomId }),
    },
  );
  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(
      "Token endpoint returned " + tokenResponse.status + ": " + body,
    );
  }

  const roomService = new RoomServiceClient(
    env.NEXT_PUBLIC_LIVEKIT_URL.replace(/^wss:/, "https:"),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
  await roomService.listRooms();

  await call(firstGuest.client, "mark_debate_room_ready", {    p_room_id: roomId,
  });
  const started = first(
    await call(secondGuest.client, "mark_debate_room_ready", {
      p_room_id: roomId,
    }),
  );
  if (started?.room_status !== "live" || !started.started_at) {
    throw new Error("Room did not start after both participants became ready");
  }

  const earlyCompletion = await call(
    firstGuest.client,
    "complete_debate_room",
    { p_room_id: roomId },
  );
  if (earlyCompletion !== false) {
    throw new Error("Room allowed completion before its configured duration");
  }

  await call(firstGuest.client, "submit_debate_report", {
    p_room_id: roomId,
    p_reported_user_id: secondGuest.user.id,
    p_reason: "other_misconduct",
    p_details: "Automated backend contract verification.",
  });
  await call(firstGuest.client, "submit_round_feedback", {
    p_room_id: roomId,
    p_tags: ["respectful", "clear"],
  });
  await call(firstGuest.client, "leave_debate_room", {
    p_room_id: roomId,
  });

  const inviteCode = await call(
    firstGuest.client,
    "create_debate_invite",
    {
      p_topic_id: "candidate-debate-requirement",
      p_stance: "support",
      p_duration_seconds: 60,
    },
  );
  const claimed = first(
    await call(secondGuest.client, "claim_debate_invite", {
      p_invite_code: inviteCode,
    }),
  );
  const creatorStatus = first(
    await call(firstGuest.client, "get_debate_invite_status", {
      p_invite_code: inviteCode,
    }),
  );
  if (
    claimed?.match_status !== "matched" ||
    creatorStatus?.matched_room_id !== claimed.matched_room_id
  ) {
    throw new Error("Invitation participants did not receive the same room");
  }

  await call(firstGuest.client, "leave_debate_room", {
    p_room_id: claimed.matched_room_id,
  });
  await firstGuest.client.auth.signOut();
  await secondGuest.client.auth.signOut();

  console.log(
    JSON.stringify(
      {
        supabaseAnonymousAuth: "passed",
        twoSidedMatchmaking: "passed",
        authorizedLiveKitToken: "passed",
        sharedRoomStart: "passed",
        reportPersistence: "passed",
        feedbackPersistence: "passed",
        invitationClaiming: "passed",
        livekitCredentials: "passed",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
