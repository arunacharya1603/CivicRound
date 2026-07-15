import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy" };

const sections = [
  {
    title: "What we collect",
    body: [
      "The showcase uses a guest identifier, display name, selected motion, stance, round duration, room metadata, and any report you choose to submit.",
      "Camera and microphone streams are used for the live conversation and are not recorded by CivicRound.",
    ],
  },
  {
    title: "Why we use it",
    body: [
      "Session data supports matchmaking, room access, abuse prevention, connection recovery, and moderation.",
      "We do not sell personal information or use debate video for advertising.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "Supabase provides guest identity and structured data. LiveKit provides real-time video transport. Hosting and delivery providers process the minimum technical data required to operate the site.",
      "Each provider applies its own security and retention controls.",
    ],
  },
  {
    title: "Your control",
    body: [
      "You may leave at any moment, disable your camera or microphone, and request deletion of stored account or report data where applicable.",
      "A final production policy will include the operator contact and jurisdiction before public launch.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Showcase policy / Draft"
      title="Privacy"
      intro="The showcase is designed to prove the live debate experience without recording conversations or building unnecessary personal profiles."
      sections={sections}
    />
  );
}
