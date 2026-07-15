"use client";

import { useCallback, useEffect, useState } from "react";

export type MediaPermissionStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported";

export function useMediaDevices() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaPermissionStatus>("idle");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);

  const requestMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return null;
    }

    setStatus("requesting");
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return nextStream;
      });
      setStatus("ready");
      setCameraEnabled(true);
      setMicrophoneEnabled(true);
      return nextStream;
    } catch {
      setStatus("denied");
      return null;
    }
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((enabled) => {
      const next = !enabled;
      stream?.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, [stream]);

  const toggleMicrophone = useCallback(() => {
    setMicrophoneEnabled((enabled) => {
      const next = !enabled;
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, [stream]);

  const stopMedia = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setStatus("idle");
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return {
    stream,
    status,
    cameraEnabled,
    microphoneEnabled,
    requestMedia,
    toggleCamera,
    toggleMicrophone,
    stopMedia,
  };
}

export type MediaDeviceController = ReturnType<typeof useMediaDevices>;
