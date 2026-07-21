'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type LocalParticipant, Track } from 'livekit-client';

import { uploadDebateTurn } from '@/features/debate/services/judge.service';

export type TurnTranscriptionStatus =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'secured'
  | 'error';

interface WavTurnRecorder {
  stop: () => Promise<Blob>;
}

function encodePcm16Wav(chunks: Float32Array[], sampleRate: number) {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (const value of chunk) {
      const clamped = Math.max(-1, Math.min(1, value));
      view.setInt16(
        offset,
        clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function createWavTurnRecorder(
  mediaTrack: MediaStreamTrack,
): Promise<WavTurnRecorder> {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error('This browser cannot create a supported AI transcript.');
  }

  const audioContext = new AudioContextConstructor({
    latencyHint: 'interactive',
    sampleRate: 16_000,
  });
  await audioContext.resume();

  const source = audioContext.createMediaStreamSource(
    new MediaStream([mediaTrack]),
  );
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentOutput = audioContext.createGain();
  const chunks: Float32Array[] = [];
  silentOutput.gain.value = 0;
  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(silentOutput);
  silentOutput.connect(audioContext.destination);

  let stopped = false;
  return {
    stop: async () => {
      if (stopped) {
        throw new Error('The turn audio recorder was already stopped.');
      }
      stopped = true;
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      silentOutput.disconnect();
      await audioContext.close();
      return encodePcm16Wav(chunks, audioContext.sampleRate);
    },
  };
}

export function useTurnTranscription({
  enabled,
  roomId,
  roomStatus,
  localParticipant,
  isMicrophoneEnabled,
  isYourTurn,
  phaseId,
  phaseIndex,
  phaseDuration,
}: {
  enabled: boolean;
  roomId: string;
  roomStatus: string | undefined;
  localParticipant: LocalParticipant;
  isMicrophoneEnabled: boolean;
  isYourTurn: boolean;
  phaseId: string | null;
  phaseIndex: number;
  phaseDuration: number;
}) {
  const recorderRef = useRef<WavTurnRecorder | null>(null);
  const recorderPromiseRef = useRef<Promise<WavTurnRecorder> | null>(null);
  const activeTurnRef = useRef<{
    phaseId: string;
    turnSequence: number;
    durationSeconds: number;
  } | null>(null);
  const uploadsRef = useRef<Promise<void>>(Promise.resolve());
  const stopRef = useRef<Promise<void>>(Promise.resolve());
  const completedPhasesRef = useRef(new Set<string>());
  const [status, setStatus] = useState<TurnTranscriptionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopRecording = useCallback(() => {
    const turn = activeTurnRef.current;
    if (!turn) return stopRef.current;

    activeTurnRef.current = null;
    const recorder = recorderRef.current;
    const pendingRecorder = recorderPromiseRef.current;
    recorderRef.current = null;
    recorderPromiseRef.current = null;

    stopRef.current = (async () => {
      const activeRecorder = recorder ?? (await pendingRecorder);
      if (!activeRecorder) {
        throw new Error('No turn audio was captured.');
      }
      const audio = await activeRecorder.stop();
      if (audio.size < 100) {
        throw new Error('No turn audio was captured.');
      }

      setStatus('uploading');
      uploadsRef.current = uploadsRef.current
        .catch(() => undefined)
        .then(() =>
          uploadDebateTurn({
            roomId,
            phaseId: turn.phaseId,
            turnSequence: turn.turnSequence,
            durationSeconds: turn.durationSeconds,
            audio,
          }),
        )
        .then(() => {
          completedPhasesRef.current.add(turn.phaseId);
          setStatus('secured');
          setErrorMessage(null);
        });
      await uploadsRef.current;
    })().catch((error: unknown) => {
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The turn transcript could not be secured.',
      );
    });

    return stopRef.current;
  }, [roomId]);

  const startRecording = useCallback(async () => {
    if (
      !enabled ||
      !phaseId ||
      completedPhasesRef.current.has(phaseId) ||
      recorderRef.current ||
      recorderPromiseRef.current
    ) {
      return;
    }

    const publication = localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    const mediaTrack = publication?.track?.mediaStreamTrack;
    if (!mediaTrack) {
      if (isMicrophoneEnabled) {
        setStatus('error');
        setErrorMessage('Microphone audio was unavailable for transcription.');
      }
      return;
    }

    const turn = {
      phaseId,
      turnSequence: phaseIndex + 1,
      durationSeconds: phaseDuration,
    };
    activeTurnRef.current = turn;
    setStatus('recording');
    setErrorMessage(null);

    const pendingRecorder = createWavTurnRecorder(mediaTrack);
    recorderPromiseRef.current = pendingRecorder;
    try {
      const recorder = await pendingRecorder;
      if (recorderPromiseRef.current !== pendingRecorder) return;
      recorderPromiseRef.current = null;
      recorderRef.current = recorder;
    } catch (error) {
      if (activeTurnRef.current === turn) activeTurnRef.current = null;
      if (recorderPromiseRef.current === pendingRecorder) {
        recorderPromiseRef.current = null;
      }
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'This browser cannot create an AI transcript.',
      );
    }
  }, [
    enabled,
    isMicrophoneEnabled,
    localParticipant,
    phaseDuration,
    phaseId,
    phaseIndex,
  ]);

  useEffect(() => {
    const active =
      enabled && roomStatus === 'live' && isYourTurn && Boolean(phaseId);
    if (active) {
      void startRecording();
    } else {
      void stopRecording();
    }
  }, [
    enabled,
    isMicrophoneEnabled,
    isYourTurn,
    phaseId,
    roomStatus,
    startRecording,
    stopRecording,
  ]);

  useEffect(
    () => () => {
      void stopRecording();
    },
    [stopRecording],
  );

  const flush = useCallback(async () => {
    await stopRecording();
    await uploadsRef.current.catch(() => undefined);
  }, [stopRecording]);

  return { status, errorMessage, flush };
}
