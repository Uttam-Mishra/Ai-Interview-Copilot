import { INTERVIEW_MODES, normalizeInterviewMode } from "../interviewModes/mode.constants.js";
import { requestStructuredOutput } from "../openai.service.js";

const followUpSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    agentId: {
      type: "string",
      enum: ["hr", "technical", "strict"],
    },
    followUpQuestion: {
      type: "string",
    },
    interruption: {
      type: "string",
    },
    reason: {
      type: "string",
    },
  },
  required: ["agentId", "followUpQuestion", "interruption", "reason"],
};

function buildFollowUpInput({
  activeAgentId,
  answer,
  behaviorSnapshot,
  pressureSnapshot,
  question,
  role,
}) {
  return [
    `Target role: ${role}`,
    `Original question: ${question}`,
    `Active interviewer: ${activeAgentId}`,
    "",
    "Candidate answer so far:",
    answer || "(no answer yet)",
    "",
    "Live pressure snapshot:",
    JSON.stringify(pressureSnapshot, null, 2),
    "",
    "Live behavior snapshot:",
    JSON.stringify(behaviorSnapshot, null, 2),
  ].join("\n");
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
  const interviewMode = normalizeInterviewMode(mode);

  if (interviewMode !== INTERVIEW_MODES.BRUTAL) {
    throw new Error("Follow-up generation is only available in Brutal Mode.");
  }

  const { model, parsed } = await requestStructuredOutput({
    instructions: [
      "You are the orchestration brain for a high-pressure multi-agent interview simulator.",
      "Generate exactly one short follow-up question and one short interruption line.",
      "Use the active interviewer persona:",
      "- hr: behavioral ownership, communication, motivation",
      "- technical: architecture, tradeoffs, debugging, edge cases",
      "- strict: aggressive challenge, weak logic, missing proof",
      "Increase difficulty when the answer is strong. Redirect when the answer is vague. Be concise.",
    ].join("\n"),
    input: buildFollowUpInput({
      activeAgentId,
      answer,
      behaviorSnapshot,
      pressureSnapshot,
      question,
      role,
    }),
    schema: followUpSchema,
    schemaName: "brutal_follow_up",
  });

  if (
    typeof parsed?.agentId !== "string" ||
    typeof parsed?.followUpQuestion !== "string" ||
    typeof parsed?.interruption !== "string" ||
    typeof parsed?.reason !== "string"
  ) {
    throw new Error("AI provider returned an invalid follow-up payload.");
  }

  return {
    followUp: parsed,
    mode: interviewMode,
    model,
  };
}
