import { useEffect, useMemo, useState } from "react";
import { useVirtualInterviewRoom } from "../hooks/useVirtualInterviewRoom";
import { cancelSpeech, isTextToSpeechSupported, speakText } from "../services/ttsService";
import { ActionButton, StatusBadge, cn } from "./ui";

const accentClasses = {
  emerald: "border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50",
  rose: "border-rose-300/20 bg-rose-400/[0.1] text-rose-50",
  sky: "border-sky-300/18 bg-sky-300/[0.08] text-sky-50",
};

export default function VirtualInterviewRoom({
  analysis,
  enabled,
  lastInterruption,
  onMetricsChange,
}) {
  const [spokenLine, setSpokenLine] = useState("");
  const room = useVirtualInterviewRoom({
    analysis,
    enabled,
    lastInterruption,
  });
  const ttsSupported = isTextToSpeechSupported();
  const activePrompt = lastInterruption?.message ?? room.activeInterviewer.prompt;
  const liveAlerts = useMemo(() => {
    const alerts = [];

    if (analysis.confidenceScore <= 6) {
      alerts.push("Low confidence");
    }

    if (analysis.wordCount > 180) {
      alerts.push("Too long");
    }

    if (analysis.wordCount > 0 && analysis.wordCount < 35) {
      alerts.push("Too vague");
    }

    if (room.lookAwayEvents > 0) {
      alerts.push("Maintain eye contact");
    }

    return alerts.length > 0 ? alerts : ["Signal stable"];
  }, [analysis.confidenceScore, analysis.wordCount, room.lookAwayEvents]);

  useEffect(() => {
    onMetricsChange?.({
      attentionMessage: room.attentionMessage,
      eyeContactScore: room.eyeContactScore,
      lookAwayEvents: room.lookAwayEvents,
    });
  }, [
    onMetricsChange,
    room.attentionMessage,
    room.eyeContactScore,
    room.lookAwayEvents,
  ]);

  function speakPrompt(text = activePrompt) {
    const didSpeak = speakText(text, {
      pitch: room.activeInterviewer.id === "strict" ? 0.74 : 0.9,
      rate: room.activeInterviewer.id === "strict" ? 0.9 : 0.96,
    });

    if (didSpeak) {
      setSpokenLine(text);
    }
  }

  useEffect(() => {
    if (!enabled || !lastInterruption?.message) {
      return;
    }

    speakPrompt(lastInterruption.message);
  }, [enabled, lastInterruption?.message]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-rose-300/15 bg-[linear-gradient(180deg,rgba(26,14,24,0.95),rgba(8,13,24,0.96))] p-5 shadow-[0_24px_80px_rgba(127,29,29,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="locked">Virtual Interview Room</StatusBadge>
            <StatusBadge tone={room.isCameraActive ? "ready" : "idle"}>
              {room.isCameraActive ? "Camera on" : "Camera off"}
            </StatusBadge>
          </div>
          <h3 className="text-lg font-semibold text-white">Panel simulation</h3>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">
            Three interviewer personas watch the same answer: HR, Technical, and Strict.
            Camera signals are analyzed locally in the browser when supported.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            className="border-rose-300/20 bg-rose-400/12 text-rose-50 hover:bg-rose-400/18"
            type="button"
            onClick={() => speakPrompt()}
          >
            Speak Prompt
          </ActionButton>
          <ActionButton type="button" onClick={cancelSpeech}>
            Stop TTS
          </ActionButton>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {room.interviewers.map((interviewer) => {
            const isActive = interviewer.id === room.activeInterviewer.id;

            return (
              <article
                className={cn(
                  "min-h-[150px] rounded-2xl border p-4 transition-all duration-300",
                  isActive
                    ? accentClasses[interviewer.accent]
                    : "border-white/10 bg-slate-950/55 text-slate-300",
                )}
                key={interviewer.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
                    {interviewer.name.slice(0, 1)}
                  </div>
                  {isActive ? <StatusBadge tone="active">Speaking</StatusBadge> : null}
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] opacity-75">
                  {interviewer.role}
                </p>
                <h4 className="mt-2 text-base font-semibold text-white">{interviewer.name}</h4>
                <p className="mt-3 text-sm leading-6 opacity-85">{interviewer.prompt}</p>
              </article>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
          <div className="relative aspect-video bg-black">
            <video
              ref={room.videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {!room.isCameraActive ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
                Webcam preview
              </div>
            ) : null}
            <div className="absolute left-3 top-3 rounded-full border border-black/20 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Candidate
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Eye contact
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {room.eyeContactScore.toFixed(1)}
                  <span className="text-base text-slate-400">/10</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Look-away events
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">{room.lookAwayEvents}</p>
              </div>
            </div>

            <p className="text-sm leading-7 text-slate-300">{room.attentionMessage}</p>
            {room.cameraError ? (
              <p className="text-sm leading-7 text-rose-100">{room.cameraError}</p>
            ) : null}
            {!room.faceDetectionSupported ? (
              <p className="text-xs leading-6 text-slate-500">
                Face orientation uses native browser detection when available. Webcam preview
                still works without it.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionButton
                className="flex-1"
                type="button"
                onClick={room.isCameraActive ? room.stopCamera : room.startCamera}
              >
                {room.isCameraActive ? "Turn Camera Off" : "Turn Camera On"}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {liveAlerts.map((alert) => (
          <span
            className="rounded-full border border-rose-300/15 bg-rose-400/[0.08] px-3 py-1.5 text-xs font-semibold text-rose-50"
            key={alert}
          >
            {alert}
          </span>
        ))}
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-300">
          {ttsSupported ? "TTS ready" : "TTS unavailable"}
        </span>
      </div>

      {spokenLine ? (
        <p className="mt-4 text-sm italic leading-7 text-slate-400">"{spokenLine}"</p>
      ) : null}
    </section>
  );
}
