import { useEffect, useMemo, useState } from "react";
import { useVirtualInterviewRoom } from "../hooks/useVirtualInterviewRoom";
import { cancelSpeech, isTextToSpeechSupported, speakText } from "../services/ttsService";
import { ActionButton, StatusBadge, cn } from "./ui";

const accentClasses = {
  emerald: {
    active: "border-emerald-300/30 bg-emerald-300/[0.08] shadow-[0_18px_60px_rgba(52,211,153,0.12)]",
    dot: "bg-emerald-300",
    ring: "stroke-emerald-300",
  },
  rose: {
    active: "border-rose-300/35 bg-rose-400/[0.1] shadow-[0_18px_70px_rgba(251,113,133,0.18)]",
    dot: "bg-rose-300",
    ring: "stroke-rose-300",
  },
  sky: {
    active: "border-sky-300/30 bg-sky-300/[0.08] shadow-[0_18px_60px_rgba(56,189,248,0.12)]",
    dot: "bg-sky-300",
    ring: "stroke-sky-300",
  },
};

function summarizePrompt(prompt) {
  return prompt
    .replace("Give me a direct example. What was your responsibility?", "Asks for ownership proof.")
    .replace("Walk me through the technical tradeoff. Why was this the right approach?", "Probes technical tradeoffs.")
    .replace("That answer sounds rehearsed. Prove it with details.", "Challenges vague claims.");
}

function getInterviewerStatus({ interviewer, activeInterviewer, isListening }) {
  if (interviewer.id === activeInterviewer.id) {
    return "Speaking";
  }

  return isListening ? "Listening" : "Thinking";
}

function CircularHudMetric({ label, tone = "rose", value, suffix = "/10" }) {
  const normalizedValue = Math.max(0, Math.min(10, Number(value) || 0));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (normalizedValue / 10) * circumference;
  const palette = accentClasses[tone] ?? accentClasses.rose;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="relative h-24 w-24 shrink-0">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
          <circle
            className="stroke-white/10"
            cx="48"
            cy="48"
            fill="none"
            r="38"
            strokeWidth="8"
          />
          <circle
            className={cn("transition-all duration-700 ease-out", palette.ring)}
            cx="48"
            cy="48"
            fill="none"
            r="38"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="8"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold text-white">
            {Number(value).toFixed(1)}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {Number(value).toFixed(1)}
          {suffix}
        </p>
      </div>
    </div>
  );
}

function CounterHudMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold text-white transition-all duration-500">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-400">Look-away events</p>
    </div>
  );
}

function InterviewerCard({ interviewer, isActive, status }) {
  const palette = accentClasses[interviewer.accent] ?? accentClasses.rose;

  return (
    <article
      className={cn(
        "rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5",
        isActive
          ? `${palette.active} interviewer-speaking`
          : "border-white/10 bg-slate-950/55 text-slate-300 hover:border-white/15 hover:bg-slate-950/70",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
          {interviewer.name.slice(0, 1)}
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950",
              palette.dot,
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{interviewer.name}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {interviewer.role}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
            isActive
              ? "border-white/15 bg-white/[0.09] text-white"
              : "border-white/10 bg-white/[0.04] text-slate-400",
          )}
        >
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {summarizePrompt(interviewer.prompt)}
      </p>
    </article>
  );
}

