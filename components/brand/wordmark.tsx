import Link from "next/link";

import { cn } from "@/lib/utils";

export function Wordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-3 text-foreground", className)}
      aria-label="CivicRound home"
    >
      <span className="h-6 w-1 rounded-sm bg-primary" aria-hidden="true" />
      <span
        className={cn(
          "font-display text-xl font-semibold leading-none sm:text-2xl",
          compact && "hidden sm:inline",
        )}
      >
        CivicRound
      </span>
      <span className="hidden border-l border-border pl-3 font-mono text-[9px] uppercase text-muted-foreground sm:inline">
        Beta
      </span>
    </Link>
  );
}
