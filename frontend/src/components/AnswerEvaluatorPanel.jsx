import { useEffect, useState } from "react";
import { evaluateAnswer } from "../lib/api";

export default function AnswerEvaluatorPanel({
  aiConfigured,
  aiModel,
  role,
  questions,
  resumeText,
}) {
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [modelName, setModelName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    if (questions.length === 0) {
      setSelectedQuestion("");
      setAnswer("");
      setFeedback(null);
      setModelName("");
      setErrorMessage("");
      return;
    }

    setSelectedQuestion((currentValue) => {
      if (currentValue && questions.some((item) => item.question === currentValue)) {
        return currentValue;
      }

      return questions[0].question;
    });
  }, [questions]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!role) {
      setErrorMessage("Enter the target role and generate questions first.");
      return;
    }

    if (!selectedQuestion) {
      setErrorMessage("Select a question before evaluation.");
      return;
    }

    if (!answer.trim()) {
      setErrorMessage("Write an answer before evaluation.");
      return;
    }

    setIsEvaluating(true);
    setErrorMessage("");

    try {
      const data = await evaluateAnswer({
        role,
        resumeText,
        question: selectedQuestion,
        answer: answer.trim(),
      });

      setFeedback(data.feedback);
      setModelName(data.model);
    } catch (error) {
      setFeedback(null);
      setModelName("");
      setErrorMessage(error.message);
    } finally {
      setIsEvaluating(false);
    }
  }

  const isDisabled =
    isEvaluating || !resumeText || !role || questions.length === 0 || !aiConfigured;
  const panelTone = feedback ? "ready" : aiConfigured ? "idle" : "locked";
  const panelStatus = feedback ? "Feedback ready" : aiConfigured ? "Ready to evaluate" : "Demo mode";
  const helperMessage = !resumeText
    ? "Upload a resume first so the evaluator has context."
    : questions.length === 0
      ? "Generate questions first so this evaluator has something to score."
      : !aiConfigured
        ? "Add the API key in production to enable real evaluation."
        : "Pick a question and submit an answer for structured feedback.";

  return (
    <section className="panel evaluator-panel">
      <div className="panel-topline">
        <span className="section-kicker">Step 3</span>
        <span className={`section-badge section-badge--${panelTone}`}>{panelStatus}</span>
      </div>

      <div className="panel-header">
        <h2>Answer Evaluator</h2>
        <p>Practice one generated question at a time and review where the answer is strong or thin.</p>
      </div>

      {!aiConfigured ? (
        <p className="feedback feedback--muted">
          AI evaluation is currently disabled. Add <code>OPENAI_API_KEY</code> to
          the backend to enable this panel{aiModel ? ` with ${aiModel}` : ""}.
        </p>
      ) : null}

      <form className="evaluator-form" onSubmit={handleSubmit}>
        <label className="field-group" htmlFor="question-select">
          <span className="field-label">Interview Question</span>
          <select
            id="question-select"
            className="text-input"
            disabled={questions.length === 0}
            value={selectedQuestion}
            onChange={(event) => setSelectedQuestion(event.target.value)}
          >
            {questions.length === 0 ? (
              <option value="">Generate questions first</option>
            ) : null}

            {questions.map((item, index) => (
              <option key={`${item.focus}-${index}`} value={item.question}>
                {item.question}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group" htmlFor="answer-input">
          <span className="field-label">Your Answer</span>
          <textarea
            id="answer-input"
            className="text-area"
            placeholder="Write the candidate answer here..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </label>

        <button className="primary-button" disabled={isDisabled} type="submit">
          {isEvaluating ? "Evaluating..." : "Evaluate Answer"}
        </button>
      </form>

      {isDisabled ? (
        <div className="empty-state">
          <strong>Feedback will appear here</strong>
          <p>{helperMessage}</p>
        </div>
      ) : null}

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      {feedback ? (
        <div className="evaluation-result">
          <div className="evaluation-result__header">
            <h3>Evaluation Feedback</h3>
            <span>{modelName}</span>
          </div>

          <div className="score-pill">
            <span className="meta-label">Score</span>
            <strong>{feedback.score}/10</strong>
          </div>

          <div className="evaluation-grid">
            <section className="evaluation-card">
              <h4>Strengths</h4>
              <ul>
                {feedback.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="evaluation-card">
              <h4>Weaknesses</h4>
              <ul>
                {feedback.weaknesses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
