import { useState } from "react";
import { buildResumeUploadPayload, uploadResume } from "../lib/api";

export default function ResumeUploadPanel({ onResumeExtracted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preparedUpload, setPreparedUpload] = useState(null);
  const [resumeResult, setResumeResult] = useState(null);
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
      setResumeResult(data);
      onResumeExtracted?.(data);
    } catch (error) {
      setResumeResult(null);
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
    setResumeResult(null);
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

  const panelStatus = resumeResult
    ? "Resume ready"
    : isPreparing
      ? "Reading file"
      : selectedFile
        ? "Ready to extract"
        : "Awaiting upload";
  const panelTone = resumeResult ? "ready" : selectedFile ? "idle" : "locked";

  return (
    <section className="panel upload-panel">
      <div className="panel-topline">
        <span className="section-kicker">Step 1</span>
        <span className={`section-badge section-badge--${panelTone}`}>{panelStatus}</span>
      </div>

      <div className="panel-header">
        <h2>Resume Upload</h2>
        <p>Upload a candidate PDF so we can turn the raw document into usable interview context.</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label
          className={`file-picker ${selectedFile ? "file-picker--selected" : ""}`}
          htmlFor="resume-upload"
        >
          <span className="file-picker__label">Resume PDF</span>
          <span className="file-picker__hint">
            Text-based PDFs work best for clean extraction and stronger downstream prompts.
          </span>
          <input
            id="resume-upload"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
          />
          <span className="file-picker__name">
            {selectedFile?.name ?? "No file selected yet"}
          </span>
        </label>

        <button
          className="primary-button"
          disabled={isPreparing || isUploading || !preparedUpload}
          type="submit"
        >
          {isPreparing ? "Reading PDF..." : isUploading ? "Extracting..." : "Upload and Extract"}
        </button>
      </form>

      {errorMessage ? <p className="feedback feedback--error">{errorMessage}</p> : null}

      {resumeResult ? (
        <div className="resume-result">
          <div className="resume-result__meta">
            <div>
              <span className="meta-label">File</span>
              <strong>{resumeResult.fileName}</strong>
            </div>
            <div>
              <span className="meta-label">Pages</span>
              <strong>{resumeResult.pageCount}</strong>
            </div>
            <div>
              <span className="meta-label">Characters</span>
              <strong>{resumeResult.characterCount}</strong>
            </div>
          </div>

          <div className="checkpoint-banner">
            Resume context is ready. You can move to role-based question generation now.
          </div>

          <div className="extracted-text">
            <div className="extracted-text__header">
              <h3>Extracted Text Preview</h3>
              <span>{resumeResult.characterCount > resumeResult.preview.length ? "Preview" : "Full text"}</span>
            </div>
            <pre>{resumeResult.preview}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