export default function VirtualInterviewRoom({
  analysis,
  enabled,
  isListening = false,
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

    if (lastInterruption?.message) {
      alerts.unshift(lastInterruption.message);
    }

    return alerts.length > 0 ? alerts.slice(0, 3) : ["Signal stable"];
  }, [
    analysis.confidenceScore,
    analysis.wordCount,
    lastInterruption?.message,
    room.lookAwayEvents,
  ]);

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
    <section className="relative overflow-hidden rounded-[28px] border border-rose-300/15 bg-[linear-gradient(180deg,rgba(22,12,20,0.98),rgba(5,10,20,0.98))] p-4 shadow-[0_24px_90px_rgba(127,29,29,0.2)] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-200/25 to-transparent" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="locked">Brutal Mode Active</StatusBadge>
            <StatusBadge tone={room.isCameraActive ? "ready" : "idle"}>
              {room.isCameraActive ? "Live room" : "Camera off"}
            </StatusBadge>
          </div>
          <h3 className="text-lg font-semibold text-white">Virtual Interview Room</h3>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">
            Webcam-first interview simulation with panel pressure, voice prompts, and live
            behavior signals.
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

      <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div
          className={cn(
            "relative overflow-hidden rounded-[24px] border bg-black shadow-[0_20px_80px_rgba(2,6,23,0.55)] transition-all duration-500",
            room.isCameraActive
              ? "border-rose-300/35 shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_24px_90px_rgba(127,29,29,0.28)]"
              : "border-white/10",
          )}
        >
          <div className="relative aspect-video min-h-[260px]">
            <video
              ref={room.videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {!room.isCameraActive ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.65),rgba(2,6,23,1))] text-sm text-slate-400">
                Webcam preview
              </div>
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/45" />

            <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-300/25 bg-rose-500/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-50 live-dot">
                Live
              </span>
              <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                Candidate
              </span>
            </div>

            <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
              {isListening ? "Mic active" : "Mic idle"}
            </div>

            <div className="pointer-events-none absolute right-4 top-16 flex max-w-[260px] flex-col gap-2">
              {liveAlerts.map((alert) => (
                <div
                  className="interview-toast rounded-2xl border border-rose-300/20 bg-black/55 px-4 py-2 text-sm font-semibold text-rose-50 shadow-[0_16px_50px_rgba(2,6,23,0.45)] backdrop-blur"
                  key={alert}
                >
                  {alert}
                </div>
              ))}
            </div>

            <div className="absolute inset-x-4 bottom-4 rounded-[22px] border border-white/10 bg-black/48 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.55)] backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-sm font-semibold text-white">
                    {room.activeInterviewer.name.slice(0, 1)}
                    <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-rose-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">
                      {room.activeInterviewer.name}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100/80">
                      {room.activeInterviewer.role} interviewer speaking
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-200 sm:max-w-sm">
                  {lastInterruption?.message ?? summarizePrompt(room.activeInterviewer.prompt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
          <CircularHudMetric
            label="Eye contact"
            tone="rose"
            value={room.eyeContactScore}
          />
          <CircularHudMetric
            label="Confidence"
            tone="sky"
            value={analysis.confidenceScore}
          />
          <CounterHudMetric label="Look away" value={room.lookAwayEvents} />
        </aside>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {room.interviewers.map((interviewer) => {
          const isActive = interviewer.id === room.activeInterviewer.id;

          return (
            <InterviewerCard
              interviewer={interviewer}
              isActive={isActive}
              key={interviewer.id}
              status={getInterviewerStatus({
                activeInterviewer: room.activeInterviewer,
                interviewer,
                isListening,
              })}
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm leading-7 text-slate-300">{room.attentionMessage}</p>
          {room.cameraError ? (
            <p className="text-sm leading-7 text-rose-100">{room.cameraError}</p>
          ) : null}
          {!room.faceDetectionSupported ? (
            <p className="text-xs leading-6 text-slate-500">
              Native gaze detection unavailable. Webcam preview still works.
            </p>
          ) : null}
          {spokenLine ? (
            <p className="text-sm italic leading-7 text-slate-400">"{spokenLine}"</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            className="min-w-[170px]"
            type="button"
            onClick={room.isCameraActive ? room.stopCamera : room.startCamera}
          >
            {room.isCameraActive ? "Turn Camera Off" : "Turn Camera On"}
          </ActionButton>
          <span className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-semibold text-slate-300">
            {ttsSupported ? "TTS ready" : "TTS unavailable"}
          </span>
        </div>
      </div>
    </section>
  );
}
