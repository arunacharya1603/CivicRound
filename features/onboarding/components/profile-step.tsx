"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  VideoOff,
  X,
} from "lucide-react";

import { RulesDialog } from "@/components/rules/rules-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createGuestIdentity } from "@/features/auth/services/guest-auth.service";
import type { GuestProfile } from "@/features/debate/types/debate.types";
import { cn } from "@/lib/utils";

const SAFETY_POINTS = [
  { label: "Anonymous", icon: Fingerprint },
  { label: "No recording", icon: VideoOff },
  { label: "Leave anytime", icon: X },
] as const;

export function ProfileStep({
  profile,
  onComplete,
}: {
  profile: GuestProfile | null;
  onComplete: (profile: GuestProfile) => void;
}) {
  if (profile) {
    return (
      <SessionProfileStep
        profile={profile}
        onContinue={() => onComplete(profile)}
      />
    );
  }

  return <NewProfileStep onComplete={onComplete} />;
}

function NewProfileStep({
  onComplete,
}: {
  onComplete: (profile: GuestProfile) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const createGuest = useMutation({
    mutationFn: createGuestIdentity,
    onSuccess: onComplete,
  });

  const canContinue =
    displayName.trim().length >= 2 && isAdult && acceptedRules;
  const remainingSteps =
    Number(displayName.trim().length < 2) +
    Number(!isAdult) +
    Number(!acceptedRules);

  return (
    <section className="screen-enter relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#0b0b10] px-5 py-5 text-[#f5f3fa] sm:px-8 sm:py-10 lg:min-h-[calc(100svh-4.5rem)] lg:px-10 lg:py-0">
      <div
        className="absolute inset-y-0 right-0 -z-10 hidden w-[43%] border-l border-[#2a2933] bg-[#111118] lg:block"
        aria-hidden="true"
      />

      <div className="mx-auto grid min-h-[calc(100svh-7.5rem)] w-full max-w-[82rem] items-center gap-5 sm:min-h-[calc(100svh-9rem)] lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(27rem,0.78fr)] lg:gap-0">
        <div className="lg:pr-16 xl:pr-24">
          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a894ff]">
            <span className="h-px w-8 bg-[#8066ff]" aria-hidden="true" />
            Live, one-to-one debate
          </div>

          <h1 className="mt-3 max-w-[42rem] text-balance font-editorial text-[2.35rem] font-semibold leading-[0.93] sm:mt-5 sm:text-[3.5rem] lg:text-[clamp(3rem,6vw,5.75rem)] lg:leading-[0.92] tracking-[-0.045em] text-[#f5f3fa]">
            Better arguments start with equal time.
          </h1>

          <p className="mt-5 hidden max-w-[37rem] text-[15px] sm:block leading-6 text-[#aaa6b5] sm:mt-7 sm:text-lg sm:leading-8">
            Choose a name, take a side, and meet someone ready to disagree
            well. No profile building. No public follower count.
          </p>

          <div className="mt-7 hidden border-t border-[#2f2e38] pt-5 sm:mt-10 sm:block sm:pt-6">
            <p className="text-xs font-semibold text-[#f5f3fa]">
              A private seat for one conversation.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {SAFETY_POINTS.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs text-[#9d99a8]"
                >
                  <Icon className="size-3.5 text-[#a894ff]" strokeWidth={1.8} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:pl-14 xl:pl-20">
          <div className="mx-auto w-full max-w-[31rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a894ff]">
              Private entry
            </p>
            <h2 className="mt-1.5 font-editorial text-[2rem] font-semibold leading-none tracking-[-0.035em] text-[#f5f3fa] sm:mt-2 sm:text-[3rem]">
              Join the next round
            </h2>
            <p className="mt-3 hidden max-w-md text-sm leading-6 sm:block text-[#9d99a8]">
              Your debate name stays in this browser session and is shown only
              to your opponent.
            </p>

            <form
              className="mt-4 sm:mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (canContinue) createGuest.mutate(displayName);
              }}
            >
              <div className="flex items-end justify-between gap-4">
                <label
                  htmlFor="display-name"
                  className="text-sm font-semibold text-[#f5f3fa]"
                >
                  Debate name
                </label>
                <span className="text-[11px] tabular-nums text-[#8e8999]">
                  {displayName.length}/32
                </span>
              </div>

              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. CivicVoice"
                maxLength={32}
                minLength={2}
                autoComplete="nickname"
                autoFocus
                aria-describedby="display-name-hint"
                className="mt-2 h-12 rounded-lg sm:h-13 border-[#3b3946] bg-[#15151d] px-4 text-base text-[#f5f3fa] shadow-none placeholder:text-[#6f6b78] focus-visible:border-[#8066ff] focus-visible:ring-[#8066ff]/20"
              />
              <p
                id="display-name-hint"
                className="mt-2 text-xs leading-5 text-[#8e8999]"
              >
                Use a nickname, not your legal name.
              </p>

              <fieldset className="mt-4 border-y border-[#2f2e38] sm:mt-5">
                <legend className="sr-only">Required confirmations</legend>

                <div className="flex items-start gap-3.5 py-3 sm:py-4">
                  <Checkbox
                    id="adult-confirmation"
                    type="button"
                    checked={isAdult}
                    onCheckedChange={(checked) =>
                      setIsAdult(checked === true)
                    }
                    aria-label="Confirm that you are 18 or older"
                    className="mt-0.5 size-5 rounded-[0.3rem] border-[#5a5664] bg-transparent text-white focus-visible:ring-[#8066ff]/35 data-[state=checked]:border-[#8066ff] data-[state=checked]:bg-[#8066ff]"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor="adult-confirmation"
                      className="block cursor-pointer text-sm font-semibold text-[#f5f3fa]"
                    >
                      I am 18 or older
                    </label>
                    <p className="mt-0.5 text-xs leading-5 text-[#8e8999]">
                      Required to participate in a live debate.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 border-t border-[#2f2e38] py-3 sm:py-4">
                  <Checkbox
                    id="rules-confirmation"
                    type="button"
                    checked={acceptedRules}
                    onCheckedChange={(checked) =>
                      setAcceptedRules(checked === true)
                    }
                    aria-label="Agree to keep the debate civil"
                    className="mt-0.5 size-5 rounded-[0.3rem] border-[#5a5664] bg-transparent text-white focus-visible:ring-[#8066ff]/35 data-[state=checked]:border-[#8066ff] data-[state=checked]:bg-[#8066ff]"
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor="rules-confirmation"
                      className="block cursor-pointer text-sm font-semibold text-[#f5f3fa]"
                    >
                      I agree to keep the debate civil
                    </label>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-[#8e8999]">
                      <span>Required for every round.</span>
                      <RulesDialog
                        trigger={
                          <button
                            type="button"
                            className="font-semibold text-[#a894ff] underline decoration-[#a894ff]/35 underline-offset-4 transition-colors hover:text-[#c3b7ff]"
                          >
                            Read the rules
                          </button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {createGuest.error ? (
                <p className="mt-3 text-sm text-[#ff766d]" role="alert">
                  Could not create your debate identity. Please try again.
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-4 sm:mt-4">
                <p
                  className="flex items-center gap-2 text-xs text-[#9d99a8]"
                  aria-live="polite"
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      canContinue ? "bg-[#52c48d]" : "bg-[#716d7a]",
                    )}
                    aria-hidden="true"
                  />
                  {canContinue
                    ? "Ready to enter."
                    : `${remainingSteps} ${remainingSteps === 1 ? "item" : "items"} left.`}
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8e8999]">
                  <LockKeyhole className="size-3.5" />
                  Private session
                </span>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!canContinue || createGuest.isPending}
                className={cn(
                  "mt-2.5 h-12 w-full rounded-lg border text-sm sm:h-13 font-semibold shadow-none transition-all duration-200",
                  canContinue
                    ? "border-[#8066ff] bg-[#8066ff] text-white shadow-[0_10px_30px_rgba(128,102,255,0.18)] hover:-translate-y-px hover:border-[#8f77ff] hover:bg-[#8f77ff] hover:shadow-[0_14px_36px_rgba(128,102,255,0.26)] active:translate-y-0"
                    : "border-[#393052] bg-[#251f36] text-[#8e7fc2]",
                  "disabled:border-[#393052] disabled:bg-[#251f36] disabled:text-[#8e7fc2]",
                )}
              >
                {createGuest.isPending ? "Preparing your seat..." : "Enter the arena"}
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </form>

            <nav
              aria-label="Legal links"
              className="mt-3 flex items-center justify-end gap-4 sm:mt-5 text-xs text-[#8e8999]"
            >
              <Link
                className="transition-colors hover:text-[#f5f3fa]"
                href="/privacy"
              >
                Privacy
              </Link>
              <Link
                className="transition-colors hover:text-[#f5f3fa]"
                href="/terms"
              >
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

function SessionProfileStep({
  profile,
  onContinue,
}: {
  profile: GuestProfile;
  onContinue: () => void;
}) {
  return (
    <section className="screen-enter flex min-h-[calc(100svh-4rem)] items-center justify-center bg-[#0b0b10] px-5 py-10 text-[#f5f3fa] lg:min-h-[calc(100svh-4.5rem)]">
      <div className="w-full max-w-[35rem]">
        <span className="grid size-12 place-items-center rounded-full bg-[#8066ff] font-display text-lg font-semibold text-white">
          {profile.displayName.slice(0, 1).toUpperCase()}
        </span>

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a894ff]">
          Private identity active
        </p>
        <h1 className="mt-2 text-balance font-editorial text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
          Welcome back, {profile.displayName}.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-[#9d99a8]">
          Your debate name is ready for this browser session. Continue to choose
          a motion and take a side.
        </p>

        <div className="mt-8 flex items-center justify-between gap-4 border-y border-[#2f2e38] py-4">
          <span>
            <span className="block text-xs text-[#8e8999]">Debate name</span>
            <span className="mt-1 block max-w-[20rem] truncate text-lg font-semibold">
              {profile.displayName}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#52c48d]">
            <ShieldCheck className="size-4" />
            Active
          </span>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onContinue}
          className="mt-5 h-13 w-full rounded-lg border-[#8066ff] bg-[#8066ff] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(128,102,255,0.18)] transition-all hover:-translate-y-px hover:border-[#8f77ff] hover:bg-[#8f77ff] hover:shadow-[0_14px_36px_rgba(128,102,255,0.26)] active:translate-y-0"
        >
          Continue as {profile.displayName}
          <ArrowRight className="ml-1 size-4" />
        </Button>

        <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#8e8999]">
          <LockKeyhole className="size-3.5" />
          This identity ends when your browser session ends.
        </p>
      </div>
    </section>
  );
}