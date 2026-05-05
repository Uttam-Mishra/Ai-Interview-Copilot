export const BRUTAL_QUESTION_SECONDS = 90;

const INTERRUPTION_RULES = [
  {
    id: "specific",
    agentId: "strict",
    message: "Be more specific.",
    severity: "warning",
    shouldTrigger: ({ elapsedSeconds, wordCount }) => elapsedSeconds >= 18 && wordCount < 35,
  },
  {
    id: "convincing",
    agentId: "strict",
    message: "That is not convincing yet.",
    severity: "warning",
    shouldTrigger: ({ fillerCount, wordCount }) => fillerCount >= 3 || (wordCount >= 35 && wordCount < 70),
  },
  {
    id: "delay",
    agentId: "hr",
    message: "Explain clearly. You are taking too long to start.",
    severity: "critical",
    shouldTrigger: ({ responseDelaySeconds, wordCount }) =>
      responseDelaySeconds > 3 && wordCount === 0,
  },
  {
    id: "not-answering",
    agentId: "strict",
    message: "You are not answering the question.",
    severity: "critical",
    shouldTrigger: ({ clarityScore, elapsedSeconds, wordCount }) =>
      elapsedSeconds >= 25 && wordCount > 0 && clarityScore <= 5,
  },
  {
    id: "why",
    agentId: "technical",
    message: "Why? Go deeper.",
    severity: "warning",
    shouldTrigger: ({ elapsedSeconds, wordCount }) => elapsedSeconds >= 40 && wordCount >= 70,
  },
  {
    id: "concise",
    agentId: "strict",
    message: "You are drifting. Answer directly.",
    severity: "warning",
    shouldTrigger: ({ wordCount }) => wordCount > 180,
  },
];

export function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function getBrutalInterruption({ analysis, elapsedSeconds }) {
  return getDynamicInterruption({
    analysis,
    behaviorSnapshot: null,
    elapsedSeconds,
    pressureScore: 0,
  });
}

export function getDynamicInterruption({
  analysis,
  behaviorSnapshot,
  elapsedSeconds,
  pressureScore,
}) {
  for (const rule of INTERRUPTION_RULES) {
    if (
      rule.shouldTrigger({
        clarityScore: behaviorSnapshot?.clarityScore ?? 10,
        elapsedSeconds,
        fillerCount: analysis.fillerCount,
        responseDelaySeconds: behaviorSnapshot?.responseDelaySeconds ?? 0,
        wordCount: analysis.wordCount,
      })
    ) {
      return {
        agentId: rule.agentId,
        id: rule.id,
        message: rule.message,
        pressureScore,
        severity: rule.severity,
        triggeredAtSeconds: elapsedSeconds,
      };
    }
  }

  return null;
}

export function createPressureSnapshot({
  analysis,
  behaviorSnapshot,
  elapsedSeconds,
  timeRemaining,
}) {
  const events = [];
  const responseDelaySeconds = behaviorSnapshot?.responseDelaySeconds ?? 0;

  if (responseDelaySeconds > 3 && analysis.wordCount === 0) {
    events.push({
      id: "response-delay",
      label: "Response delay",
      weight: 22,
    });
  }

  if (analysis.wordCount > 0 && analysis.wordCount < 35) {
    events.push({
      id: "vague-answer",
      label: "Vague answer",
      weight: 18,
    });
  }

  if (analysis.wordCount > 180) {
    events.push({
      id: "overlong-answer",
      label: "Overlong answer",
      weight: 16,
    });
  }

  if ((behaviorSnapshot?.hesitationScore ?? 10) <= 6) {
    events.push({
      id: "low-confidence",
      label: "Low confidence",
      weight: 16,
    });
  }

  if ((behaviorSnapshot?.eyeContactScore ?? 10) <= 6) {
    events.push({
      id: "eye-contact-drop",
      label: "Eye contact drop",
      weight: 18,
    });
  }

  if (timeRemaining <= 15) {
    events.push({
      id: "timer-critical",
      label: "Timer critical",
      weight: 18,
    });
  }

  const pressureScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        elapsedSeconds * 0.25 +
          events.reduce((sum, event) => sum + event.weight, 0) -
          Math.max(0, (behaviorSnapshot?.compositeScore ?? 8) - 7) * 5,
      ),
    ),
  );
  const level =
    pressureScore >= 70 ? "critical" : pressureScore >= 42 ? "elevated" : "controlled";
  const strategy =
    level === "critical"
      ? "interrupt"
      : events.some((event) => event.id === "vague-answer")
        ? "redirect"
        : analysis.wordCount > 100 && (behaviorSnapshot?.depthScore ?? 10) >= 7
          ? "increase-difficulty"
          : "observe";

  return {
    events,
    level,
    pressureScore,
    strategy,
  };
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
