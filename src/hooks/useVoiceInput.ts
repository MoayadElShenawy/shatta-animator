import { useCallback, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "recording" | "transcribing" | "error" | "unsupported";

/**
 * Microphone dictation for the Shatta quick-chat composer.
 * The mic is only ever opened by an explicit user gesture, the stream is closed
 * as soon as recording stops, and audio is sent once for transcription — never stored.
 */
export function useVoiceInput(onText: (text: string) => void) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== "undefined";

  const stopTracks = () => {
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
  };

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setStatus("unsupported");
      setError("Voice input isn't supported in this browser.");
      return;
    }
    setStatus("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setStatus("error");
      const name = (e as DOMException)?.name;
      setError(
        name === "NotAllowedError"
          ? "Microphone permission was denied. Enable it in your browser settings to talk to Shatta."
          : name === "NotFoundError"
            ? "No microphone found on this device."
            : "Couldn't start the microphone.",
      );
      return;
    }

    cancelled.current = false;
    chunks.current = [];
    const mr = new MediaRecorder(stream);
    recorder.current = mr;
    mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
      stopTracks();
      if (cancelled.current || blob.size < 1200) {
        setStatus("idle");
        return;
      }
      setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Transcription failed.");
        const text = (data.text ?? "").trim();
        if (text) onText(text);
        else setError("I didn't catch that — try again?");
        setStatus("idle");
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Transcription failed.");
      }
    };
    mr.start();
    setStatus("recording");
  }, [supported, onText]);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
    else {
      stopTracks();
      setStatus("idle");
    }
  }, []);

  return { status, error, supported, start, stop, cancel, clearError: () => setError(null) };
}
