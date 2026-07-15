import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";

import { getServerBackendConfig } from "@/lib/env/server";

const tokenRequestSchema = z.object({
  roomName: z.string().uuid(),
});

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json",
    },
  });
}

export async function POST(request: Request) {
  let config: ReturnType<typeof getServerBackendConfig>;
  try {
    config = getServerBackendConfig();
  } catch {
    return json({ error: "Video service is not configured." }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid room request." }, 400);
  }

  const bearer = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!bearer) {
    return json({ error: "Authentication required." }, 401);
  }

  const supabase = createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const authenticatedUser = await supabase.auth.getUser(bearer);
  const user = authenticatedUser.data.user;
  if (authenticatedUser.error || !user) {
    return json({ error: "Invalid session." }, 401);
  }

  const participant = await supabase
    .from("debate_participants")
    .select("display_name, speaker_order")
    .eq("room_id", parsed.data.roomName)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participant.error || !participant.data) {
    return json({ error: "Room membership required." }, 403);
  }

  const room = await supabase
    .from("debate_rooms")
    .select("status")
    .eq("id", parsed.data.roomName)
    .maybeSingle();

  if (
    room.error ||
    !room.data ||
    (room.data.status !== "ready" && room.data.status !== "live")
  ) {
    return json({ error: "Room is no longer available." }, 409);
  }

  const accessToken = new AccessToken(
    config.livekitApiKey,
    config.livekitApiSecret,
    {
      identity: user.id,
      name: participant.data.display_name,
      metadata: JSON.stringify({
        speakerOrder: participant.data.speaker_order,
      }),
      ttl: "10m",
    },
  );

  accessToken.addGrant({
    room: parsed.data.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return json(
    {
      token: await accessToken.toJwt(),
      serverUrl: config.livekitUrl,
    },
    200,
  );
}
