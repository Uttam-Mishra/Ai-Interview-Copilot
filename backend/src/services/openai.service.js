const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function extractOutputText(responsePayload) {
  if (typeof responsePayload?.output_text === "string" && responsePayload.output_text) {
    return responsePayload.output_text;
  }

  const textParts = [];

  for (const item of responsePayload?.output ?? []) {
    if (item?.type !== "message") {
      continue;
    }

    for (const content of item.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

export function getOpenAIModel() {
  return DEFAULT_MODEL;
}

export async function requestStructuredOutput({
  input,
  instructions,
  schema,
  schemaName,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Add it to backend/.env before using AI features.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError =
      payload?.error?.message ||
      payload?.error ||
      "OpenAI request failed.";

    throw new Error(apiError);
  }

  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI returned an empty response.");
  }

  return {
    model: payload?.model ?? DEFAULT_MODEL,
    parsed: JSON.parse(outputText),
  };
}
