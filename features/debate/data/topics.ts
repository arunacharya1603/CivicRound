import type { DebateTopic } from "@/features/debate/types/debate.types";

export const DEBATE_TOPICS: DebateTopic[] = [
  {
    id: "political-ad-verification",
    category: "Technology & society",
    statement: "Social platforms should verify every political advertiser.",
    context: "Accountability for paid political influence online.",
  },
  {
    id: "candidate-debate-requirement",
    category: "Democratic process",
    statement: "Candidates should be required to join public debates.",
    context: "Public scrutiny before election day.",
  },
  {
    id: "campaign-donation-cap",
    category: "Campaign finance",
    statement: "Governments should cap individual campaign donations.",
    context: "Limits on financial influence in elections.",
  },
  {
    id: "ai-political-labels",
    category: "Artificial intelligence",
    statement: "AI-generated political media should carry a visible label.",
    context: "Clear disclosure for synthetic campaign content.",
  },
  {
    id: "voting-age-sixteen",
    category: "Voting rights",
    statement: "The voting age should be lowered to sixteen.",
    context: "Earlier participation in democratic decisions.",
  },
  {
    id: "participatory-budgeting",
    category: "Local government",
    statement: "Residents should directly allocate part of local budgets.",
    context: "Community control over public spending.",
  },
];

export function getDebateTopic(
  topicId: string,
  topics: DebateTopic[] = DEBATE_TOPICS,
) {
  return topics.find((topic) => topic.id === topicId) ?? null;
}
