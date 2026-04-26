import { useEffect, useState } from "react";
import AnswerEvaluatorPanel from "./components/AnswerEvaluatorPanel";
import QuestionGeneratorPanel from "./components/QuestionGeneratorPanel";
import ResumeUploadPanel from "./components/ResumeUploadPanel";
import { getHealth } from "./lib/api";

const roadmap = [
  {
    title: "Foundation",
    description: "Frontend and backend are connected with a simple health check.",
    status: "Done",
  },
  {
    title: "Resume Upload",
    description: "Upload a PDF and extract the text we will use for question generation.",
    status: "Done",
  },
  {
    title: "Question Generator",
    description: "Generate interview questions from the target role and resume context.",
    status: "Done",
  },
  {
    title: "Answer Evaluator",
    description: "Send candidate answers to the backend and return structured AI feedback.",
    status: "In progress",
  },
];

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

  const summaryTiles = [
    {
      label: "Resume Context",
      note: resumeData
        ? `${resumeData.characterCount.toLocaleString()} characters extracted`
        : "Upload a PDF to build candidate context.",
      tone: resumeData ? "ready" : "idle",
      value: resumeData ? `${resumeData.pageCount} pages ready` : "Pending",
    },
    {
      label: "Interview Role",
      note: targetRole
        ? "Question generation will anchor to this role."
        : "Set the role before generating questions.",
      tone: targetRole ? "ready" : "idle",
      value: targetRole || "Not selected",
    },
    {
      label: "AI Workflow",
      note: health.aiConfigured
        ? "Question generation and answer evaluation are live."
        : "Demo mode keeps upload live until the API key is added.",
      tone: health.aiConfigured ? "ready" : "locked",
      value: health.aiConfigured ? health.aiModel || "Configured" : "Demo mode",
    },
  ];

  const cockpitItems = [
    {
      label: "Resume uploaded",
      status: Boolean(resumeData),
      value: resumeData ? "Context extracted" : "Waiting for PDF",
    },
    {
      label: "Role selected",
      status: Boolean(targetRole),
      value: targetRole || "Waiting for target role",
    },
    {
      label: "Questions generated",
      status: generatedQuestions.length > 0,
      value:
        generatedQuestions.length > 0
          ? `${generatedQuestions.length} ready to practice`
          : "Generate the first batch",
    },
  ];

  const workflowSteps = [
    {
      id: "upload",
      label: "Upload Resume",
      detail: resumeData ? resumeData.fileName : "Bring in the candidate context",
      tone: resumeData ? "ready" : "active",
    },
    {
      id: "role",
      label: "Define Role",
      detail: targetRole || "Choose the role you are hiring for",
      tone: targetRole ? "ready" : resumeData ? "active" : "idle",
    },
    {
      id: "questions",
      label: "Generate Questions",
      detail:
        generatedQuestions.length > 0
          ? `${generatedQuestions.length} interview prompts prepared`
          : "Create the practice set",
      tone: generatedQuestions.length > 0 ? "ready" : targetRole ? "active" : "idle",
    },
    {
      id: "feedback",
      label: "Evaluate Answers",
      detail: health.aiConfigured
        ? "Score and coach each response"
        : "Unlock with API key when ready",
      tone: health.aiConfigured ? "active" : "locked",
    },
  ];

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">AIC</span>
          <div>
            <strong>AI Interview Copilot</strong>
            <p>Hackathon prototype for guided interview practice</p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="topbar-chip">React + Node</span>
          <span
            className={`topbar-chip topbar-chip--${
              health.aiConfigured ? "ready" : "locked"
            }`}
          >
            {health.aiConfigured ? "AI Connected" : "Demo Mode"}
          </span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Hackathon Build</p>
          <h1>AI Interview Copilot</h1>
          <p className="hero-copy">
            Turn a candidate resume into a guided interview loop with sharper
            prompts, practice-ready questions, and structured feedback that feels
            useful instead of generic.
          </p>

          <div className={`status-pill status-pill--${health.status}`}>
            <span className="status-dot" />
            {health.message}
          </div>

          {!health.aiConfigured && health.status === "online" ? (
            <div className="notice-banner">
              <strong>Demo mode is live.</strong>
              Resume upload works now, and AI question generation/evaluation will unlock
              after you add <code>OPENAI_API_KEY</code> to your deployed backend.
            </div>
          ) : null}
        </div>

        <aside className="hero-card">
          <div className="hero-card__header">
            <span className="section-kicker">Session Snapshot</span>
            <span
              className={`section-badge section-badge--${
                health.aiConfigured ? "ready" : "locked"
              }`}
            >
              {health.aiConfigured ? "AI Ready" : "Setup Pending"}
            </span>
          </div>

          <div className="hero-card__metric">
            <span className="hero-card__label">Practice loop</span>
            <strong>{generatedQuestions.length > 0 ? "Candidate-ready" : "Preparing"}</strong>
            <p>
              Upload, generate, evaluate. The workflow is designed so you can demo
              value quickly even before the live AI key is connected.
            </p>
          </div>

          <div className="hero-checklist">
            {cockpitItems.map((item) => (
              <article className="hero-checklist__item" key={item.label}>
                <span
                  className={`hero-checklist__dot hero-checklist__dot--${
                    item.status ? "ready" : "idle"
                  }`}
                />
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.value}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="summary-grid">
        {summaryTiles.map((item) => (
          <article className={`summary-tile summary-tile--${item.tone}`} key={item.label}>
            <span className="summary-tile__label">{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </section>

      <section className="panel workflow-rail">
        <div className="panel-topline">
          <span className="section-kicker">Workflow</span>
          <span className="section-badge section-badge--idle">Live pipeline</span>
        </div>

        <div className="workflow-rail__grid">
          {workflowSteps.map((step, index) => (
            <article className={`workflow-step workflow-step--${step.tone}`} key={step.id}>
              <span className="workflow-step__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{step.label}</h3>
                <p>{step.detail}</p>
              </div>
              <span className={`section-badge section-badge--${step.tone}`}>
                {step.tone === "ready"
                  ? "Ready"
                  : step.tone === "active"
                    ? "Active"
                    : step.tone === "locked"
                      ? "Locked"
                      : "Waiting"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <ResumeUploadPanel
            onResumeExtracted={(data) => {
              setResumeData(data);
              setGeneratedQuestions([]);
            }}
          />
          <QuestionGeneratorPanel
            aiConfigured={health.aiConfigured}
            aiModel={health.aiModel}
            onQuestionsGenerated={setGeneratedQuestions}
            onRoleChanged={setTargetRole}
            resumeText={resumeData?.text ?? ""}
          />
        </div>

        <aside className="workspace-side">
          <AnswerEvaluatorPanel
            aiConfigured={health.aiConfigured}
            aiModel={health.aiModel}
            questions={generatedQuestions}
            resumeText={resumeData?.text ?? ""}
            role={targetRole.trim()}
          />

          <section className="panel roadmap-panel">
            <div className="panel-topline">
              <span className="section-kicker">Roadmap</span>
              <span className="section-badge section-badge--idle">Product path</span>
            </div>

            <div className="panel-header">
              <h2>Build roadmap</h2>
              <p>Each stage is shaped to support a smooth interview practice loop.</p>
            </div>

            <div className="roadmap-grid roadmap-grid--stacked">
              {roadmap.map((item, index) => (
                <article className="roadmap-card" key={item.title}>
                  <span className="roadmap-card__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="card-status">{item.status}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
