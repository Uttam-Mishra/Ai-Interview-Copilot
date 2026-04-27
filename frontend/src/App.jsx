import { useEffect, useState } from "react";
import AnswerEvaluatorPanel from "./components/AnswerEvaluatorPanel";
import QuestionGeneratorPanel from "./components/QuestionGeneratorPanel";
import ResumeUploadPanel from "./components/ResumeUploadPanel";
import { StatusBadge, cn } from "./components/ui";
import { getHealth } from "./lib/api";

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
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [targetRole, setTargetRole] = useState("");
  const [resumeData, setResumeData] = useState(null);
  const [health, setHealth] = useState({
    aiConfigured: false,
    aiModel: "",
    status: "loading",
    message: "Checking backend connection...",
  });

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

  const roleIsReady = targetRole.trim().length > 0;
  const currentStep = !resumeData
    ? "upload"
    : !health.aiConfigured || generatedQuestions.length === 0
      ? "questions"
      : "evaluate";

  const nextAction = !resumeData
    ? {
        eyebrow: "Step 1",
        title: "Upload a resume PDF to unlock the workflow.",
        detail: "We will extract the most useful candidate context first, then use it to drive question generation and scoring.",
      }
    : !health.aiConfigured
      ? {
          eyebrow: "Demo mode",
          title: "Connect the AI key to unlock question generation.",
          detail: "Resume extraction is live. Add the production AI key when you want real question generation and answer evaluation.",
        }
      : generatedQuestions.length === 0
        ? {
            eyebrow: "Step 2",
            title: roleIsReady
              ? "Generate the first practice set for this role."
              : "Define the role, then generate focused questions.",
            detail: "Use a concise role title like Frontend Engineer, SDE Intern, or Product Analyst to guide the question mix.",
          }
        : {
            eyebrow: "Step 3",
            title: "Evaluate a practice answer while the context is fresh.",
            detail: "Pick the strongest question, write a concise answer, and use the score plus strengths and gaps to coach the next draft.",
          };

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
      tone: resumeData ? "ready" : "active",
    },
    {
      label: "Role + question set",
      detail:
        generatedQuestions.length > 0
          ? `${generatedQuestions.length} prompts prepared`
          : roleIsReady
            ? "Ready to generate prompts"
            : "Define the target role",
      tone: generatedQuestions.length > 0 ? "ready" : resumeData ? "active" : "idle",
    },
    {
      label: "Answer evaluation",
      detail: health.aiConfigured
        ? generatedQuestions.length > 0
          ? "Score the first answer"
          : "Unlocks after questions are generated"
        : "Requires AI configuration",
      tone:
        !health.aiConfigured
          ? "locked"
          : generatedQuestions.length > 0
            ? "active"
            : "idle",
    },
  ];

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

                    <StatusBadge tone={step.tone}>{step.tone}</StatusBadge>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
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
            <ResumeUploadPanel
              priority={currentStep === "upload"}
              resumeData={resumeData}
              onResumeExtracted={(data) => {
                setResumeData(data);
                setGeneratedQuestions([]);
              }}
            />

            <QuestionGeneratorPanel
              aiConfigured={health.aiConfigured}
              aiModel={health.aiModel}
              generatedQuestions={generatedQuestions}
              priority={currentStep === "questions" && health.aiConfigured}
              resumeText={resumeData?.text ?? ""}
              role={targetRole}
              onQuestionsGenerated={setGeneratedQuestions}
              onRoleChanged={setTargetRole}
            />
          </div>

          <div className="space-y-6">
            <AnswerEvaluatorPanel
              aiConfigured={health.aiConfigured}
              aiModel={health.aiModel}
              priority={currentStep === "evaluate" && health.aiConfigured}
              questions={generatedQuestions}
              resumeText={resumeData?.text ?? ""}
              role={targetRole.trim()}
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
        </section>
      </div>
    </main>
  );
}
