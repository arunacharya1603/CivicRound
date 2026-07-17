"use client";

import type { ReactNode } from "react";
import { Clock3, MessageCircle, ShieldCheck, Siren } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const RULES = [
  {
    title: "Debate the position",
    body: "Challenge ideas, evidence, and policy, not identity, appearance, background, or private life.",
    icon: MessageCircle,
  },
  {
    title: "Respect the clock",
    body: "Speak during your assigned phase. Keep claims focused and respond directly to the other side.",
    icon: Clock3,
  },
  {
    title: "Protect privacy",
    body: "Never share private information or secretly record and redistribute another participant's feed.",
    icon: ShieldCheck,
  },
  {
    title: "Leave and report",
    body: "Exit immediately if a conversation feels unsafe. Reports never include a video recording.",
    icon: Siren,
  },
] as const;

export function RulesDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88svh] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[1.5rem] border-white/[0.09] bg-[#090b10]/95 p-0 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_60px_rgba(0,240,255,0.05)] backdrop-blur-2xl sm:rounded-[1.75rem]">
        <DialogHeader className="border-b border-white/[0.07] p-5 pr-14 text-left sm:p-6 sm:pr-16">
          <span className="mb-1 inline-flex w-fit items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="size-3.5" />
            Community standard / 18+
          </span>
          <DialogTitle className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
            Arena rules
          </DialogTitle>
          <DialogDescription className="max-w-xl text-xs leading-5 sm:text-sm sm:leading-6">
            Strong disagreement is welcome. Personal attacks, unsafe behavior,
            and privacy violations are not.
          </DialogDescription>
        </DialogHeader>

        <ol className="min-h-0 overflow-y-auto px-5 sm:px-6">
          {RULES.map(({ title, body, icon: Icon }, index) => (
            <li
              key={title}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-white/[0.07] py-4 text-left last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-4 sm:py-5"
            >
              <div className="relative pt-0.5">
                <span className="grid size-9 place-items-center rounded-full border border-primary/15 bg-primary/[0.07] text-primary sm:size-10">
                  <Icon className="size-4" />
                </span>
                <span className="absolute -left-0.5 -top-1 rounded-full bg-[#090b10] px-1 font-mono text-[8px] font-semibold text-primary/70">
                  0{index + 1}
                </span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-[15px]">
                  {title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[10px] leading-4 text-muted-foreground sm:max-w-sm sm:text-[11px]">
            You can leave any round instantly. CivicRound does not record showcase debates.
          </p>
          <DialogClose asChild>
            <Button className="h-10 rounded-full border-primary/50 bg-gradient-to-r from-primary to-secondary px-6 text-primary-foreground hover:brightness-110">
              I understand
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
