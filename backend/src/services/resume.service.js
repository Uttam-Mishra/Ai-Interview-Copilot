import { PDFParse } from "pdf-parse";

const PREVIEW_LENGTH = 1800;

function normalizeExtractedText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const result = await parser.getText();
    const text = normalizeExtractedText(result.text);

    return {
      characterCount: text.length,
      pageCount: result.total,
      preview: text.slice(0, PREVIEW_LENGTH),
      text,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}
