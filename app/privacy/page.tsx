import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy" };

const sections = [
  {
    title: "What we collect",
    body: [
      "The showcase uses a guest identifier, display name, selected motion, stance, round duration, room metadata, and any report you choose to submit.",
      "Camera video is not recorded. In an AI-judged fight, each consented timed speech is temporarily sent for transcription; the audio is discarded after processing while the transcript and scorecard remain with the match.",
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
      "Supabase provides identity and structured data. LiveKit provides real-time video transport. Google Gemini processes consented turn audio and debate transcripts for the AI Judge Beta. Hosting and delivery providers process the minimum technical data required to operate the site.",
      "The showcase may use Gemini's free developer tier, under which Google states submitted content may be used to improve its products. Do not include confidential or highly sensitive information in a showcase debate.",
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
      intro="The showcase avoids permanent audio or video recording. AI-judged fights temporarily process consented speech to create the transcript and explainable scorecard shown to both competitors."
      sections={sections}
    />
  );
}
