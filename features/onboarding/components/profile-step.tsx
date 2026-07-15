"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Fingerprint, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createGuestIdentity } from "@/features/auth/services/guest-auth.service";
import type { GuestProfile } from "@/features/debate/types/debate.types";

export function ProfileStep({ onComplete }: { onComplete: (profile: GuestProfile) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const createGuest = useMutation({
    mutationFn: createGuestIdentity,
    onSuccess: onComplete,
  });

  const canContinue = displayName.trim().length >= 2 && isAdult && acceptedRules;

  return (
    <section className="screen-enter mx-auto max-w-4xl">
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase text-primary">
          <Fingerprint className="size-4" />
          Guest identity
        </div>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Enter the arena with a name, not a profile.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          No public account is required for this showcase. Your guest identity keeps the round accountable and reportable.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form
          className="broadcast-rule border border-border bg-card p-5 pt-7 sm:p-7 sm:pt-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) createGuest.mutate(displayName);
          }}
        >
          <label htmlFor="display-name" className="font-mono text-[10px] uppercase text-muted-foreground">
            Display name
          </label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How should your opponent address you?"
            maxLength={32}
            autoComplete="nickname"
            className="mt-2 bg-background"
          />

          <div className="mt-6 grid gap-4 border-t border-border pt-6">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
              <Checkbox checked={isAdult} onCheckedChange={(value) => setIsAdult(value === true)} />
              <span>I confirm that I am at least 18 years old.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
              <Checkbox checked={acceptedRules} onCheckedChange={(value) => setAcceptedRules(value === true)} />
              <span>
                I agree to the <Link href="/rules" className="font-semibold text-primary underline underline-offset-4">arena rules</Link> and will debate without threats, hate, harassment, or explicit content.
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
            className="mt-7 w-full sm:w-auto"
          >
            {createGuest.isPending ? "Preparing identity" : "Build my round"}
            <ArrowRight />
          </Button>
        </form>

        <aside className="border border-border bg-muted/40 p-5">
          <ShieldCheck className="size-6 text-secondary" />
          <h2 className="mt-5 font-display text-xl font-semibold">Your safety line</h2>
          <div className="mt-5 grid gap-4 font-mono text-[10px] uppercase text-muted-foreground">
            <div className="border-t border-border pt-3">
              <span className="text-secondary">01</span> Leave instantly
            </div>
            <div className="border-t border-border pt-3">
              <span className="text-secondary">02</span> Report the round
            </div>
            <div className="border-t border-border pt-3">
              <span className="text-secondary">03</span> No recording
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
