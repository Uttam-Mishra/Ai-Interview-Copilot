import { normalizeInterviewMode } from "./interviewModes/mode.constants.js";
import { getQuestionGenerationInstructions } from "./interviewModes/promptTemplates.js";
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

export async function generateInterviewQuestions({ mode, role, resumeText }) {
  const interviewMode = normalizeInterviewMode(mode);
  const { model, parsed } = await requestStructuredOutput({
    instructions: getQuestionGenerationInstructions(interviewMode),
    input: `Target role: ${role}\n\nResume text:\n${resumeText}`,
    schema: questionResponseSchema,
    schemaName: "interview_questions",
  });

  if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
    throw new Error("AI provider returned an invalid question payload.");
  }

  return {
    model,
    mode: interviewMode,
    questions: parsed.questions,
  };
}
