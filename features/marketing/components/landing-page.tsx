import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Gavel,
  Mic2,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { DEBATE_TOPICS } from "@/features/debate/data/topics";

const STEPS = [
  {
    number: "01",
    title: "Take a position",
    description:
      "Choose a live motion and commit to the side you are ready to defend.",
  },
  {
    number: "02",
    title: "Speak on the clock",
    description:
      "One person speaks at a time. Equal turns keep the round focused and fair.",
  },
  {
    number: "03",
    title: "Finish the argument",
    description:
      "Respond directly, make your closing case, and complete the full round.",
  },
] as const;

const PHASES = [
  { number: "01", label: "Opening", active: true },
  { number: "02", label: "Response", active: false },
  { number: "03", label: "Closing", active: false },
  { number: "04", label: "Verdict", active: false },
] as const;

const SCORE_PREVIEW = [
  { label: "Logical consistency", support: 18, oppose: 16 },
  { label: "Use of evidence", support: 17, oppose: 15 },
  { label: "Direct rebuttal", support: 16, oppose: 18 },
  { label: "Clarity", support: 18, oppose: 17 },
] as const;

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <LandingHeader />

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex min-h-[620px] flex-col justify-between border-border px-5 py-14 sm:px-8 sm:py-20 lg:min-h-[740px] lg:border-r lg:px-12 xl:px-16">
            <div>
              <p className="mb-7 flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Live / One-to-one / On the clock
              </p>

              <h1 className="max-w-[760px] font-editorial text-[clamp(3.6rem,5.5vw,6.25rem)] font-medium leading-[0.86] tracking-[-0.055em]">
                Take a side.
                <br />
                Enter the round.
                <br />
                <span className="text-primary">Win the argument.</span>
              </h1>
            </div>

            <div className="mt-14 max-w-xl lg:mt-20">
              <p className="max-w-[590px] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Live 1v1 debates with equal time, controlled turns, and no
                follower count deciding who gets heard.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/arena"
                  className="group inline-flex h-13 items-center justify-between gap-8 bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#927dff] sm:min-w-52"
                >
                  Enter the arena
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.8}
                  />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-13 items-center justify-center border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-card"
                >
                  See how rounds work
                </Link>
              </div>

              <div className="mt-9 grid grid-cols-3 border-y border-border py-4 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px]">
                <span>Private by design</span>
                <span className="border-x border-border text-center">
                  Equal speaking time
                </span>
                <span className="text-right">Guest entry</span>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[620px] items-center bg-[#0d0d13] px-4 py-10 sm:px-8 lg:min-h-[740px] lg:px-10 xl:px-14">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
                backgroundSize: "64px 64px",
              }}
            />
            <DebateBroadcast />
          </div>
        </div>
      </section>

      <MotionRail />
      <HowItWorks />
      <RankedPreview />
      <FinalCallToAction />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="relative z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-17 max-w-[1440px] items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-12 xl:px-16">
        <Wordmark />

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
        >
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="#ranked"
            className="transition-colors hover:text-foreground"
          >
            Ranked
          </Link>
          <Link
            href="#rules"
            className="transition-colors hover:text-foreground"
          >
            Rules
          </Link>
        </nav>

        <Link
          href="/arena"
          className="group inline-flex h-10 items-center gap-4 border border-border px-4 text-xs font-semibold transition-colors hover:border-primary hover:text-primary sm:h-11 sm:px-5 sm:text-sm"
        >
          Enter arena
          <ArrowRight
            className="hidden h-4 w-4 transition-transform group-hover:translate-x-1 sm:block"
            strokeWidth={1.8}
          />
        </Link>
      </div>
    </header>
  );
}

