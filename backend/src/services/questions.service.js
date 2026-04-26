import { requestStructuredOutput } from "./openai.service.js";

const questionResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: {
            type: "string",
          },
          focus: {
            type: "string",
          },
        },
        required: ["question", "focus"],
      },
    },
  },
  required: ["questions"],
};

export async function generateInterviewQuestions({ role, resumeText }) {
  const { model, parsed } = await requestStructuredOutput({
    instructions:
      "You are an interview coach. Generate practical interview questions tailored to the candidate's target role and resume. Avoid generic filler. Keep each focus label short and specific.",
    input: `Target role: ${role}\n\nResume text:\n${resumeText}`,
    schema: questionResponseSchema,
    schemaName: "interview_questions",
  });

  if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
    throw new Error("AI provider returned an invalid question payload.");
  }

  return {
    model,
    questions: parsed.questions,
  };
}
