import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { INTERVIEW_MODE_OPTIONS, INTERVIEW_MODES, getInterviewModeOption, isBrutalMode } from "../lib/interviewModes";
import ModeCard from "./ModeCard";
import { ActionButton, ModalFrame, PanelFrame, StatusBadge, cn } from "./ui";

function buildModeDisplay(option) {
  if (option.key === INTERVIEW_MODES.BRUTAL) {
    return {
      badge: "High pressure",
      eyebrow: "Advanced simulation",
      icon: "🔥",
      tone: "brutal",
    };
  }

  return {
    badge: "Recommended start",
    eyebrow: "Safe practice",
    icon: "🛡️",
    tone: "normal",
  };
}

export default function InterviewModeSelector({ mode, onModeChange }) {
  const navigate = useNavigate();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const activeModeOption = useMemo(() => getInterviewModeOption(mode), [mode]);
  const pendingModeOption = pendingMode ? getInterviewModeOption(pendingMode) : null;

  function handleCardSelect(nextMode) {
    if (nextMode === mode) {
      return;
    }

    if (nextMode === INTERVIEW_MODES.BRUTAL) {
      setPendingMode(nextMode);
      setIsWarningOpen(true);
      return;
    }

    onModeChange?.(nextMode);
  }

  function handleCancel() {
    setPendingMode(null);
    setIsWarningOpen(false);
  }

  function handleConfirm() {
    if (pendingMode) {
      onModeChange?.(pendingMode);
    }

    setPendingMode(null);
    setIsWarningOpen(false);

    if (pendingMode === INTERVIEW_MODES.BRUTAL) {
      navigate("/brutal-interview");
    }
  }

  return (
    <>
      <PanelFrame
        className={cn(
          "relative overflow-visible",
          isBrutalMode(mode)
            ? "border-rose-400/15 bg-[linear-gradient(180deg,rgba(39,11,22,0.55),rgba(15,23,42,0.6))]"
            : "bg-[linear-gradient(180deg,rgba(7,18,35,0.7),rgba(15,23,42,0.6))]",
        )}
        description="Choose the interview track before you start. Normal Mode keeps the current guided practice flow. Brutal Mode arms a stricter simulation path without replacing the default system."
        status={isBrutalMode(mode) ? "Brutal track armed" : "Normal flow active"}
        statusTone={isBrutalMode(mode) ? "locked" : "ready"}
        step="Preflight"
        title="Choose Your Interview Mode"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={isBrutalMode(mode) ? "locked" : "ready"}>
                {activeModeOption.label}
              </StatusBadge>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Select before generating questions
              </span>
            </div>

            <div className="max-w-3xl space-y-2">
              <p className="text-sm leading-7 text-slate-300">
                Pick the tone of the interview before the practice flow begins. This keeps
                the default coaching path safe, while making Brutal Mode feel like an
                intentional opt-in challenge.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "rounded-[24px] border px-4 py-3 text-sm leading-7 shadow-[0_18px_50px_rgba(2,6,23,0.26)]",
              isBrutalMode(mode)
                ? "border-rose-300/15 bg-rose-400/[0.08] text-rose-50"
                : "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-50",
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-80">
              Active track
            </p>
            <p className="mt-2 text-base font-semibold">{activeModeOption.label}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {INTERVIEW_MODE_OPTIONS.map((option) => {
            const display = buildModeDisplay(option);

            return (
              <div className="space-y-3" key={option.key}>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {display.eyebrow}
                  </p>
                  {option.key === mode ? <StatusBadge tone="active">Current</StatusBadge> : null}
                </div>

                <ModeCard
                  badge={display.badge}
                  description={option.description}
                  icon={display.icon}
                  isActive={option.key === mode}
                  title={option.label}
                  tone={display.tone}
                  onClick={() => handleCardSelect(option.key)}
                />
              </div>
            );
          })}
        </div>
      </PanelFrame>

      <ModalFrame open={isWarningOpen}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/12 text-2xl">
                <span aria-hidden="true">⚠️</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-100/75">
                  Enter Brutal Mode
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  No soft practice here
                </h3>
              </div>
            </div>

            <div className="rounded-[24px] border border-rose-300/15 bg-rose-400/[0.08] p-5 text-sm leading-7 text-rose-50">
              <p>
                This mode simulates real interview pressure. No retries. No pauses. Strict
                evaluation.
              </p>
              <p className="mt-3 text-rose-50/80">
                You can still switch back later, but continuing now arms the more intense
                simulation track for the next interview steps.
              </p>
            </div>

            {pendingModeOption ? (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="locked">{pendingModeOption.label}</StatusBadge>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  High-pressure simulation
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton className="sm:min-w-[140px]" type="button" onClick={handleCancel}>
              Cancel
            </ActionButton>
            <ActionButton
              className="sm:min-w-[180px] bg-[linear-gradient(135deg,#fb7185,#f97316)] text-white shadow-[0_20px_60px_rgba(244,63,94,0.35)] hover:shadow-[0_22px_70px_rgba(249,115,22,0.38)]"
              priority
              type="button"
              onClick={handleConfirm}
            >
              Enter Brutal Mode Interview
            </ActionButton>
          </div>
        </div>
      </ModalFrame>
    </>
  );
}
