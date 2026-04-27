import { useMemo, useState } from "react";
import { buildResumeUploadPayload, uploadResume } from "../lib/api";
import {
  ActionButton,
  EmptyState,
  FieldShell,
  InfoBanner,
  PanelFrame,
  SkeletonLine,
  StatusBadge,
} from "./ui";

function buildPreviewChunks(preview) {
  const lineChunks = preview
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lineChunks.length > 1) {
    return lineChunks.slice(0, 6);
  }

  return preview
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function ResumeUploadPanel({
  onResumeExtracted,
  priority = false,
  resumeData,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preparedUpload, setPreparedUpload] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Choose a PDF resume before uploading.");
      return;
    }

    if (!preparedUpload) {
      setErrorMessage("Choose a readable PDF resume before uploading.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const data = await uploadResume(preparedUpload);
      onResumeExtracted?.(data);
    } catch (error) {
      setErrorMessage(error.message);
      onResumeExtracted?.(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setPreparedUpload(null);
    setErrorMessage("");
    onResumeExtracted?.(null);

    if (!file) {
      return;
    }

    setIsPreparing(true);

    try {
      const payload = await buildResumeUploadPayload(file);
      setPreparedUpload(payload);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsPreparing(false);
    }
  }

  const previewChunks = useMemo(
    () => (resumeData?.preview ? buildPreviewChunks(resumeData.preview) : []),
    [resumeData],
  );

  const status = resumeData
    ? "Resume mapped"
    : isPreparing
      ? "Reading PDF"
      : selectedFile
        ? "Ready to extract"
        : "Awaiting file";

  const statusTone = resumeData ? "ready" : selectedFile ? "active" : "idle";

  return (
    <PanelFrame
      description="Bring in a candidate resume first. We condense the extracted text into scan-friendly highlights so the next steps stay easy to review."
      priority={priority}
      status={status}
      statusTone={statusTone}
      step="Step 1"
      title="Resume Upload"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label
          className="group block cursor-pointer rounded-[28px] border border-dashed border-white/12 bg-slate-950/55 p-5 transition-all duration-300 hover:border-sky-300/35 hover:bg-slate-950/75"
          htmlFor="resume-upload"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  Resume PDF
                </p>
                <h3 className="text-lg font-semibold text-white">
                  Choose a text-based PDF for the cleanest extraction.
                </h3>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-slate-300">
                Better parsing means better prompts later. Shorter, readable PDFs work best
                for demo speed and cleaner preview highlights.
              </p>
            </div>

            <StatusBadge tone={selectedFile ? "active" : "idle"}>
              {selectedFile?.name ?? "No file selected"}
            </StatusBadge>
          </div>

          <input
            className="sr-only"
            id="resume-upload"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">
              {resumeData
                ? "Resume extracted successfully."
                : selectedFile
                  ? "File selected. Extract when ready."
                  : "Select one PDF to continue."}
            </p>
            <p className="text-sm text-slate-400">
              {isPreparing
                ? "Reading the file in your browser before upload."
                : "This is the primary action before question generation."}
            </p>
          </div>

          <ActionButton
            className="min-w-[190px]"
            disabled={isPreparing || isUploading || !preparedUpload}
            priority={priority}
            type="submit"
          >
            {isPreparing
              ? "Reading PDF..."
              : isUploading
                ? "Uploading and extracting..."
                : "Upload and Extract"}
          </ActionButton>
        </div>
      </form>

      {errorMessage ? <InfoBanner tone="warning">{errorMessage}</InfoBanner> : null}

      {isUploading ? (
        <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Preparing scan view</p>
              <p className="mt-1 text-sm text-slate-400">
                Extracting text and turning it into a cleaner preview.
              </p>
            </div>
            <StatusBadge tone="active">Working</StatusBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4" key={index}>
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="mt-4 h-8 w-24 rounded-2xl" />
                <SkeletonLine className="mt-3 h-3 w-16" />
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {[0, 1, 2, 3].map((index) => (
              <SkeletonLine className="h-4 w-full" key={index} />
            ))}
          </div>
        </div>
      ) : null}

      {resumeData ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: "File name",
                value: resumeData.fileName,
              },
              {
                label: "Pages",
                value: String(resumeData.pageCount),
              },
              {
                label: "Extracted characters",
                value: resumeData.characterCount.toLocaleString(),
              },
            ].map((item) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                key={item.label}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <InfoBanner tone="success">
            Resume context is ready. The next highest-value move is generating role-specific
            questions from these extracted highlights.
          </InfoBanner>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Preview highlights
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Condensed resume scan for quick review
                </h3>
              </div>

              <span className="text-sm text-slate-400">
                Showing {previewChunks.length} high-signal chunks
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {previewChunks.map((chunk, index) => (
                <article
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 transition-all duration-300 hover:border-white/12 hover:bg-white/[0.055]"
                  key={`${chunk}-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.45)]" />
                    <p className="text-sm leading-7 text-slate-200">{chunk}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="What shows up here after extraction">
          <ul className="space-y-2">
            <li>Resume file details, page count, and extracted character count.</li>
            <li>Readable preview highlights instead of one dense block of text.</li>
            <li>A smoother handoff into role selection and question generation.</li>
          </ul>
        </EmptyState>
      )}
    </PanelFrame>
  );
}
