import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useBrutalInterviewRuntime } from "../hooks/useBrutalInterviewRuntime";
import { useVirtualInterviewRoom } from "../hooks/useVirtualInterviewRoom";
import { generateBrutalFollowUp } from "../lib/api";
import { readStoredAppState } from "../lib/appState";
import { INTERVIEW_MODES } from "../lib/interviewModes";
import { cancelSpeech, isTextToSpeechSupported, speakText } from "../services/ttsService";
import { generateNoMercyReport } from "../services/brutalMode/evaluationService";
import { formatTimer, getTimerTone } from "../services/brutalMode/pressureEngine";
import { StatusBadge, cn } from "../components/ui";

const FALLBACK_QUESTION =
  "Tell me about one project that proves you can handle this role under pressure.";

const timerToneClasses = {
  danger: "border-rose-300/35 bg-rose-500/18 text-rose-50 brutal-timer-pulse",
  steady: "border-white/10 bg-white/[0.06] text-white",
  warning: "border-orange-300/25 bg-orange-400/14 text-orange-50 brutal-timer-pulse",
};

const interviewerAccentClasses = {
  emerald: "border-emerald-300/25 bg-emerald-300/[0.08] shadow-[0_18px_60px_rgba(52,211,153,0.12)]",
  rose: "border-rose-300/35 bg-rose-400/[0.1] shadow-[0_18px_70px_rgba(251,113,133,0.22)]",
  sky: "border-sky-300/25 bg-sky-300/[0.08] shadow-[0_18px_60px_rgba(56,189,248,0.12)]",
};

const dotAccentClasses = {
  emerald: "bg-emerald-300",
  rose: "bg-rose-300",
  sky: "bg-sky-300",
};

function getStoredInterviewContext() {
  const state = readStoredAppState();
  const questions = Array.isArray(state.generatedQuestions) ? state.generatedQuestions : [];
  const selectedQuestion =
    typeof state.selectedQuestion === "string" ? state.selectedQuestion : "";
  const question =
    questions.find((item) => item.question === selectedQuestion)?.question ??
    questions[0]?.question ??
    FALLBACK_QUESTION;

  return {
    question,
    questions,
    resumeText: state.resumeData?.text ?? "",
    role: typeof state.targetRole === "string" ? state.targetRole : "",
  };
}

function buildLiveAlerts({
  analysis,
  attentionMessage,
  behaviorSnapshot,
  lastInterruption,
  lookAwayEvents,
  pressureSnapshot,
}) {
  const alerts = [];

  if (lastInterruption?.message) {
    alerts.push(lastInterruption.message);
  }

  if (lookAwayEvents > 0) {
    alerts.push("Maintain eye contact");
  }

  if (analysis.wordCount > 0 && analysis.wordCount < 35) {
    alerts.push("Too vague");
  }

  if (analysis.wordCount > 180) {
    alerts.push("Too long");
  }

  if (analysis.confidenceScore <= 6) {
    alerts.push("Low confidence");
  }

  if (pressureSnapshot?.level === "critical") {
    alerts.push("Pressure rising");
  }

  for (const signal of behaviorSnapshot?.signals ?? []) {
    alerts.push(signal.message);
  }

  if (alerts.length === 0 && attentionMessage) {
    alerts.push(attentionMessage);
  }

  return alerts.slice(0, 3);
}

function getInterviewerStatus({ activeInterviewer, interviewer, isListening }) {
  if (interviewer.id === activeInterviewer.id) {
    return "Speaking";
  }

  return isListening ? "Listening" : "Thinking";
}

