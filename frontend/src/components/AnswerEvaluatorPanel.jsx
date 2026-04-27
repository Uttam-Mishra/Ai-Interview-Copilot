import { useEffect, useState } from "react";
import { evaluateAnswer } from "../lib/api";
import {
  ActionButton,
  EmptyState,
  FieldShell,
  InfoBanner,
  PanelFrame,
  SkeletonLine,
  StatusBadge,
} from "./ui";

export default function AnswerEvaluatorPanel({
  aiConfigured,
  aiModel,
  isStandalone = false,
  onOpenInNewTab,
  priority = false,
  questions,
  resumeText,
  role,
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

  const hasQuestions = questions.length > 0;
  const isDisabled =
    isEvaluating || !resumeText || !role || !hasQuestions || !aiConfigured;
  const status = feedback
    ? "Feedback ready"
    : aiConfigured
      ? "Ready to evaluate"
      : "Demo mode";
  const statusTone = feedback ? "ready" : aiConfigured ? "active" : "locked";
  const helperMessage = !resumeText
    ? "Upload a resume first so the evaluator has context."
    : !hasQuestions
      ? "Generate a question set first so this panel has something to score."
      : !aiConfigured
        ? "Add the API key in production to enable real evaluation."
        : "Choose one question, write a concise answer, and submit it for structured feedback.";

  return (
    <PanelFrame
      className="xl:self-start"
      description="This panel is designed for focused practice: one selected question, one roomy answer box, and one clear evaluation action."
      headerAction={
        !isStandalone ? (
          <ActionButton className="px-4 py-2.5 text-xs" onClick={onOpenInNewTab} type="button">
            Open in new tab
          </ActionButton>
        ) : null
      }
      priority={priority}
      status={status}
      statusTone={statusTone}
      step="Step 3"
      title="Answer Evaluator"
    >
      {!aiConfigured ? (
        <InfoBanner tone="warning">
          AI evaluation is currently disabled. Add <code>OPENAI_API_KEY</code> to the
          backend to enable this panel{aiModel ? ` with ${aiModel}` : ""}.
        </InfoBanner>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="space-y-2" htmlFor="question-select">
          <span className="text-sm font-medium text-slate-200">Interview question</span>
          <FieldShell>
            <select
              id="question-select"
              className="w-full appearance-none border-0 bg-transparent text-sm leading-7 text-white outline-none disabled:text-slate-500"
              disabled={!hasQuestions}
              value={selectedQuestion}
              onChange={(event) => setSelectedQuestion(event.target.value)}
            >
              {!hasQuestions ? <option value="">Generate questions first</option> : null}

              {questions.map((item, index) => (
                <option key={`${item.focus}-${index}`} value={item.question}>
                  {item.question}
                </option>
              ))}
            </select>
          </FieldShell>
        </label>

        <label className="space-y-3" htmlFor="answer-input">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-200">Your answer</span>
            <p className="text-sm leading-7 text-slate-400">
              Keep it concrete. One clear example usually scores better than a broad,
              generic explanation.
            </p>
          </div>

          <FieldShell className="p-0">
            <textarea
              id="answer-input"
              className="min-h-[230px] w-full resize-y rounded-2xl border-0 bg-transparent px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-500"
              placeholder={
                "Example:\nI would answer this using a recent project. First I would explain the context, then the actions I owned, and finally the outcome with numbers or impact."
              }
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </FieldShell>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <StatusBadge tone={hasQuestions ? "ready" : "idle"}>
              {hasQuestions ? "Question selected" : "Question pending"}
            </StatusBadge>
            {modelName ? <StatusBadge tone="active">{modelName}</StatusBadge> : null}
          </div>

          <ActionButton
            className="sm:min-w-[210px]"
            disabled={isDisabled}
            priority={priority}
            type="submit"
          >
            {isEvaluating ? "Evaluating answer..." : "Evaluate Answer"}
          </ActionButton>
        </div>
      </form>

      {isDisabled && !errorMessage && !feedback ? (
        <EmptyState title="Feedback will show up here">
          <p>{helperMessage}</p>
        </EmptyState>
      ) : null}

      {errorMessage ? <InfoBanner tone="warning">{errorMessage}</InfoBanner> : null}

      {isEvaluating ? (
        <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Evaluating answer...</p>
              <p className="mt-1 text-sm text-slate-400">
                Scoring clarity, relevance, and signal depth against the selected question.
              </p>
            </div>
            <StatusBadge tone="active">Scoring</StatusBadge>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-5">
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="mt-4 h-10 w-24 rounded-2xl" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[0, 1].map((index) => (
                <div className="space-y-3" key={index}>
                  <SkeletonLine className="h-4 w-24" />
                  <SkeletonLine className="h-4 w-full" />
                  <SkeletonLine className="h-4 w-10/12" />
                  <SkeletonLine className="h-4 w-9/12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!isEvaluating && feedback ? (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Evaluation result
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Structured coaching feedback
                </h3>
              </div>

              <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-300/10 px-5 py-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/80">
                  Score
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {feedback.score}
                  <span className="text-lg text-slate-400">/10</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-white">Strengths</h4>
                <StatusBadge tone="ready">Keep</StatusBadge>
              </div>
              <ul className="mt-4 space-y-3">
                {feedback.strengths.map((item) => (
                  <li className="flex items-start gap-3 text-sm leading-7 text-slate-200" key={item}>
                    <span className="mt-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.45)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-white">Weaknesses</h4>
                <StatusBadge tone="locked">Improve</StatusBadge>
              </div>
              <ul className="mt-4 space-y-3">
                {feedback.weaknesses.map((item) => (
                  <li className="flex items-start gap-3 text-sm leading-7 text-slate-200" key={item}>
                    <span className="mt-2 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.38)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </PanelFrame>
  );
}
