import { useEffect, useMemo, useRef, useState } from "react";
import AnswerEvaluatorPanel from "./components/AnswerEvaluatorPanel";
import InterviewModeSelector from "./components/InterviewModeSelector";
import QuestionGeneratorPanel from "./components/QuestionGeneratorPanel";
import ResumeUploadPanel from "./components/ResumeUploadPanel";
import { ActionButton, StatusBadge, cn } from "./components/ui";
import {
  DEFAULT_INTERVIEW_MODE,
  getInterviewModeOption,
  isBrutalMode,
  normalizeInterviewMode,
} from "./lib/interviewModes";
import { getHealth } from "./lib/api";

const APP_STATE_STORAGE_KEY = "ai-interview-copilot-state";

const roadmap = [
  {
    title: "Foundation",
    description: "Backend health, upload flow, and production deployment path are live.",
    status: "Done",
  },
  {
    title: "Resume Upload",
    description: "Readable PDF extraction now feeds every downstream interview step.",
    status: "Done",
  },
  {
    title: "Question Generator",
    description: "Role-aware prompts turn resume context into interview-ready practice.",
    status: "Ready",
  },
  {
    title: "Answer Evaluator",
    description: "Structured scoring closes the loop with strengths and coaching gaps.",
    status: "In progress",
  },
];

const statToneClasses = {
  idle: "border-white/10 bg-white/[0.035]",
  locked: "border-amber-300/15 bg-amber-300/[0.08]",
  ready: "border-emerald-300/15 bg-emerald-300/[0.08]",
};

const roadmapTones = {
  Done: "ready",
  "In progress": "active",
  Ready: "active",
};

