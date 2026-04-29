import { INTERVIEW_MODES, normalizeInterviewMode } from "./mode.constants.js";
import { brutalEvaluationInstructions, brutalQuestionInstructions } from "./brutalMode/promptTemplates.js";
import { normalEvaluationInstructions, normalQuestionInstructions } from "./normalMode/promptTemplates.js";

export function getQuestionGenerationInstructions(mode) {
  const normalizedMode = normalizeInterviewMode(mode);

  return normalizedMode === INTERVIEW_MODES.BRUTAL
    ? brutalQuestionInstructions
    : normalQuestionInstructions;
}

export function getEvaluationInstructions(mode) {
  const normalizedMode = normalizeInterviewMode(mode);

  return normalizedMode === INTERVIEW_MODES.BRUTAL
    ? brutalEvaluationInstructions
    : normalEvaluationInstructions;
}
