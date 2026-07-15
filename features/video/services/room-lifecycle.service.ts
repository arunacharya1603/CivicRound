import type { DebateRoomState } from "@/features/debate/types/debate.types";
import { requireSupabaseClient } from "@/lib/supabase/client";

interface RoomStateRow {
  room_status: DebateRoomState["status"];
  started_at: string | null;
  ended_at?: string | null;
  server_now: string;
}

function normalizeRoomState(data: unknown): DebateRoomState {
  const row = (Array.isArray(data) ? data[0] : data) as RoomStateRow | null;
  if (!row) throw new Error("The room state was not returned.");

  return {
    status: row.room_status,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    serverNow: row.server_now,
  };
}

export async function markDebateRoomReady(roomId: string) {
  const supabase = requireSupabaseClient();
  const response = await supabase.rpc("mark_debate_room_ready", {
    p_room_id: roomId,
  });
  if (response.error) throw response.error;
  return normalizeRoomState(response.data);
}

export async function getDebateRoomState(roomId: string) {
  const supabase = requireSupabaseClient();
  const response = await supabase.rpc("get_debate_room_state", {
    p_room_id: roomId,
  });
  if (response.error) throw response.error;
  return normalizeRoomState(response.data);
}

export async function completeDebateRoom(roomId: string) {
  const supabase = requireSupabaseClient();
  const response = await supabase.rpc("complete_debate_room", {
    p_room_id: roomId,
  });
  if (response.error) throw response.error;
  return response.data === true;
}

export async function leaveDebateRoom(roomId: string) {
  const supabase = requireSupabaseClient();
  const response = await supabase.rpc("leave_debate_room", {
    p_room_id: roomId,
  });
  if (response.error) throw response.error;
  return response.data as DebateRoomState["status"];
}
