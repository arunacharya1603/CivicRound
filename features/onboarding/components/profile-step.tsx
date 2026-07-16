"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Fingerprint,
  ShieldCheck,
  VideoOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createGuestIdentity } from "@/features/auth/services/guest-auth.service";
import type { GuestProfile } from "@/features/debate/types/debate.types";

const SAFETY_POINTS = [
  { label: "Leave instantly", icon: X },
  { label: "Report the round", icon: ShieldCheck },
  { label: "No recording", icon: VideoOff },
] as const;

export function ProfileStep({
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

  return (
    <section className="screen-enter mx-auto max-w-6xl">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.72fr)] lg:gap-16 xl:gap-24">
        <div className="lg:pt-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-primary">
            <Fingerprint className="size-4" />
            Guest identity
          </div>

          <h1 className="text-balance mt-5 max-w-2xl font-display text-[2.75rem] font-semibold leading-[0.98] sm:text-6xl lg:text-[4.4rem]">
            Enter the round as yourself.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Use a display name and move straight to the motion. No public profile,
            follower count, or permanent debate history.
          </p>

          <div className="mt-10 hidden border-t border-border lg:block">
            <p className="py-4 text-sm font-semibold">
              Your safety line, always within reach
            </p>
            <div className="grid border-y border-border sm:grid-cols-3">
              {SAFETY_POINTS.map(({ label, icon: Icon }, index) => (
                <div
                  key={label}
                  className="flex min-h-16 items-center gap-3 border-b border-border py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="mb-0.5 block font-mono text-[9px] text-secondary">
                      0{index + 1}
                    </span>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form
          className="surface-lift broadcast-rule border border-border bg-card p-5 pt-8 sm:p-8 sm:pt-10"
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) createGuest.mutate(displayName);
          }}
        >
          <div className="border-b border-border pb-6">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Round entry
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Create your guest identity
            </h2>
          </div>

          <div className="mt-6">
            <label
              htmlFor="display-name"
              className="text-xs font-semibold text-foreground"
            >
              Display name
            </label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your debate name"
              maxLength={32}
              autoComplete="nickname"
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              This is the only name your opponent will see.
            </p>
          </div>

          <div className="mt-6 divide-y divide-border border-y border-border">
            <label className="flex cursor-pointer items-start gap-3 py-4 text-sm leading-6">
              <Checkbox
                checked={isAdult}
                onCheckedChange={(value) => setIsAdult(value === true)}
              />
              <span>I confirm that I am at least 18 years old.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 py-4 text-sm leading-6">
              <Checkbox
                checked={acceptedRules}
                onCheckedChange={(value) => setAcceptedRules(value === true)}
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/rules"
                  className="font-semibold text-primary underline decoration-primary/50 underline-offset-4"
                >
                  arena rules
                </Link>{" "}
                and will debate without threats, hate, harassment, or explicit
                content.
              </span>
            </label>
          </div>

          {createGuest.error ? (
            <p className="mt-5 border-l-2 border-destructive pl-3 text-sm text-destructive">
              We could not create your guest identity. Please try again.
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={!canContinue || createGuest.isPending}
            className="mt-7 w-full"
          >
            {createGuest.isPending ? "Preparing identity" : "Continue to motion"}
            <ArrowRight />
          </Button>
        </form>

        <div className="lg:hidden">
          <p className="border-t border-border py-4 text-sm font-semibold">
            Your safety line, always within reach
          </p>
          <div className="border-y border-border">
            {SAFETY_POINTS.map(({ label, icon: Icon }, index) => (
              <div
                key={label}
                className="flex min-h-16 items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
                  <Icon className="size-4" />
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="mb-0.5 block font-mono text-[9px] text-secondary">
                    0{index + 1}
                  </span>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
