import { INTERVIEW_AGENTS, getAgentById, selectActiveAgent } from "./multiAgentSystem";

export const PANEL_INTERVIEWERS = INTERVIEW_AGENTS;

export function getActivePanelInterviewer({
  analysis,
  behaviorSnapshot,
  lastInterruption,
  pressureSnapshot,
}) {
  if (lastInterruption) {
    return getAgentById(lastInterruption.agentId ?? "strict");
  }

  return selectActiveAgent({
    behaviorSnapshot,
    pressureSnapshot,
    responseAnalysis: analysis,
  });
}
