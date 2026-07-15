"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DebatePhase } from "@/features/debate/types/debate.types";

type TimerState = {
  phaseIndex: number;
  secondsLeft: number;
  running: boolean;
  complete: boolean;
};

export function useDebateTimer(phases: DebatePhase[], onComplete: () => void) {
  const [timer, setTimer] = useState<TimerState>({
    phaseIndex: 0,
    secondsLeft: phases[0]?.duration ?? 0,
    running: false,
    complete: false,
  });
  const completionNotifiedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!timer.running) return;

    const intervalId = window.setInterval(() => {
      setTimer((current) => {
        if (!current.running) return current;
        if (current.secondsLeft > 1) {
          return { ...current, secondsLeft: current.secondsLeft - 1 };
        }

        const nextPhaseIndex = current.phaseIndex + 1;
        const nextPhase = phases[nextPhaseIndex];
        if (nextPhase) {
          return {
            ...current,
            phaseIndex: nextPhaseIndex,
            secondsLeft: nextPhase.duration,
          };
        }

        return {
          ...current,
          secondsLeft: 0,
          running: false,
          complete: true,
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [phases, timer.running]);

  useEffect(() => {
    if (timer.complete && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current();
    }
  }, [timer.complete]);

  const start = useCallback(() => {
    completionNotifiedRef.current = false;
    setTimer({
      phaseIndex: 0,
      secondsLeft: phases[0]?.duration ?? 0,
      running: true,
      complete: false,
    });
  }, [phases]);

  const currentPhase = phases[timer.phaseIndex] ?? phases[0];
  const phaseProgress = useMemo(() => {
    if (!currentPhase?.duration) return 0;
    return ((currentPhase.duration - timer.secondsLeft) / currentPhase.duration) * 100;
  }, [currentPhase, timer.secondsLeft]);

  return {
    currentPhase,
    phaseIndex: timer.phaseIndex,
    secondsLeft: Math.max(0, timer.secondsLeft),
    phaseProgress,
    running: timer.running,
    start,
  };
}
