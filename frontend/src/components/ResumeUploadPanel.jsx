import { useState } from "react";
import { uploadResume } from "../lib/api";

export default function ResumeUploadPanel({ onResumeExtracted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeResult, setResumeResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Choose a PDF resume before uploading.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const data = await uploadResume(selectedFile);
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

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setResumeResult(null);
    setErrorMessage("");
    onResumeExtracted?.(null);
  }

  return (
    <section className="panel upload-panel">
      <div className="panel-header">
        <h2>Resume Upload</h2>
        <p>Upload a PDF so we can extract the text for question generation.</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker" htmlFor="resume-upload">
          <span className="file-picker__label">Resume PDF</span>
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

        <button className="primary-button" disabled={isUploading} type="submit">
          {isUploading ? "Extracting..." : "Upload and Extract"}
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
