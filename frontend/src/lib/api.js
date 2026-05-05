const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function arrayBufferToBase64(arrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
}

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  if (payload === null) {
    throw new Error("API returned an invalid response.");
  }

  return payload;
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return parseApiResponse(response);
}

function getFileReadErrorMessage(error) {
  const name = error?.name ?? "";
  const message = error?.message ?? "";

  if (name === "NotReadableError" || message.includes("could not be read")) {
    return "This PDF could not be read by the browser. Move it to a local folder like Downloads/Desktop, make sure it is fully downloaded, then reselect it.";
  }

  return "We could not read this PDF in the browser. Please choose the file again and retry.";
}

export function getHealth() {
  return apiGet("/api/health");
}

export async function buildResumeUploadPayload(file) {
  try {
    const fileDataBase64 = arrayBufferToBase64(await file.arrayBuffer());

    return {
      fileDataBase64,
      fileName: file.name,
      mimeType: file.type,
    };
  } catch (error) {
    throw new Error(getFileReadErrorMessage(error));
  }
}

export async function uploadResume(fileOrPayload) {
  const payload =
    fileOrPayload?.fileDataBase64
      ? fileOrPayload
      : await buildResumeUploadPayload(fileOrPayload);

  const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
}

export async function generateQuestions({ mode, role, resumeText }) {
  const response = await fetch(`${API_BASE_URL}/api/questions/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
      role,
      resumeText,
    }),
  });

  return parseApiResponse(response);
}

export async function evaluateAnswer({ answer, mode, question, resumeText, role }) {
  const response = await fetch(`${API_BASE_URL}/api/answers/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      answer,
      mode,
      question,
      resumeText,
      role,
    }),
  });

  return parseApiResponse(response);
}

export async function generateBrutalFollowUp({
  activeAgentId,
  answer,
  behaviorSnapshot,
  mode,
  pressureSnapshot,
  question,
  role,
}) {
  const response = await fetch(`${API_BASE_URL}/api/brutal/follow-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      activeAgentId,
      answer,
      behaviorSnapshot,
      mode,
      pressureSnapshot,
      question,
      role,
    }),
  });

  return parseApiResponse(response);
}
