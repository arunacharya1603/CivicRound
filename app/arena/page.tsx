import type { Metadata } from "next";

import { CivicRoundApp } from "@/features/debate/components/civic-round-app";

export const metadata: Metadata = {
  title: "Enter the arena",
  description:
    "Choose Casual, Ranked, Challenge, or AI Practice and enter a structured 1v1 debate.",
};

export default function ArenaPage() {
  return <CivicRoundApp />;
}
