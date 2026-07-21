"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  LockKeyhole,
  ShieldAlert,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createInvestorMemberIdentity,
  signInMemberIdentity,
} from "@/features/auth/services/member-auth.service";
import type {
  MatchMode,
  MemberProfile,
} from "@/features/debate/types/debate.types";
import { MODE_RULES } from "@/features/modes/data/mode-rules";

export function AccountStep({
  mode,
  member,
  onBack,
  onComplete,
}: {
  mode: MatchMode;
  member: MemberProfile | null;
  onBack: () => void;
  onComplete: (profile: MemberProfile) => void;
}) {
  if (member) {
    return (
      <ExistingMember
        mode={mode}
        member={member}
        onBack={onBack}
        onComplete={onComplete}
      />
    );
  }

  return (
    <NewMember
      mode={mode}
      onBack={onBack}
      onComplete={onComplete}
    />
  );
}

function NewMember({
  mode,
  onBack,
  onComplete,
}: {
  mode: MatchMode;
  onBack: () => void;
  onComplete: (profile: MemberProfile) => void;
}) {
  const [displayName, setDisplayName] = useState("Arun Acharya");
  const [handle, setHandle] = useState("arun_debates");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const signIn = useMutation({
    mutationFn: () => signInMemberIdentity({ email, password }),
    onSuccess: onComplete,
  });

  const createDemoProfile = () => {
    try {
      setLocalError("");
      onComplete(createInvestorMemberIdentity({ displayName, handle }));
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not create the profile.",
      );
    }
  };

  return (
    <section className="screen-enter mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1280px] lg:grid-cols-[0.88fr_1.12fr] lg:min-h-[calc(100svh-4.5rem)]">
      <div className="flex flex-col justify-between border-border bg-primary px-5 py-10 text-[#0b0913] sm:px-8 lg:border-r lg:px-12 lg:py-14">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft className="size-4" />
          Back to modes
        </button>

        <div className="my-16">
          <Trophy className="size-8" strokeWidth={1.4} />
          <p className="mt-8 font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
            {MODE_RULES[mode].name}
          </p>
          <h1 className="mt-4 max-w-xl font-editorial text-[clamp(3.6rem,7vw,6.5rem)] font-medium leading-[0.84] tracking-[-0.05em]">
            Rating needs a real identity.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#282044]">
            Anonymous identities can never enter rated matchmaking. Your
            competitor profile owns the rating, record, penalties, and appeal
            history.
          </p>
        </div>

        <div className="grid grid-cols-3 border-y border-[#32285d]/25 py-4 font-mono text-[8px] font-bold uppercase tracking-[0.11em]">
          <span>Persistent</span>
          <span className="text-center">Rating tracked</span>
          <span className="text-right">Appeal rights</span>
        </div>
      </div>

      <div className="px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-primary" />
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
              Investor showcase access
            </p>
          </div>
          <h2 className="mt-3 font-editorial text-4xl tracking-[-0.035em] sm:text-5xl">
            Create a competitor profile
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This one-click showcase profile persists on this device and unlocks
            the complete rated flow immediately.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Display name
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={32}
                className="mt-2 h-12 rounded-none border-border bg-card"
              />
            </label>
            <label className="text-xs font-semibold">
              Competitor handle
              <Input
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                maxLength={24}
                className="mt-2 h-12 rounded-none border-border bg-card"
              />
            </label>
          </div>

          {localError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {localError}
            </p>
          ) : null}

          <Button
            size="lg"
            onClick={createDemoProfile}
            className="mt-5 h-13 w-full rounded-none"
          >
            Create competitor profile
            <ArrowRight className="ml-1 size-4" />
          </Button>

          <div className="my-9 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              Production account
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              signIn.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold">
                Email
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="mt-2 h-12 rounded-none border-border bg-card"
                />
              </label>
              <label className="text-xs font-semibold">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="mt-2 h-12 rounded-none border-border bg-card"
                />
              </label>
            </div>

            {signIn.error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {signIn.error.message}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              variant="outline"
              disabled={!email || password.length < 6 || signIn.isPending}
              className="mt-4 h-12 w-full rounded-none"
            >
              <LockKeyhole className="size-4" />
              {signIn.isPending ? "Signing in" : "Sign in to existing account"}
            </Button>
          </form>

          <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
            The anonymous guest session remains separate and cannot be promoted
            into ranked matchmaking by changing the URL.
          </p>
        </div>
      </div>
    </section>
  );
}

function ExistingMember({
  mode,
  member,
  onBack,
  onComplete,
}: {
  mode: MatchMode;
  member: MemberProfile;
  onBack: () => void;
  onComplete: (profile: MemberProfile) => void;
}) {
  return (
    <section className="screen-enter flex min-h-[calc(100svh-4rem)] items-center justify-center px-5 py-10 lg:min-h-[calc(100svh-4.5rem)]">
      <div className="w-full max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to modes
        </button>
        <p className="mt-10 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
          Competitor identity confirmed
        </p>
        <h1 className="mt-3 font-editorial text-5xl tracking-[-0.04em] sm:text-6xl">
          Ready for {MODE_RULES[mode].name}, {member.displayName}?
        </h1>

        <div className="mt-8 grid grid-cols-[1fr_auto] items-center border-y border-border py-5">
          <div>
            <p className="text-lg font-semibold">{member.displayName}</p>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground">
              @{member.handle} / Persistent account
            </p>
          </div>
          <div className="text-right">
            <p className="font-editorial text-4xl text-primary">
              {member.rating}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
              Rating
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => onComplete(member)}
          className="mt-6 h-13 w-full rounded-none"
        >
          Continue to ranked setup
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </section>
  );
}
