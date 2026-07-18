import { DEBATE_TOPICS } from "@/features/debate/data/topics";
import type { DebateTopic } from "@/features/debate/types/debate.types";
import { isDemoModeEnabled } from "@/lib/env/public";
import { getSupabaseClient } from "@/lib/supabase/client";

interface DebateTopicRow {
  id: string;
  category: string;
  statement: string;
  context: string;
}

export async function listDebateTopics(): Promise<DebateTopic[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    if (isDemoModeEnabled()) return DEBATE_TOPICS;
    throw new Error("Debate topics are not configured.");
  }

  const response = await supabase
    .from("debate_topics")
    .select("id, category, statement, context")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (response.error) throw response.error;

  const topics = (response.data ?? []) as DebateTopicRow[];
  if (topics.length === 0) {
    throw new Error("No active debate topics are available.");
  }

  return topics.map((topic) => ({
    id: topic.id,
    category: topic.category,
    statement: topic.statement,
    context: topic.context,
  }));
}
