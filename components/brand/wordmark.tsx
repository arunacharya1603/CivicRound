import Link from "next/link";

import { cn } from "@/lib/utils";

export function Wordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-display font-bold text-foreground", className)}
      aria-label="CivicRound home"
    >
      <span className="grid size-7 place-items-center rounded-sm border border-primary/60 bg-primary text-sm font-black text-primary-foreground">
        C
      </span>
      <span className={cn("text-lg", compact && "hidden sm:inline")}>CivicRound</span>
      <span className="border-l border-border pl-2 font-mono text-[9px] font-semibold uppercase text-muted-foreground">
        Beta
      </span>
    </Link>
  );
}
