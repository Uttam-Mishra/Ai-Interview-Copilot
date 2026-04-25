import { requestStructuredOutput } from "./openai.service.js";

const MAX_RESUME_CONTEXT_CHARS = 8000;

const evaluationResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: {
      type: "integer",
      minimum: 1,
      maximum: 10,
    },
    strengths: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "string",
      },
    },
    weaknesses: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "string",
      },
    },
  },
  required: ["score", "strengths", "weaknesses"],
};

function buildEvaluationInput({ role, resumeText, question, answer }) {
  const trimmedResume = resumeText.slice(0, MAX_RESUME_CONTEXT_CHARS);

  return [
    `Target role: ${role}`,
    "",
    `Interview question: ${question}`,
    "",
    "Candidate answer:",
    answer,
    "",
    "Resume context:",
    trimmedResume,
  ].join("\n");
}

export async function evaluateInterviewAnswer({ role, resumeText, question, answer }) {
  const { model, parsed } = await requestStructuredOutput({
    instructions:
      "You are an interview coach. Evaluate the candidate answer against the interview question, target role, and resume context. Score fairly on clarity, relevance, depth, and communication. Give concise, actionable strengths and weaknesses.",
    input: buildEvaluationInput({
      role,
      resumeText,
      question,
      answer,
    }),
    schema: evaluationResponseSchema,
    schemaName: "answer_evaluation",
  });

  if (
    typeof parsed?.score !== "number" ||
    !Array.isArray(parsed?.strengths) ||
    !Array.isArray(parsed?.weaknesses)
  ) {
    throw new Error("OpenAI returned an invalid evaluation payload.");
  }

  return {
    model,
    feedback: parsed,
  };
}
