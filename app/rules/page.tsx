import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Arena Rules" };

const sections = [
  {
    title: "Debate the position",
    body: [
      "Challenge ideas, evidence, and policy. Do not attack a person's identity, appearance, background, or private life.",
      "Threats, hate speech, targeted harassment, sexual content, and encouragement of violence are prohibited.",
    ],
  },
  {
    title: "Respect the clock",
    body: [
      "Speak only during your assigned phase. Deliberate interruption, audio disruption, or evasion of the timer may end the round.",
      "A short format rewards clarity. State the claim, give one reason, and respond directly.",
    ],
  },
  {
    title: "Protect privacy",
    body: [
      "Do not share addresses, phone numbers, account credentials, or other private identifying information.",
      "CivicRound does not record showcase rounds. Participants must not secretly record or redistribute another person's feed.",
    ],
  },
  {
    title: "Leave and report",
    body: [
      "Leave immediately when a conversation feels unsafe. A report can be submitted during or after the round.",
      "Reports include session metadata and the reason selected. They do not contain a video recording.",
    ],
  },
];

export default function RulesPage() {
  return (
    <LegalPage
      eyebrow="Community standard / 18+"
      title="Arena rules"
      intro="CivicRound treats political disagreement as a structured contest of ideas. These rules protect the people inside the room without softening the argument."
      sections={sections}
    />
  );
}
