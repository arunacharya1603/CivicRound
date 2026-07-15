"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DebatePhase } from "@/features/debate/types/debate.types";
import { getDebateDuration } from "@/features/debate/lib/debate-phases";

export function useSynchronizedDebateTimer({
  phases,
  startedAt,
  serverNow,
  active,
  onComplete,
}: {
  phases: DebatePhase[];
  startedAt: string | null;
  serverNow: string | null;
  active: boolean;
  onComplete: () => void;
}) {
  const [clock, setClock] = useState(() => Date.now());
  const notifiedStartRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!active || !startedAt) return;
    const intervalId = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [active, startedAt]);

  const snapshot = useMemo(() => {
    const totalDuration = getDebateDuration(phases);
    if (!startedAt) {
      return {
        phaseIndex: 0,
        currentPhase: phases[0],
        secondsLeft: phases[0]?.duration ?? 0,
        totalSecondsLeft: totalDuration,
        phaseProgress: 0,
        complete: false,
      };
    }

    const serverOffset = serverNow
      ? new Date(serverNow).getTime() - clock
      : 0;
    const elapsed = Math.max(
      0,
      Math.floor((clock + serverOffset - new Date(startedAt).getTime()) / 1000),
    );
    const boundedElapsed = Math.min(elapsed, totalDuration);

    let phaseIndex = phases.length - 1;
    let phaseStart = 0;
    for (let index = 0; index < phases.length; index += 1) {
      const phaseEnd = phaseStart + phases[index].duration;
      if (boundedElapsed < phaseEnd) {
        phaseIndex = index;
        break;
      }
      phaseStart = phaseEnd;
    }

    const currentPhase = phases[phaseIndex];
    const elapsedInPhase = Math.min(
      currentPhase?.duration ?? 0,
      Math.max(0, boundedElapsed - phaseStart),
    );

    return {
      phaseIndex,
      currentPhase,
      secondsLeft: Math.max(0, (currentPhase?.duration ?? 0) - elapsedInPhase),
      totalSecondsLeft: Math.max(0, totalDuration - boundedElapsed),
      phaseProgress: currentPhase?.duration
        ? (elapsedInPhase / currentPhase.duration) * 100
        : 0,
      complete: boundedElapsed >= totalDuration,
    };
  }, [clock, phases, serverNow, startedAt]);

  useEffect(() => {
    if (
      active &&
      startedAt &&
      snapshot.complete &&
      notifiedStartRef.current !== startedAt
    ) {
      notifiedStartRef.current = startedAt;
      onCompleteRef.current();
    }
  }, [active, snapshot.complete, startedAt]);

  return {
    ...snapshot,
    running: active && Boolean(startedAt) && !snapshot.complete,
  };
}
