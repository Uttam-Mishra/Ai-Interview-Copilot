export const PANEL_INTERVIEWERS = [
  {
    accent: "emerald",
    id: "hr",
    name: "Maya",
    prompt: "Give me a direct example. What was your responsibility?",
    role: "HR",
  },
  {
    accent: "sky",
    id: "technical",
    name: "Arjun",
    prompt: "Walk me through the technical tradeoff. Why was this the right approach?",
    role: "Technical",
  },
  {
    accent: "rose",
    id: "strict",
    name: "Vikram",
    prompt: "That answer sounds rehearsed. Prove it with details.",
    role: "Strict",
  },
];

export function getActivePanelInterviewer({ analysis, lastInterruption }) {
  if (lastInterruption) {
    return PANEL_INTERVIEWERS[2];
  }

  if (analysis.wordCount > 120) {
    return PANEL_INTERVIEWERS[1];
  }

  if (analysis.confidenceScore <= 6) {
    return PANEL_INTERVIEWERS[0];
  }

  return PANEL_INTERVIEWERS[1];
}
