import { isDemoModeEnabled } from "@/lib/env/public";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function submitRoundFeedback({
  roomId,
  tags,
}: {
  roomId: string;
  tags: string[];
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    if (!isDemoModeEnabled()) {
      throw new Error("Feedback storage is not configured.");
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    return;
  }

  const response = await supabase.rpc("submit_round_feedback", {
    p_room_id: roomId,
    p_tags: tags,
  });
  if (response.error) throw response.error;
}
