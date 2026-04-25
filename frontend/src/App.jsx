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

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Hackathon Build</p>
        <h1>AI Interview Copilot</h1>
        <p className="hero-copy">
          A focused workspace for turning resumes into interview practice with
          AI-generated questions and structured feedback.
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
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Build roadmap</h2>
          <p>We are intentionally shipping this in small, testable steps.</p>
        </div>

        <div className="roadmap-grid">
          {roadmap.map((item) => (
            <article className="roadmap-card" key={item.title}>
              <span className="card-status">{item.status}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

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
      <AnswerEvaluatorPanel
        aiConfigured={health.aiConfigured}
        aiModel={health.aiModel}
        questions={generatedQuestions}
        resumeText={resumeData?.text ?? ""}
        role={targetRole.trim()}
      />
    </main>
  );
}
