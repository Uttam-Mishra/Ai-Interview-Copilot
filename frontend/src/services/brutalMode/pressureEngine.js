export const BRUTAL_QUESTION_SECONDS = 90;

const INTERRUPTION_RULES = [
  {
    id: "specific",
    message: "Be more specific.",
    shouldTrigger: ({ elapsedSeconds, wordCount }) => elapsedSeconds >= 18 && wordCount < 35,
  },
  {
    id: "convincing",
    message: "That is not convincing yet.",
    shouldTrigger: ({ fillerCount, wordCount }) => fillerCount >= 3 || (wordCount >= 35 && wordCount < 70),
  },
  {
    id: "why",
    message: "Why? Go deeper.",
    shouldTrigger: ({ elapsedSeconds, wordCount }) => elapsedSeconds >= 40 && wordCount >= 70,
  },
  {
    id: "concise",
    message: "You are drifting. Answer directly.",
    shouldTrigger: ({ wordCount }) => wordCount > 180,
  },
];

export function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function getBrutalInterruption({ analysis, elapsedSeconds }) {
  for (const rule of INTERRUPTION_RULES) {
    if (
      rule.shouldTrigger({
        elapsedSeconds,
        fillerCount: analysis.fillerCount,
        wordCount: analysis.wordCount,
      })
    ) {
      return rule;
    }
  }

  return null;
}

export function getTimerTone(timeRemaining) {
  if (timeRemaining <= 15) {
    return "danger";
  }

  if (timeRemaining <= 35) {
    return "warning";
  }

  return "steady";
}
