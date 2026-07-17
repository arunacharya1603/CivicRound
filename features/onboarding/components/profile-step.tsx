"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Fingerprint,
  ShieldCheck,
  VideoOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RulesDialog } from "@/components/rules/rules-dialog";
import { createGuestIdentity } from "@/features/auth/services/guest-auth.service";
import type { GuestProfile } from "@/features/debate/types/debate.types";
import { cn } from "@/lib/utils";

const SAFETY_POINTS = [
  { label: "Anonymous", icon: Fingerprint },
  { label: "No recording", icon: VideoOff },
  { label: "Leave anytime", icon: X },
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
    <section className="screen-enter relative isolate flex min-h-[calc(100svh-3rem)] items-center justify-center overflow-hidden px-4 py-4 text-center sm:px-6 sm:py-6 lg:min-h-[calc(100svh-3.5rem)] lg:py-8">
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] -z-10 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.025] blur-3xl sm:h-[48rem] sm:w-[48rem]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[28rem]">
        <div className="relative mx-auto mb-4 grid size-20 place-items-center sm:mb-6 sm:size-24 lg:size-28">
          <span className="absolute inset-0 rounded-full border border-primary/10" />
          <span className="absolute inset-2 rounded-full border border-dashed border-primary/20 [animation:opponent-search-orbit_12s_linear_infinite]" />
          <span className="absolute inset-4 rounded-full bg-primary/[0.08] blur-xl" />
          <span className="neon-ring relative grid size-14 place-items-center rounded-full bg-[#081216]/90 sm:size-16 lg:size-[4.5rem]">
            <Fingerprint className="size-6 text-primary sm:size-7 lg:size-8" />
          </span>
        </div>

        <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:mb-4">
          <ShieldCheck className="size-3 text-secondary" />
          Private by design
        </div>

        <h1 className="text-balance font-display text-3xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
          Who are you today?
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground sm:mt-3 sm:text-[15px]">
          Choose a debate name. Your real identity stays out of the room.
        </p>

        <form
          className="mt-5 w-full sm:mt-7"
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) createGuest.mutate(displayName);
          }}
        >
          <label htmlFor="display-name" className="sr-only">
            Debate name
          </label>
          <div className="relative">
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your debate name"
              maxLength={32}
              autoComplete="nickname"
              autoFocus
              className="h-13 rounded-full border-white/10 bg-white/[0.045] pl-6 pr-16 text-center text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-300 placeholder:text-muted-foreground/55 focus:border-primary/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-primary/15 sm:h-14"
            />
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground/65">
              {displayName.length}/32
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-white/[0.025] p-1 text-left shadow-[0_16px_50px_rgba(0,0,0,0.18)] sm:mt-4">
            <div className="flex min-h-14 items-center justify-between gap-4 rounded-2xl px-3.5 py-2.5 transition-colors hover:bg-white/[0.025] sm:px-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  I am 18 or older
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Required for live debate rooms
                </span>
              </span>
              <ToggleSwitch
                checked={isAdult}
                onToggle={() => setIsAdult((value) => !value)}
                label="Confirm that you are 18 or older"
              />
            </div>

            <div className="mx-3 h-px bg-white/[0.06]" />

            <div className="flex min-h-14 items-center justify-between gap-4 rounded-2xl px-3.5 py-2.5 transition-colors hover:bg-white/[0.025] sm:px-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  I accept the{" "}
                  <RulesDialog
                    trigger={
                      <button
                        type="button"
                        className="text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80"
                      >
                        arena rules
                      </button>
                    }
                  />
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Keep it civil, focused, and safe
                </span>
              </span>
              <ToggleSwitch
                checked={acceptedRules}
                onToggle={() => setAcceptedRules((value) => !value)}
                label="Accept the arena rules"
              />
            </div>
          </div>

          {createGuest.error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              Could not create identity. Please try again.
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={!canContinue || createGuest.isPending}
            className={cn(
              "mt-4 h-12 w-full rounded-full text-sm font-semibold transition-all duration-300 sm:mt-5 sm:h-13 sm:text-base",
              canContinue
                ? "border-primary/60 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-[0_0_28px_rgba(0,240,255,0.18)] hover:border-primary hover:brightness-110 hover:shadow-[0_0_36px_rgba(0,240,255,0.3)]"
                : "border-white/[0.06] bg-white/[0.055] text-muted-foreground",
            )}
          >
            {createGuest.isPending ? "Preparing your seat..." : "Enter the arena"}
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground/65 sm:mt-5 sm:text-[11px]">
          {SAFETY_POINTS.map(({ label, icon: Icon }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-3" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        checked
          ? "border-primary/60 bg-primary shadow-[0_0_14px_rgba(0,240,255,0.18)]"
          : "border-white/10 bg-white/[0.08]",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-[1.375rem] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
