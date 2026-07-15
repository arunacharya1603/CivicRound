import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms" };

const sections = [
  {
    title: "Eligibility",
    body: [
      "You must be at least 18 years old and able to agree to these terms. The current product is a limited showcase, not an emergency, legal, or election-information service.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Use CivicRound for lawful, consensual political discussion. Do not attempt to exploit, disrupt, scrape, impersonate, or gain unauthorized access to the service or another participant.",
    ],
  },
  {
    title: "Moderation",
    body: [
      "We may end rooms, restrict access, preserve report metadata, or remove users when required for safety, legal compliance, or service integrity.",
    ],
  },
  {
    title: "Showcase limits",
    body: [
      "Availability, matchmaking time, and video quality can vary. Production service levels, operator identity, jurisdiction, dispute terms, and support contacts must be finalized before a public launch.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Showcase agreement / Draft"
      title="Terms of use"
      intro="These draft terms define the intended behavior of the CivicRound showcase. They should receive legal review before the product is opened to the public."
      sections={sections}
    />
  );
}
