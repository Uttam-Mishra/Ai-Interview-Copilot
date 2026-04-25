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

export function getHealth() {
  return apiGet("/api/health");
}

export async function uploadResume(file) {
  const fileDataBase64 = arrayBufferToBase64(await file.arrayBuffer());

  const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileDataBase64,
      fileName: file.name,
      mimeType: file.type,
    }),
  });

  return parseApiResponse(response);
}

export async function generateQuestions({ role, resumeText }) {
  const response = await fetch(`${API_BASE_URL}/api/questions/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role,
      resumeText,
    }),
  });

  return parseApiResponse(response);
}

export async function evaluateAnswer({ role, resumeText, question, answer }) {
  const response = await fetch(`${API_BASE_URL}/api/answers/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role,
      resumeText,
      question,
      answer,
    }),
  });

  return parseApiResponse(response);
}
