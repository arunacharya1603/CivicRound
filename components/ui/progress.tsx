"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const offset = 100 - (value || 0);
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full bg-primary transition-transform duration-500"
        style={{ transform: "translateX(-" + offset + "%)" }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