function DebateBroadcast() {
  return (
    <div className="relative w-full border border-[#2b2b36] bg-[#0b0b10] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
      <div className="flex items-start justify-between gap-6 border-b border-[#2b2b36] px-4 py-4 sm:px-6">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
            Live motion
          </p>
          <h2 className="mt-2 max-w-xl font-editorial text-xl leading-tight tracking-[-0.025em] sm:text-2xl lg:text-[1.7rem]">
            AI-generated political media should carry a visible label.
          </h2>
        </div>
        <div className="shrink-0 border border-[#343442] px-3 py-2 text-right">
          <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-muted-foreground">
            Turn
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
            00:28
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        <Participant
          initials="CV"
          name="CivicVoice"
          position="Support"
          state="Speaking"
          active
        />
        <Participant
          initials="PR"
          name="PublicReason"
          position="Against"
          state="Up next"
        />
      </div>

      <div className="grid grid-cols-4 border-y border-[#2b2b36]">
        {PHASES.map((phase) => (
          <div
            key={phase.number}
            className="border-r border-[#2b2b36] px-3 py-3 last:border-r-0 sm:px-4"
          >
            <p
              className={
                phase.active
                  ? "font-mono text-[8px] font-semibold text-primary sm:text-[9px]"
                  : "font-mono text-[8px] font-semibold text-[#626272] sm:text-[9px]"
              }
            >
              {phase.number}
            </p>
            <p
              className={
                phase.active
                  ? "mt-1 text-[10px] font-medium text-foreground sm:text-xs"
                  : "mt-1 text-[10px] font-medium text-[#737382] sm:text-xs"
              }
            >
              {phase.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mic2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.7} />
          One voice at a time
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Round in progress
        </div>
      </div>
    </div>
  );
}

function Participant({
  initials,
  name,
  position,
  state,
  active = false,
}: {
  initials: string;
  name: string;
  position: string;
  state: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "relative min-h-64 border-b border-[#2b2b36] bg-[#111019] p-5 md:border-b-0 md:border-r sm:min-h-80 sm:p-7"
          : "relative min-h-64 border-b border-[#2b2b36] bg-[#0a0a0f] p-5 md:border-b-0 sm:min-h-80 sm:p-7"
      }
    >
      {active ? (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      ) : null}

      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span
            className={
              active
                ? "font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-primary"
                : "font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            }
          >
            {position}
          </span>
          <span className="border border-[#353541] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
            {state}
          </span>
        </div>

        <div className="flex flex-col items-center py-7 text-center">
          <div
            className={
              active
                ? "grid h-20 w-20 place-items-center rounded-full border border-primary bg-primary/10 font-editorial text-2xl text-primary sm:h-24 sm:w-24 sm:text-3xl"
                : "grid h-20 w-20 place-items-center rounded-full border border-[#343440] bg-[#111117] font-editorial text-2xl text-[#858594] sm:h-24 sm:w-24 sm:text-3xl"
            }
          >
            {initials}
          </div>
          <p className="mt-5 text-base font-semibold sm:text-lg">{name}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            Guest debater
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {[10, 17, 25, 14, 21, 9, 18, 12, 23, 15].map((height, index) => (
            <span
              key={index}
              className={
                active
                  ? "w-0.5 rounded-full bg-primary/80"
                  : "w-0.5 rounded-full bg-[#343440]"
              }
              style={{ height }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MotionRail() {
  return (
    <section aria-labelledby="open-motions-heading" className="border-b border-border">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
              Open motions
            </p>
            <h2
              id="open-motions-heading"
              className="mt-2 font-editorial text-2xl tracking-[-0.025em] sm:text-3xl"
            >
              What will you defend?
            </h2>
          </div>
          <Link
            href="/arena"
            className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            View all
            <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
          </Link>
        </div>

        <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3">
          {DEBATE_TOPICS.slice(0, 5).map((topic, index) => (
            <Link
              key={topic.id}
              href="/arena"
              className="group min-w-[285px] snap-start border border-border bg-card/35 p-5 transition-colors hover:border-primary/60 hover:bg-card sm:min-w-[340px]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  {topic.category}
                </span>
                <span className="font-mono text-[9px] text-[#565665]">
                  0{index + 1}
                </span>
              </div>
              <p className="mt-6 font-editorial text-xl leading-snug tracking-[-0.018em]">
                {topic.statement}
              </p>
              <div className="mt-7 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <span>Choose a side</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-primary"
                  strokeWidth={1.7}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2">
        <div className="flex min-h-[520px] flex-col justify-between border-border bg-primary px-5 py-12 text-[#0b0913] sm:px-8 sm:py-16 lg:min-h-[650px] lg:border-r lg:px-12 xl:px-16">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
            The CivicRound format
          </p>
          <div className="mt-20">
            <Gavel className="h-8 w-8" strokeWidth={1.4} />
            <h2 className="mt-8 max-w-xl font-editorial text-[clamp(3.5rem,7vw,7rem)] font-medium leading-[0.86] tracking-[-0.05em]">
              One side
              <br />
              at a time.
            </h2>
            <p className="mt-8 max-w-md text-base leading-7 text-[#211b3b] sm:text-lg">
              The format does the moderating. No interruptions, no pile-ons, no
              popularity advantage—just the argument in front of you.
            </p>
          </div>
        </div>

        <div className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12 xl:px-16">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How a round works
            </p>
            <Clock3 className="h-5 w-5 text-primary" strokeWidth={1.6} />
          </div>

          <div className="mt-12">
            {STEPS.map((step) => (
              <article
                key={step.number}
                className="grid grid-cols-[48px_1fr] gap-4 border-t border-border py-8 sm:grid-cols-[72px_1fr] sm:gap-6 sm:py-10"
              >
                <span className="font-mono text-[10px] font-semibold text-primary">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-editorial text-2xl tracking-[-0.02em] sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 border border-border">
            <FormatFact icon={UserRound} label="1 versus 1" />
            <FormatFact icon={Clock3} label="Timed turns" />
            <FormatFact icon={ShieldCheck} label="Private rooms" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FormatFact({
  icon: Icon,
  label,
}: {
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-3 border-r border-border px-2 text-center last:border-r-0">
      <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
      <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.11em] text-muted-foreground sm:text-[9px]">
        {label}
      </span>
    </div>
  );
}

function RankedPreview() {
  return (
    <section id="ranked" className="border-b border-border">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[0.82fr_1.18fr]">
        <div className="flex flex-col justify-between border-border px-5 py-14 sm:px-8 sm:py-20 lg:min-h-[650px] lg:border-r lg:px-12 xl:px-16">
          <div>
            <span className="inline-flex items-center gap-2 border border-primary/50 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Ranked fights
            </span>
            <h2 className="mt-8 max-w-xl font-editorial text-[clamp(3.2rem,6vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.05em]">
              A verdict
              <br />
              you can inspect.
            </h2>
          </div>

          <div className="mt-14 max-w-lg">
            <p className="text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Ranked rounds score the argument, not the identity behind it.
              Every verdict shows where each side was strongest.
            </p>
            <Link
              href="/arena"
              className="group mt-8 inline-flex items-center gap-5 text-sm font-semibold text-foreground"
            >
              Start with an open round
              <span className="grid h-9 w-9 place-items-center border border-border transition-colors group-hover:border-primary group-hover:text-primary">
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.7}
                />
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-[#0d0d13] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 xl:px-16">
          <div className="border border-[#2d2d38] bg-[#0a0a0f]">
            <div className="flex items-center justify-between border-b border-[#2d2d38] px-5 py-5 sm:px-7">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Round analysis / Preview
                </p>
                <p className="mt-2 text-sm font-semibold">
                  Argument quality breakdown
                </p>
              </div>
              <Trophy className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>

            <div className="grid grid-cols-[1fr_58px_58px] border-b border-[#2d2d38] px-5 py-3 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-[1fr_80px_80px] sm:px-7">
              <span>Criteria</span>
              <span className="text-center text-primary">Support</span>
              <span className="text-center">Against</span>
            </div>

            <div className="px-5 sm:px-7">
              {SCORE_PREVIEW.map((score) => (
                <div
                  key={score.label}
                  className="grid grid-cols-[1fr_58px_58px] items-center border-b border-[#24242e] py-5 last:border-b-0 sm:grid-cols-[1fr_80px_80px]"
                >
                  <div>
                    <p className="text-xs font-medium sm:text-sm">
                      {score.label}
                    </p>
                    <div className="mt-2 h-1 max-w-[260px] bg-[#24242e]">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${score.support * 5}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-center font-mono text-lg font-semibold tabular-nums text-primary">
                    {score.support}
                  </span>
                  <span className="text-center font-mono text-lg font-semibold tabular-nums text-muted-foreground">
                    {score.oppose}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 border-t border-[#2d2d38]">
              <div className="border-r border-[#2d2d38] px-5 py-6 sm:px-7">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                  Support total
                </p>
                <p className="mt-2 font-editorial text-4xl text-primary">69</p>
              </div>
              <div className="px-5 py-6 sm:px-7">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                  Against total
                </p>
                <p className="mt-2 font-editorial text-4xl text-foreground">
                  66
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 font-mono text-[8px] uppercase tracking-[0.1em] text-[#666675]">
            Scorecard anatomy shown. Completed ranked fights receive the same
            criteria breakdown and rating movement.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCallToAction() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-primary lg:block" />
      <div className="relative mx-auto grid max-w-[1440px] lg:grid-cols-[1fr_0.42fr]">
        <div className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12 xl:px-16">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Your turn
          </p>
          <h2 className="mt-6 max-w-4xl font-editorial text-[clamp(3.6rem,7vw,7.2rem)] font-medium leading-[0.86] tracking-[-0.05em]">
            The next round needs an argument.
          </h2>
          <Link
            href="/arena"
            className="group mt-10 inline-flex h-14 items-center gap-10 bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#927dff]"
          >
            Take a side
            <Swords
              className="h-4 w-4 transition-transform group-hover:rotate-6"
              strokeWidth={1.7}
            />
          </Link>
        </div>
        <div className="hidden items-center justify-center text-[#0b0913] lg:flex">
          <Swords className="h-20 w-20" strokeWidth={0.85} />
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer id="rules" className="border-t border-border">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12 xl:px-16">
        <Wordmark showBeta={false} />
        <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs text-muted-foreground">
          <Link href="/arena" className="transition-colors hover:text-foreground">
            Community rules
          </Link>
          <span>Privacy-first rooms</span>
          <span>Terms coming soon</span>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#60606e]">
          CivicRound / Built for the argument
        </p>
      </div>
    </footer>
  );
}
