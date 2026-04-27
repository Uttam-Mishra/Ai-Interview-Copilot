import { useEffect, useState } from "react";
import { generateQuestions } from "../lib/api";
import {
  ActionButton,
  EmptyState,
  FieldShell,
  InfoBanner,
  PanelFrame,
  SkeletonLine,
  StatusBadge,
} from "./ui";

export default function QuestionGeneratorPanel({
  aiConfigured,
  aiModel,
  generatedQuestions,
  onQuestionsGenerated,
  onRoleChanged,
  priority = false,
  resumeText,
  role,
}) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelName, setModelName] = useState("");

  useEffect(() => {
    if (!resumeText) {
      setModelName("");
      setErrorMessage("");
    }
  }, [resumeText]);

  useEffect(() => {
    if (generatedQuestions.length === 0 && !isGenerating) {
      setModelName("");
    }
  }, [generatedQuestions, isGenerating]);

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

      setModelName(data.model);
      onQuestionsGenerated?.(data.questions);
      onRoleChanged?.(role.trim());
    } catch (error) {
      setModelName("");
      setErrorMessage(error.message);
      onQuestionsGenerated?.([]);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleRoleChange(event) {
    setErrorMessage("");
    setModelName("");
    onRoleChanged?.(event.target.value);
    onQuestionsGenerated?.([]);
  }

  const hasQuestions = generatedQuestions.length > 0;
  const hasRole = role.trim().length > 0;
  const isDisabled = isGenerating || !resumeText || !aiConfigured;
  const status = hasQuestions
    ? "Questions ready"
    : aiConfigured
      ? "Ready to generate"
      : "Demo mode";
  const statusTone = hasQuestions ? "ready" : aiConfigured ? "active" : "locked";

  return (
    <PanelFrame
      description="Define the role once, then generate a compact practice set that is easier to scan and rehearse from than a wall of generic prompts."
      priority={priority}
      status={status}
      statusTone={statusTone}
      step="Step 2"
      title="Question Generator"
    >
      {!aiConfigured ? (
        <InfoBanner tone="warning">
          AI generation is currently disabled. Add <code>OPENAI_API_KEY</code> to the
          backend to enable this panel{aiModel ? ` with ${aiModel}` : ""}.
        </InfoBanner>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-2" htmlFor="target-role">
            <span className="text-sm font-medium text-slate-200">Target role</span>
            <FieldShell>
              <input
                id="target-role"
                className="w-full border-0 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                type="text"
                placeholder="Frontend Engineer, SDE Intern, Product Analyst..."
                value={role}
                onChange={handleRoleChange}
              />
            </FieldShell>
          </label>

          <div className="space-y-2 lg:min-w-[220px]">
            <p className="text-sm font-medium text-slate-200">Primary action</p>
            <ActionButton
              className="w-full"
              disabled={isDisabled}
              priority={priority}
              type="submit"
            >
              {isGenerating ? "Generating questions..." : "Generate Questions"}
            </ActionButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <StatusBadge tone={resumeText ? "ready" : "idle"}>
            {resumeText ? "Resume context loaded" : "Resume required"}
          </StatusBadge>
          <StatusBadge tone={hasRole ? "ready" : "idle"}>
            {hasRole ? "Role selected" : "Role pending"}
          </StatusBadge>
          {modelName ? <StatusBadge tone="active">{modelName}</StatusBadge> : null}
        </div>
      </form>

      {!resumeText ? (
        <InfoBanner>
          Upload a resume first. Once context is available, this button becomes the next
          highest-value action in the flow.
        </InfoBanner>
      ) : null}

      {errorMessage ? <InfoBanner tone="warning">{errorMessage}</InfoBanner> : null}

      {isGenerating ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Generating questions...</p>
              <p className="mt-1 text-sm text-slate-400">
                Creating a tighter set of prompts from the role and resume context.
              </p>
            </div>
            <StatusBadge tone="active">Working</StatusBadge>
          </div>

          <div className="grid gap-3">
            {[0, 1, 2].map((index) => (
              <article
                className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5"
                key={index}
              >
                <div className="flex items-center justify-between gap-3">
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="h-7 w-24 rounded-full" />
                </div>
                <SkeletonLine className="mt-5 h-4 w-full" />
                <SkeletonLine className="mt-3 h-4 w-11/12" />
                <div className="mt-5 flex gap-2">
                  <SkeletonLine className="h-8 w-28 rounded-full" />
                  <SkeletonLine className="h-8 w-24 rounded-full" />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!isGenerating && !hasQuestions ? (
        <EmptyState title="What this step will produce">
          <ul className="space-y-2">
            <li>Five focused practice questions anchored to the selected role.</li>
            <li>Clear focus tags so each prompt is easier to scan and pick from fast.</li>
            <li>Better rehearsal flow than reading one long, dense list.</li>
          </ul>
        </EmptyState>
      ) : null}

      {!isGenerating && hasQuestions ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Practice set
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Generated questions for {role.trim()}
              </h3>
            </div>
            <p className="text-sm text-slate-400">
              Pick one strong prompt and move straight into answer evaluation.
            </p>
          </div>

          <div className="grid gap-3">
            {generatedQuestions.map((item, index) => (
              <article
                className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-slate-950/75"
                key={`${item.focus}-${index}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Question {String(index + 1).padStart(2, "0")}
                    </p>
                    <StatusBadge tone="active">{item.focus}</StatusBadge>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      Use 1 concrete example
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      Tie back to {role.trim()}
                    </span>
                  </div>
                </div>

                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100">
                  {item.question}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </PanelFrame>
  );
}
