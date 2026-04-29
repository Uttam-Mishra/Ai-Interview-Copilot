import { formatTimer, getTimerTone } from "../services/brutalMode/pressureEngine";
import { ActionButton, StatusBadge, cn } from "./ui";

const timerToneClasses = {
  danger: "border-rose-300/25 bg-rose-500/15 text-rose-50 brutal-timer-pulse",
  steady: "border-rose-300/15 bg-rose-400/[0.08] text-rose-50",
  warning: "border-orange-300/20 bg-orange-400/12 text-orange-50 brutal-timer-pulse",
};

export default function BrutalRuntimePanel({
  analysis,
  interimTranscript,
  isListening,
  lastInterruption,
  onStartListening,
  onStopListening,
  timeRemaining,
  voiceError,
  voiceSupported,
}) {
  const timerTone = getTimerTone(timeRemaining);
  const flags = analysis.flags.length > 0
    ? analysis.flags
    : ["No major hesitation signal yet."];

  return (
    <section className="overflow-hidden rounded-[28px] border border-rose-300/15 bg-[linear-gradient(180deg,rgba(70,18,30,0.78),rgba(15,23,42,0.92))] p-5 shadow-[0_22px_70px_rgba(127,29,29,0.18)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="locked">Brutal Mode Active</StatusBadge>
            <StatusBadge tone={isListening ? "active" : "idle"}>
              {isListening ? "Listening..." : "Voice ready"}
            </StatusBadge>
          </div>
          <h3 className="text-lg font-semibold text-white">Pressure Engine</h3>
          <p className="max-w-2xl text-sm leading-7 text-rose-50/78">
            Answer under time pressure. The analyzer watches hesitation, filler words,
            vague length, and over-explaining while you speak or type.
          </p>
        </div>

        <div
          className={cn(
            "rounded-[24px] border px-5 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
            timerToneClasses[timerTone],
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-80">
            Time left
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatTimer(timeRemaining)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Confidence
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {analysis.confidenceScore}
            <span className="text-base text-slate-400">/10</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Fillers
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{analysis.fillerCount}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Words
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{analysis.wordCount}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Live pressure notes
          </p>
          <ul className="space-y-2 text-sm leading-7 text-slate-200">
            {flags.map((flag) => (
              <li className="flex items-start gap-3" key={flag}>
                <span className="mt-2 h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.5)]" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
          {lastInterruption ? (
            <div className="rounded-2xl border border-orange-300/18 bg-orange-400/12 px-4 py-3 text-sm font-semibold text-orange-50">
              {lastInterruption.message}
            </div>
          ) : null}
          {interimTranscript ? (
            <p className="text-sm italic leading-7 text-slate-400">"{interimTranscript}"</p>
          ) : null}
          {voiceError ? (
            <p className="text-sm leading-7 text-rose-100">{voiceError}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[190px]">
          <ActionButton
            className="w-full border-rose-300/20 bg-rose-400/12 text-rose-50 hover:border-rose-300/35 hover:bg-rose-400/18"
            disabled={!voiceSupported || timeRemaining === 0}
            type="button"
            onClick={isListening ? onStopListening : onStartListening}
          >
            {isListening ? "Stop Voice" : "Start Voice"}
          </ActionButton>
          <p className="text-xs leading-6 text-slate-400">
            {voiceSupported
              ? "Voice transcript is appended to the answer box."
              : "Voice input is not supported in this browser."}
          </p>
        </div>
      </div>
    </section>
  );
}
