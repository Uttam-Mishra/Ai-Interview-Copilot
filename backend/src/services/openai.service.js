function getOpenAIBaseUrl() {
  return (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
}

function getOpenAIApiUrl() {
  return `${getOpenAIBaseUrl()}/chat/completions`;
}

function getDefaultModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function extractMessageContent(responsePayload) {
  const content = responsePayload?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textParts = [];

  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      textParts.push(item.text);
    }
  }

  return textParts.join("\n").trim();
}

export function getOpenAIModel() {
  return getDefaultModel();
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

  const schemaGuide = JSON.stringify(schema, null, 2);
  const model = getDefaultModel();

  const response = await fetch(getOpenAIApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            instructions,
            "",
            `Return only valid JSON for the schema named "${schemaName}".`,
            "Do not include markdown fences or extra commentary.",
            "Required JSON schema:",
            schemaGuide,
          ].join("\n"),
        },
        {
          role: "user",
          content: input,
        },
      ],
      response_format: {
        type: "json_object",
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError =
      payload?.error?.message ||
      payload?.error ||
      "AI provider request failed.";

    throw new Error(apiError);
  }

  const outputText = extractMessageContent(payload);

  if (!outputText) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    model: payload?.model ?? model,
    parsed: JSON.parse(outputText),
  };
}
