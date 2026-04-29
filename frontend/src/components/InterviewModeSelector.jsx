import { INTERVIEW_MODE_OPTIONS, isBrutalMode } from "../lib/interviewModes";
import { cn, InfoBanner, PanelFrame } from "./ui";

export default function InterviewModeSelector({ mode, onModeChange }) {
  return (
    <PanelFrame
      description="Pick the interview track before generating questions. Normal keeps the current coaching flow, while Brutal Mode prepares a stricter branch without touching the default experience."
      status={isBrutalMode(mode) ? "High-pressure track armed" : "Default flow active"}
      statusTone={isBrutalMode(mode) ? "locked" : "ready"}
      step="Mode"
      title="Interview Mode"
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {INTERVIEW_MODE_OPTIONS.map((option) => {
          const isActive = option.key === mode;

          return (
            <button
              className={cn(
                "rounded-[24px] border p-5 text-left transition-all duration-300",
                isActive
                  ? "border-sky-300/25 bg-sky-300/[0.08] shadow-[0_18px_50px_rgba(14,165,233,0.08)]"
                  : "border-white/10 bg-slate-950/55 hover:-translate-y-0.5 hover:border-white/15 hover:bg-slate-950/70",
              )}
              key={option.key}
              type="button"
              onClick={() => onModeChange?.(option.key)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-semibold text-white">{option.label}</p>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
                    isActive
                      ? "border-sky-300/20 bg-sky-300/10 text-sky-100"
                      : "border-white/10 bg-white/[0.05] text-slate-400",
                  )}
                >
                  {isActive ? "Selected" : "Available"}
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-300">{option.description}</p>
            </button>
          );
        })}
      </div>

      {isBrutalMode(mode) ? (
        <InfoBanner tone="warning">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/80">
              Brutal Mode warning
            </p>
            <p>
              This mode simulates high-pressure interviews. No retries allowed.
            </p>
            <p className="text-amber-50/80">
              Step 1 only wires the mode safely into the app. Timer pressure, interruptions,
              and deeper scoring land in the next implementation step without disturbing
              the current Normal Mode flow.
            </p>
          </div>
        </InfoBanner>
      ) : null}
    </PanelFrame>
  );
}