export default function App() {
  const [generatedQuestions, setGeneratedQuestions] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      const parsedState = storedState ? JSON.parse(storedState) : null;
      return Array.isArray(parsedState?.generatedQuestions) ? parsedState.generatedQuestions : [];
    } catch {
      return [];
    }
  });
  const [targetRole, setTargetRole] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      const parsedState = storedState ? JSON.parse(storedState) : null;
      return typeof parsedState?.targetRole === "string" ? parsedState.targetRole : "";
    } catch {
      return "";
    }
  });
  const [resumeData, setResumeData] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      const parsedState = storedState ? JSON.parse(storedState) : null;
      return parsedState?.resumeData ?? null;
    } catch {
      return null;
    }
  });
  const [selectedQuestion, setSelectedQuestion] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      const parsedState = storedState ? JSON.parse(storedState) : null;
      return typeof parsedState?.selectedQuestion === "string"
        ? parsedState.selectedQuestion
        : "";
    } catch {
      return "";
    }
  });
  const [interviewMode, setInterviewMode] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_INTERVIEW_MODE;
    }

    try {
      const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      const parsedState = storedState ? JSON.parse(storedState) : null;
      return normalizeInterviewMode(parsedState?.interviewMode);
    } catch {
      return DEFAULT_INTERVIEW_MODE;
    }
  });
  const [health, setHealth] = useState({
    aiConfigured: false,
    aiModel: "",
    status: "loading",
    message: "Checking backend connection...",
  });

  const standaloneView =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("view")
      : "";
  const isStandaloneEvaluator = standaloneView === "evaluator";
  const uploadSectionRef = useRef(null);
  const questionSectionRef = useRef(null);
  const evaluatorSectionRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const data = await getHealth();

        if (!isMounted) {
          return;
        }

        if (!data?.status || !data?.service) {
          throw new Error("API returned an invalid health response.");
        }

        setHealth({
          aiConfigured: Boolean(data.aiConfigured),
          aiModel: data.aiModel ?? "",
          status: "online",
          message: `Backend is ${data.status} (${data.service})`,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setHealth({
          aiConfigured: false,
          aiModel: "",
          status: "offline",
          message: error.message,
        });
      }
    }

    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextState = {
      generatedQuestions,
      interviewMode,
      resumeData,
      selectedQuestion,
      targetRole,
    };

    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(nextState));
  }, [generatedQuestions, interviewMode, resumeData, selectedQuestion, targetRole]);

  useEffect(() => {
    if (generatedQuestions.length === 0) {
      setSelectedQuestion("");
      return;
    }

    if (
      selectedQuestion &&
      generatedQuestions.some((item) => item.question === selectedQuestion)
    ) {
      return;
    }

    setSelectedQuestion(generatedQuestions[0].question);
  }, [generatedQuestions, selectedQuestion]);

  function handleOpenEvaluatorInNewTab() {
    if (typeof window === "undefined") {
      return;
    }

    const nextState = {
      generatedQuestions,
      interviewMode,
      resumeData,
      selectedQuestion,
      targetRole,
    };

    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(nextState));
    window.open(`${window.location.pathname}?view=evaluator`, "_blank", "noopener,noreferrer");
  }

  function handleModeChange(nextMode) {
    const normalizedMode = normalizeInterviewMode(nextMode);

    setInterviewMode(normalizedMode);
    setGeneratedQuestions([]);
    setSelectedQuestion("");
  }

  function scrollToSection(section) {
    const map = {
      evaluate: evaluatorSectionRef,
      questions: questionSectionRef,
      upload: uploadSectionRef,
    };

    map[section]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    if (!resumeData) {
      return;
    }

    scrollToSection(health.aiConfigured ? "questions" : "upload");
  }, [resumeData, health.aiConfigured]);

  useEffect(() => {
    if (generatedQuestions.length === 0) {
      return;
    }

    scrollToSection("evaluate");
  }, [generatedQuestions]);

  const roleIsReady = targetRole.trim().length > 0;
  const modeOption = getInterviewModeOption(interviewMode);
  const suggestedQuestion = generatedQuestions[0] ?? null;
  const currentStep = !resumeData
    ? "upload"
    : !health.aiConfigured || generatedQuestions.length === 0
      ? "questions"
      : "evaluate";
  const nextAction = useMemo(() => {
    if (!resumeData) {
      return {
        eyebrow: "Step 1",
        title: "Upload a resume to begin.",
        detail:
          "We’ll turn the resume into a quick profile snapshot before any AI actions happen.",
        actionLabel: "Go to resume upload",
        actionTarget: "upload",
        checklist: [
          "Upload one text-based PDF",
          "Extract high-signal resume highlights",
          "Unlock role-based question generation",
        ],
      };
    }

    if (!health.aiConfigured) {
      return {
        eyebrow: "Demo mode",
        title: "Resume is ready. AI actions unlock after key setup.",
        detail:
          "You can demo the upload and summary flow now. Add the AI key to enable real generation and scoring.",
        actionLabel: "Review resume context",
        actionTarget: "upload",
        checklist: [
          "Resume summary is already mapped",
          "Question generation needs API access",
          "Answer scoring turns on with the same setup",
        ],
      };
    }

    if (generatedQuestions.length === 0) {
      return {
        eyebrow: "Step 2",
        title: roleIsReady
          ? "Generate tailored questions for this role."
          : "Choose the role, then generate tailored questions.",
        detail:
          interviewMode === "brutal"
            ? "Use a specific role title so Brutal Mode can generate a sharper, higher-pressure practice set."
            : "Use a specific role title so the first practice set feels relevant instead of generic.",
        actionLabel: "Go to question generator",
        actionTarget: "questions",
        checklist: [
          `Mode selected: ${modeOption.label}`,
          "Set a clear target role",
          "Generate five focused questions",
          "Start with the suggested first question",
        ],
      };
    }

    return {
      eyebrow: "Step 3",
      title: "Practice the suggested question and get coaching feedback.",
      detail:
        interviewMode === "brutal"
          ? "Use one concrete example in your answer so the stricter evaluator has enough evidence to challenge weak claims."
          : "Use one concrete example in your answer so the evaluator can score relevance, clarity, and impact.",
      actionLabel: "Go to answer evaluator",
      actionTarget: "evaluate",
      checklist: [
        `Mode selected: ${modeOption.label}`,
        "Suggested first question is ready",
        "Answer using the STAR structure",
        "Review strengths, gaps, and next retry advice",
      ],
    };
  }, [
    generatedQuestions.length,
    health.aiConfigured,
    interviewMode,
    modeOption.label,
    resumeData,
    roleIsReady,
    suggestedQuestion,
  ]);

  const summaryTiles = [
    {
      label: "Resume context",
      note: resumeData
        ? `${resumeData.characterCount.toLocaleString()} characters extracted and ready for reuse.`
        : "No resume uploaded yet.",
      tone: resumeData ? "ready" : "idle",
      value: resumeData ? `${resumeData.pageCount} pages mapped` : "Pending",
    },
    {
      label: "Target role",
      note: roleIsReady
        ? "This role now anchors question phrasing and evaluation criteria."
        : "Set the hiring target before generating questions.",
      tone: roleIsReady ? "ready" : "idle",
      value: roleIsReady ? targetRole.trim() : "Not selected",
    },
    {
      label: "Interview mode",
      note: isBrutalMode(interviewMode)
        ? "High-pressure track is armed before the interview starts."
        : "Default coaching flow stays active and unchanged.",
      tone: isBrutalMode(interviewMode) ? "locked" : "ready",
      value: modeOption.label,
    },
    {
      label: "AI workflow",
      note: health.aiConfigured
        ? "Generation and scoring are enabled."
        : "Upload works in demo mode until AI credentials are added.",
      tone: health.aiConfigured ? "ready" : "locked",
      value: health.aiConfigured ? health.aiModel || "Connected" : "Demo mode",
    },
  ];

  const workflowSteps = [
    {
      label: "Resume upload",
      detail: resumeData ? resumeData.fileName : "Bring in candidate context",
      statusLabel: resumeData ? "Complete" : "Current",
      tone: resumeData ? "ready" : "active",
    },
    {
      label: "Role + question set",
      detail:
        generatedQuestions.length > 0
          ? "Suggested first question is ready"
          : roleIsReady
            ? "Ready to generate prompts"
            : "Define the target role",
      statusLabel: generatedQuestions.length > 0 ? "Complete" : resumeData ? "Current" : "Locked",
      tone: generatedQuestions.length > 0 ? "ready" : resumeData ? "active" : "idle",
    },
    {
      label: "Answer evaluation",
      detail: health.aiConfigured
        ? generatedQuestions.length > 0
          ? "Score the first answer"
          : "Unlocks after questions are generated"
        : "Requires AI configuration",
      statusLabel:
        !health.aiConfigured
          ? "Locked"
          : generatedQuestions.length > 0
            ? "Current"
            : "Pending",
      tone:
        !health.aiConfigured
          ? "locked"
          : generatedQuestions.length > 0
            ? "active"
            : "idle",
    },
  ];

  if (isStandaloneEvaluator) {
    return (
      <main className="relative min-h-screen pb-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_38%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_32%)]" />

        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <header className="rounded-[28px] border border-white/10 bg-slate-950/65 px-5 py-4 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Standalone evaluator
                </p>
                <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                  Answer Evaluator
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300">
                  This tab keeps the scoring workspace separate so you can practice one
                  answer at a time without losing the main dashboard context.
                </p>
              </div>

              <a
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
                href={window.location.pathname}
              >
                Back to workspace
              </a>
            </div>
          </header>

          <AnswerEvaluatorPanel
            aiConfigured={health.aiConfigured}
            aiModel={health.aiModel}
            isStandalone
            mode={interviewMode}
            onQuestionChange={setSelectedQuestion}
            priority
            questions={generatedQuestions}
            resumeText={resumeData?.text ?? ""}
            role={targetRole.trim()}
            selectedQuestion={selectedQuestion}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen pb-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_38%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_32%)]" />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-slate-950/65 px-5 py-4 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold tracking-[0.28em] text-white">
                AIC
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Interview workspace
                </p>
                <div>
                  <h1 className="text-lg font-semibold tracking-[-0.03em] text-white">
                    AI Interview Copilot
                  </h1>
                  <p className="text-sm text-slate-400">
                    Dark, minimal practice workspace for role-aware interview prep.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="idle">React + Vite</StatusBadge>
              <StatusBadge tone={isBrutalMode(interviewMode) ? "locked" : "ready"}>
                {modeOption.shortLabel}
              </StatusBadge>
              <StatusBadge tone={health.aiConfigured ? "ready" : "locked"}>
                {health.aiConfigured ? "AI connected" : "Demo mode"}
              </StatusBadge>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
          <div className="space-y-6 rounded-[32px] border border-white/10 bg-slate-950/55 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.4)] backdrop-blur-xl sm:p-8">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                Hackathon build
              </span>

              <div className="space-y-4">
                <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">
                  A polished interview workflow that is easy to scan, act on, and demo.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Upload a resume, generate sharper role-specific prompts, and evaluate answers
                  in a single calm workspace that feels closer to a real product than a
                  hackathon stack of forms.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div
                className={cn(
                  "inline-flex max-w-max items-center gap-3 rounded-full border px-4 py-3 text-sm transition-colors duration-300",
                  health.status === "online"
                    ? "border-emerald-300/15 bg-emerald-300/10 text-emerald-50"
                    : health.status === "offline"
                      ? "border-rose-300/15 bg-rose-300/10 text-rose-50"
                      : "border-amber-300/15 bg-amber-300/10 text-amber-50",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_20px_currentColor]" />
                {health.message}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  Resume upload
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  Question generation
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  Answer scoring
                </span>
              </div>
            </div>
          </div>

          <aside className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  {nextAction.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {nextAction.title}
                </h3>
              </div>

              <StatusBadge tone={currentStep === "evaluate" ? "ready" : "active"}>
                {currentStep === "upload"
                  ? "Start here"
                  : currentStep === "questions"
                    ? "In progress"
                    : "Ready to coach"}
              </StatusBadge>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300">{nextAction.detail}</p>

            <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-300">
              {nextAction.checklist.map((item) => (
                <li className="flex items-start gap-3" key={item}>
                  <span className="mt-2 h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.4)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <ActionButton
                className="w-full sm:w-auto"
                priority
                onClick={() => scrollToSection(nextAction.actionTarget)}
                type="button"
              >
                {nextAction.actionLabel}
              </ActionButton>
            </div>

            <div className="mt-6 grid gap-3">
              {workflowSteps.map((step, index) => (
                <article
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 transition-all duration-300 hover:border-white/15 hover:bg-slate-950/70"
                  key={step.label}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                        Step {String(index + 1).padStart(2, "0")}
                      </p>
                      <h4 className="text-sm font-semibold text-white">{step.label}</h4>
                      <p className="text-sm leading-6 text-slate-400">{step.detail}</p>
                    </div>

                    <StatusBadge tone={step.tone}>{step.statusLabel}</StatusBadge>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <InterviewModeSelector mode={interviewMode} onModeChange={handleModeChange} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryTiles.map((item) => (
            <article
              className={cn(
                "rounded-[24px] border p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15",
                statToneClasses[item.tone] ?? statToneClasses.idle,
              )}
              key={item.label}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                {item.label}
              </p>
              <div className="mt-4 space-y-2">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                  {item.value}
                </h3>
                <p className="text-sm leading-7 text-slate-300">{item.note}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <div ref={uploadSectionRef} className="scroll-mt-6">
              <ResumeUploadPanel
                priority={currentStep === "upload"}
                resumeData={resumeData}
                onResumeExtracted={(data) => {
                  setResumeData(data);
                  setGeneratedQuestions([]);
                  setSelectedQuestion("");
                }}
              />
            </div>

            <div ref={questionSectionRef} className="scroll-mt-6 space-y-6">
              <QuestionGeneratorPanel
                aiConfigured={health.aiConfigured}
                aiModel={health.aiModel}
                generatedQuestions={generatedQuestions}
                mode={interviewMode}
                onJumpToEvaluate={() => scrollToSection("evaluate")}
                onQuestionSelect={setSelectedQuestion}
                priority={currentStep === "questions" && health.aiConfigured}
                resumeText={resumeData?.text ?? ""}
                role={targetRole}
                selectedQuestion={selectedQuestion}
                onQuestionsGenerated={setGeneratedQuestions}
                onRoleChanged={setTargetRole}
              />

              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.4)] backdrop-blur-xl sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                      Product path
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Roadmap
                    </h3>
                  </div>

                  <StatusBadge tone="idle">Shipping in steps</StatusBadge>
                </div>

                <div className="mt-6 space-y-3">
                  {roadmap.map((item, index) => (
                    <article
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition-all duration-300 hover:border-white/15 hover:bg-slate-950/75"
                      key={item.title}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Stage {String(index + 1).padStart(2, "0")}
                          </p>
                          <h4 className="text-base font-semibold text-white">{item.title}</h4>
                          <p className="text-sm leading-7 text-slate-300">{item.description}</p>
                        </div>

                        <StatusBadge tone={roadmapTones[item.status] ?? "idle"}>
                          {item.status}
                        </StatusBadge>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="space-y-6">
            <div ref={evaluatorSectionRef} className="scroll-mt-6">
              <AnswerEvaluatorPanel
                aiConfigured={health.aiConfigured}
                aiModel={health.aiModel}
                mode={interviewMode}
                onQuestionChange={setSelectedQuestion}
                onOpenInNewTab={handleOpenEvaluatorInNewTab}
                priority={currentStep === "evaluate" && health.aiConfigured}
                questions={generatedQuestions}
                resumeText={resumeData?.text ?? ""}
                role={targetRole.trim()}
                selectedQuestion={selectedQuestion}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
