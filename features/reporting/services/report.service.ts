import { isDemoModeEnabled } from "@/lib/env/public";
import { getSupabaseClient } from "@/lib/supabase/client";

export type ReportReason =
  | "harassment_or_threats"
  | "hate_speech"
  | "explicit_content"
  | "impersonation"
  | "other_misconduct";

export interface ReportPayload {
  matchId: string;
  reportedUserId: string | null;
  reason: ReportReason;
  details: string;
}

export async function submitDebateReport(payload: ReportPayload) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    if (!isDemoModeEnabled()) {
      throw new Error("Reporting is not configured.");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  if (!payload.reportedUserId) {
    throw new Error("The reported participant could not be identified.");
  }

  const response = await supabase.rpc("submit_debate_report", {
    p_room_id: payload.matchId,
    p_reported_user_id: payload.reportedUserId,
    p_reason: payload.reason,
    p_details: payload.details || null,
  });

  if (response.error) throw response.error;
  return response.data as string;
}