function InterviewerCard({ activeInterviewer, interviewer, isListening }) {
  const isActive = interviewer.id === activeInterviewer.id;

  return (
    <motion.article
      animate={isActive ? { scale: 1.02 } : { scale: 1 }}
      className={cn(
        "rounded-[24px] border p-4 transition-colors duration-300",
        isActive
          ? `${interviewerAccentClasses[interviewer.accent]} interviewer-speaking`
          : "border-white/10 bg-white/[0.035]",
      )}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-sm font-semibold text-white">
          {interviewer.name.slice(0, 1)}
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950",
              dotAccentClasses[interviewer.accent],
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{interviewer.name}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {interviewer.role}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {getInterviewerStatus({ activeInterviewer, interviewer, isListening })}
        </span>
        {isActive ? (
          <span className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_18px_rgba(251,113,133,0.75)]" />
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{interviewer.prompt}</p>
    </motion.article>
  );
}

function MetricCard({ label, value, detail, tone = "rose" }) {
  const toneClass =
    tone === "sky"
      ? "from-sky-300/18 to-sky-500/5"
      : tone === "emerald"
        ? "from-emerald-300/18 to-emerald-500/5"
        : "from-rose-300/18 to-rose-500/5";

  return (
    <div className={cn("rounded-[22px] border border-white/10 bg-gradient-to-br p-4", toneClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function NoMercyReport({
  answer,
  behaviorSnapshot,
  onRestart,
  pressureSnapshot,
  responseAnalysis,
  role,
}) {
  const navigate = useNavigate();
  const report = generateNoMercyReport({
    answer,
    behaviorSnapshot,
    pressureSnapshot,
    responseAnalysis,
    role,
  });

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="relative overflow-hidden rounded-[32px] border border-rose-300/18 bg-[linear-gradient(135deg,rgba(28,12,22,0.95),rgba(3,7,18,0.98))] p-6 shadow-[0_30px_120px_rgba(127,29,29,0.22)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-200/30 to-transparent" />
        <StatusBadge tone="locked">No Mercy Report</StatusBadge>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.07em] text-white">
          Why this answer would get rejected
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          {report.rejectionReason}
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <MetricCard
            detail="Combined confidence, clarity, and camera presence."
            label="Final score"
            tone="rose"
            value={`${report.finalScore}/10`}
          />
          <MetricCard
            detail={`${responseAnalysis.fillerCount} filler words detected.`}
            label="Hesitation"
            tone="sky"
            value={`${report.scoreBreakdown.hesitation}/10`}
          />
          <MetricCard
            detail={`${pressureSnapshot.pressureScore}/100 pressure score.`}
            label="Eye contact"
            tone="emerald"
            value={`${report.scoreBreakdown.eyeContact}/10`}
          />
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <section className="rounded-[24px] border border-rose-300/15 bg-rose-400/[0.08] p-5">
            <h2 className="text-base font-semibold text-white">Critical mistakes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-rose-50/85">
              {report.criticalMistakes.map((item) => (
                <li className="flex gap-3" key={item}>
                  <span className="mt-2 h-2 w-2 rounded-full bg-rose-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[24px] border border-amber-300/15 bg-amber-400/[0.08] p-5">
            <h2 className="text-base font-semibold text-white">Weak areas</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-amber-50/85">
              {report.missedOpportunities.map((item) => (
                <li className="flex gap-3" key={item}>
                  <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col justify-between rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(2,6,23,0.4)] backdrop-blur-xl">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Recovery plan
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
            Fix these first.
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            {report.improvements.map((item) => (
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
            type="button"
            onClick={onRestart}
          >
            Restart Interview
          </button>
          <button
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
            type="button"
            onClick={() => navigate("/")}
          >
            Back to Dashboard
          </button>
        </div>
      </aside>
    </motion.section>
  );
}

export default function BrutalInterviewPage() {
  const context = useMemo(getStoredInterviewContext, []);
  const requestedFollowUpKeyRef = useRef("");
  const [answer, setAnswer] = useState("");
  const [aiFollowUp, setAiFollowUp] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [visualMetrics, setVisualMetrics] = useState({
    eyeContactScore: 10,
    lookAwayEvents: 0,
  });
  const roomEnabled = !isReportOpen;
  const runtime = useBrutalInterviewRuntime({
    answer,
    enabled: roomEnabled,
    onTranscript: (transcript) => {
      setAnswer((currentAnswer) => {
        const separator = currentAnswer.trim() ? " " : "";
        return `${currentAnswer}${separator}${transcript}`.trimStart();
      });
    },
    role: context.role,
    selectedQuestion: context.question,
    visualMetrics,
  });
  const room = useVirtualInterviewRoom({
    analysis: runtime.analysis,
    behaviorSnapshot: runtime.behaviorSnapshot,
    enabled: roomEnabled,
    lastInterruption: runtime.lastInterruption,
    pressureSnapshot: runtime.pressureSnapshot,
  });
  const activeInterviewer = runtime.activeAgent ?? room.activeInterviewer;
  const timerTone = getTimerTone(runtime.timeRemaining);
  const ttsSupported = isTextToSpeechSupported();
  const liveAlerts = buildLiveAlerts({
    analysis: runtime.analysis,
    attentionMessage: room.attentionMessage,
    behaviorSnapshot: runtime.behaviorSnapshot,
    lastInterruption: runtime.lastInterruption,
    lookAwayEvents: room.lookAwayEvents,
    pressureSnapshot: runtime.pressureSnapshot,
  });
  const displayedFollowUp = aiFollowUp?.followUpQuestion ?? runtime.agentTurn.followUpQuestion;

  useEffect(() => {
    setVisualMetrics({
      eyeContactScore: room.eyeContactScore,
      lookAwayEvents: room.lookAwayEvents,
    });
  }, [room.eyeContactScore, room.lookAwayEvents]);

  useEffect(() => {
    if (!roomEnabled || !context.role || runtime.analysis.wordCount < 20) {
      return undefined;
    }

    const followUpBucket = Math.floor(runtime.analysis.wordCount / 50);
    const requestKey = [
      activeInterviewer.id,
      runtime.pressureSnapshot.strategy,
      runtime.pressureSnapshot.level,
      followUpBucket,
    ].join(":");

    if (requestedFollowUpKeyRef.current === requestKey) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      requestedFollowUpKeyRef.current = requestKey;

      try {
        const data = await generateBrutalFollowUp({
          activeAgentId: activeInterviewer.id,
          answer,
          behaviorSnapshot: runtime.behaviorSnapshot,
          mode: INTERVIEW_MODES.BRUTAL,
          pressureSnapshot: runtime.pressureSnapshot,
          question: context.question,
          role: context.role,
        });

        setAiFollowUp(data.followUp);
      } catch {
        setAiFollowUp(null);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeInterviewer.id,
    answer,
    context.question,
    context.role,
    roomEnabled,
    runtime.analysis.wordCount,
    runtime.behaviorSnapshot,
    runtime.pressureSnapshot,
  ]);

  function speakPrompt() {
    const prompt =
      aiFollowUp?.interruption ??
      runtime.lastInterruption?.message ??
      aiFollowUp?.followUpQuestion ??
      runtime.agentTurn.followUpQuestion ??
      activeInterviewer.prompt;

    speakText(prompt, {
      pitch: activeInterviewer.id === "strict" ? 0.74 : 0.9,
      rate: activeInterviewer.id === "strict" ? 0.9 : 0.96,
    });
  }

  function handleExitInterview() {
    runtime.stopListening();
    room.stopCamera();
    cancelSpeech();
    setIsReportOpen(true);
  }

  function handleRestartInterview() {
    setAnswer("");
    setAiFollowUp(null);
    requestedFollowUpKeyRef.current = "";
    setVisualMetrics({
      eyeContactScore: 10,
      lookAwayEvents: 0,
    });
    setIsReportOpen(false);
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#02040b] text-white">
      <div className="room-vignette pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-rose-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col gap-4 p-4">
        <header className="flex shrink-0 items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.045] px-5 py-4 shadow-[0_24px_80px_rgba(2,6,23,0.4)] backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/12 text-lg">
              🔥
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-100/75">
                Brutal Mode Active
              </p>
              <h1 className="truncate text-xl font-semibold tracking-[-0.04em] text-white">
                Fullscreen Interview Room
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-2xl border px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                timerToneClasses[timerTone],
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-75">
                Time left
              </p>
              <p className="mt-1 text-2xl font-semibold">{formatTimer(runtime.timeRemaining)}</p>
            </div>

            <button
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-300/25 hover:bg-rose-400/10"
              type="button"
              onClick={handleExitInterview}
            >
              Exit Interview
            </button>
          </div>
        </header>

        {isReportOpen ? (
          <NoMercyReport
            answer={answer}
            behaviorSnapshot={runtime.behaviorSnapshot}
            pressureSnapshot={runtime.pressureSnapshot}
            responseAnalysis={runtime.analysis}
            role={context.role}
            onRestart={handleRestartInterview}
          />
        ) : (
          <>
            <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[270px_minmax(0,1fr)_320px]">
              <aside className="min-h-0 rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.4)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Panel
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
                      Interviewers
                    </h2>
                  </div>
                  <StatusBadge tone="locked">Live</StatusBadge>
                </div>

                <div className="space-y-3">
                  {room.interviewers.map((interviewer) => (
                    <InterviewerCard
                      activeInterviewer={activeInterviewer}
                      interviewer={interviewer}
                      isListening={runtime.isListening}
                      key={interviewer.id}
                    />
                  ))}
                </div>
              </aside>

              <section className="relative min-h-0 overflow-hidden rounded-[36px] border border-rose-300/15 bg-black shadow-[0_30px_120px_rgba(2,6,23,0.58)]">
                <video
                  ref={room.videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />

                {!room.isCameraActive ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.7),rgba(2,6,23,1))]">
                    <div className="text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Webcam preview
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                        Camera is off
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-black/48" />

                <div className="absolute left-5 top-5 flex items-center gap-2">
                  <span className="live-dot rounded-full border border-rose-300/25 bg-rose-500/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-50">
                    Live
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                    Candidate
                  </span>
                </div>

                <AnimatePresence>
                  <div className="pointer-events-none absolute right-5 top-5 flex max-w-[280px] flex-col gap-2">
                    {liveAlerts.map((alert) => (
                      <motion.div
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl border border-rose-300/20 bg-black/55 px-4 py-2 text-sm font-semibold text-rose-50 shadow-[0_16px_50px_rgba(2,6,23,0.45)] backdrop-blur"
                        exit={{ opacity: 0, x: 18 }}
                        initial={{ opacity: 0, x: 18 }}
                        key={alert}
                        transition={{ duration: 0.25 }}
                      >
                        {alert}
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>

                <div className="absolute inset-x-5 bottom-5 rounded-[26px] border border-white/10 bg-black/55 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.55)] backdrop-blur">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-base font-semibold">
                        {activeInterviewer.name.slice(0, 1)}
                        <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-black bg-rose-300 shadow-[0_0_22px_rgba(251,113,133,0.7)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-white">
                          {activeInterviewer.name}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100/75">
                          {activeInterviewer.role} interviewer speaking
                        </p>
                      </div>
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-slate-200">
                      {runtime.lastInterruption?.message ?? displayedFollowUp}
                    </p>
                  </div>
                </div>
              </section>

              <aside className="flex min-h-0 flex-col gap-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.4)] backdrop-blur-xl">
                <section className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Current question
                  </p>
                  <p className="mt-3 text-base font-semibold leading-7 text-white">
                    {context.question}
                  </p>
                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    {context.role ? `Target role: ${context.role}` : "Target role not selected."}
                  </p>
                </section>

                <div className="grid gap-3">
                  <MetricCard
                    detail={`${runtime.analysis.fillerCount} filler words`}
                    label="Confidence"
                    tone="sky"
                    value={`${runtime.analysis.confidenceScore}/10`}
                  />
                  <MetricCard
                    detail={`${room.lookAwayEvents} look-away events`}
                    label="Eye contact"
                    tone="emerald"
                    value={`${room.eyeContactScore.toFixed(1)}/10`}
                  />
                  <MetricCard
                    detail={`${runtime.pressureSnapshot.level} pressure level`}
                    label="Pressure"
                    tone="rose"
                    value={`${runtime.pressureSnapshot.pressureScore}/100`}
                  />
                </div>

                <section className="rounded-[24px] border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Adaptive follow-up
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-white">
                    {displayedFollowUp}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {runtime.pressureSnapshot.strategy}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {runtime.behaviorSnapshot.compositeScore}/10 behavior
                    </span>
                    {aiFollowUp ? (
                      <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-50">
                        AI follow-up
                      </span>
                    ) : null}
                  </div>
                </section>

                <label className="min-h-0 flex-1 rounded-[24px] border border-white/10 bg-black/25 p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Live transcript
                  </span>
                  <textarea
                    className="mt-3 h-[calc(100%-2rem)] min-h-[120px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600"
                    placeholder="Speak into the mic or type your answer here..."
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                </label>
              </aside>
            </section>

            <footer className="flex shrink-0 flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.045] px-5 py-4 shadow-[0_24px_80px_rgba(2,6,23,0.36)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                    runtime.isListening
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50"
                      : "border-white/10 bg-white/[0.05] text-slate-300",
                  )}
                >
                  <motion.span
                    animate={runtime.isListening ? { opacity: [0.45, 1, 0.45], scale: [1, 1.3, 1] } : {}}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      runtime.isListening ? "bg-emerald-300" : "bg-slate-500",
                    )}
                    transition={{ duration: 1, repeat: runtime.isListening ? Infinity : 0 }}
                  />
                  {runtime.isListening ? "Mic active" : "Mic idle"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-300">
                  {ttsSupported ? "TTS ready" : "TTS unavailable"}
                </span>
                {room.cameraError ? (
                  <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-50">
                    {room.cameraError}
                  </span>
                ) : null}
                {runtime.pressureSnapshot.events.slice(0, 2).map((event) => (
                  <span
                    className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-50"
                    key={event.id}
                  >
                    {event.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
                  type="button"
                  onClick={room.isCameraActive ? room.stopCamera : room.startCamera}
                >
                  {room.isCameraActive ? "Turn Camera Off" : "Turn Camera On"}
                </button>
                <button
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-3 text-sm font-semibold text-emerald-50 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!runtime.voiceSupported || runtime.timeRemaining === 0}
                  type="button"
                  onClick={runtime.isListening ? runtime.stopListening : runtime.startListening}
                >
                  {runtime.isListening ? "Stop Mic" : "Start Mic"}
                </button>
                <button
                  className="rounded-2xl border border-rose-300/20 bg-rose-400/12 px-5 py-3 text-sm font-semibold text-rose-50 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-300/35 hover:bg-rose-400/18"
                  type="button"
                  onClick={speakPrompt}
                >
                  Speak
                </button>
                <button
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
                  type="button"
                  onClick={cancelSpeech}
                >
                  Stop
                </button>
              </div>
            </footer>
          </>
        )}

      </div>
    </main>
  );
}
