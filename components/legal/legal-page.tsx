import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";

export interface LegalSection {
  title: string;
  body: string[];
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to arena
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="max-w-3xl border-b border-border pb-8">
          <p className="font-mono text-[10px] uppercase text-primary">{eyebrow}</p>
          <h1 className="mt-3 font-editorial text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{intro}</p>
        </div>
        <div className="grid gap-px border-x border-b border-border bg-border md:grid-cols-2">
          {sections.map((section, index) => (
            <section key={section.title} className="bg-[#111118] p-6 sm:p-8">
              <p className="font-mono text-[9px] uppercase text-secondary">0{index + 1}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold">{section.title}</h2>
              <div className="mt-4 grid gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-6 text-muted-foreground">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
