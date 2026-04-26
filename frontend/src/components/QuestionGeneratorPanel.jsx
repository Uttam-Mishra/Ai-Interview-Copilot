import { useState } from "react";
import { generateQuestions } from "../lib/api";

export default function QuestionGeneratorPanel({
  aiConfigured,
  aiModel,
  onQuestionsGenerated,
  onRoleChanged,
  resumeText,
}) {
  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelName, setModelName] = useState("");

  function handleRoleChange(event) {
    const nextRole = event.target.value;

    setRole(nextRole);
    setQuestions([]);
    setModelName("");
    setErrorMessage("");
    onRoleChanged?.(nextRole);
    onQuestionsGenerated?.([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!role.trim()) {
      setErrorMessage("Enter the target role before generating questions.");
      return;
    }

    if (!resumeText) {
      setErrorMessage("Upload a resume first so we have context.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const data = await generateQuestions({
        role: role.trim(),
        resumeText,
      });

      setQuestions(data.questions);
      setModelName(data.model);
      onQuestionsGenerated?.(data.questions);
      onRoleChanged?.(role.trim());
    } catch (error) {
      setQuestions([]);
      setModelName("");
      setErrorMessage(error.message);
      onQuestionsGenerated?.([]);
    } finally {
      setIsGenerating(false);
    }
  }

  const isDisabled = isGenerating || !resumeText || !aiConfigured;
  const panelTone = questions.length > 0 ? "ready" : aiConfigured ? "idle" : "locked";
  const panelStatus = questions.length > 0 ? "Questions ready" : aiConfigured ? "Ready to generate" : "Demo mode";

  return (
    <section className="panel generator-panel">
      <div className="panel-topline">
        <span className="section-kicker">Step 2</span>
        <span className={`section-badge section-badge--${panelTone}`}>{panelStatus}</span>
      </div>

      <div className="panel-header">
        <h2>Question Generator</h2>
        <p>Set the target role, then generate focused interview questions grounded in the uploaded resume.</p>
      </div>

      {!aiConfigured ? (
        <p className="feedback feedback--muted">
          AI generation is currently disabled. Add <code>OPENAI_API_KEY</code> to
          the backend to enable this panel{aiModel ? ` with ${aiModel}` : ""}.
        </p>
      ) : null}

      <form className="generator-form" onSubmit={handleSubmit}>
        <label className="field-group" htmlFor="target-role">
          <span className="field-label">Target Role</span>
          <input
            id="target-role"
            className="text-input"
            type="text"
            placeholder="Frontend Developer, SDE Intern, Product Analyst..."
            value={role}
            onChange={handleRoleChange}
          />
        </label>

        <button className="primary-button" disabled={isDisabled} type="submit">
          {isGenerating ? "Generating..." : "Generate Questions"}
        </button>
      </form>

      {!resumeText ? (
        <p className="feedback">Upload a resume first to unlock question generation.</p>
      ) : null}

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      {questions.length === 0 ? (
        <div className="empty-state">
          <strong>What this step produces</strong>
          <p>
            We’ll generate a compact set of practice questions tailored to the role,
            skills, and project signals found in the resume.
          </p>
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className="questions-result">
          <div className="questions-result__header">
            <h3>Generated Questions</h3>
            <span>{modelName}</span>
          </div>

          <div className="questions-list">
            {questions.map((item, index) => (
              <article className="question-card" key={`${item.focus}-${index}`}>
                <span className="question-card__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="card-status">{item.focus}</span>
                <p>{item.question}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
