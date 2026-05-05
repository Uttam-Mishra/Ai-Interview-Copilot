const ACTION_WORDS = [
  "built",
  "designed",
  "implemented",
  "improved",
  "reduced",
  "increased",
  "debugged",
  "optimized",
  "led",
  "owned",
  "measured",
  "launched",
];

const RESULT_WORDS = [
  "%",
  "users",
  "latency",
  "revenue",
  "conversion",
  "performance",
  "impact",
  "result",
  "reduced",
  "increased",
  "saved",
];

function clampScore(value) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function countMatches(text, dictionary) {
  const normalizedText = text.toLowerCase();

  return dictionary.reduce(
    (count, token) => count + (normalizedText.includes(token) ? 1 : 0),
    0,
  );
}

function getKeywordOverlapScore({ answer, question }) {
  const questionKeywords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);

  if (questionKeywords.length === 0 || !answer.trim()) {
    return 5;
  }

  const answerText = answer.toLowerCase();
  const matchedKeywords = questionKeywords.filter((keyword) => answerText.includes(keyword));
  const overlapRatio = matchedKeywords.length / questionKeywords.length;

  return clampScore(4 + overlapRatio * 8);
}

export function createBehaviorSnapshot({
  answer,
  currentQuestion,
  eyeContactScore,
  firstSpeechDelaySeconds,
  lookAwayEvents,
  pauseEvents,
  responseAnalysis,
  responseDelaySeconds,
}) {
  const trimmedAnswer = answer.trim();
  const wordCount = responseAnalysis.wordCount;
  const actionSignalCount = countMatches(trimmedAnswer, ACTION_WORDS);
  const resultSignalCount = countMatches(trimmedAnswer, RESULT_WORDS);
  const hasStructuredFlow =
    /\b(situation|task|action|result|first|then|finally|because)\b/i.test(trimmedAnswer);

  const hesitationPenalty =
    Math.min(4, responseAnalysis.fillerCount) +
    (firstSpeechDelaySeconds > 3 ? 2 : 0) +
    Math.min(3, pauseEvents.length);
  const hesitationScore = clampScore(10 - hesitationPenalty);
  const clarityScore = clampScore(
    9 -
      (wordCount > 0 && wordCount < 35 ? 3 : 0) -
      (wordCount > 180 ? 2 : 0) -
      Math.min(3, responseAnalysis.fillerCount) +
      (hasStructuredFlow ? 1 : 0),
  );
  const depthScore = clampScore(
    4 +
      Math.min(3, actionSignalCount) +
      Math.min(3, resultSignalCount) +
      (wordCount >= 70 && wordCount <= 170 ? 1 : 0),
  );
  const relevanceScore = getKeywordOverlapScore({
    answer: trimmedAnswer,
    question: currentQuestion,
  });
  const normalizedEyeContactScore = clampScore(eyeContactScore - Math.min(4, lookAwayEvents));
  const compositeScore = clampScore(
    normalizedEyeContactScore * 0.25 +
      hesitationScore * 0.2 +
      clarityScore * 0.25 +
      depthScore * 0.2 +
      relevanceScore * 0.1,
  );

  const signals = [];

  if (responseDelaySeconds > 3 && wordCount === 0) {
    signals.push({
      id: "response-delay",
      message: "Delayed response detected.",
      severity: "warning",
    });
  }

  if (lookAwayEvents >= 2) {
    signals.push({
      id: "eye-contact",
      message: "Not maintaining eye contact.",
      severity: "critical",
    });
  }

  if (hesitationScore <= 6) {
    signals.push({
      id: "hesitation",
      message: "Low confidence signal.",
      severity: "warning",
    });
  }

  if (clarityScore <= 6) {
    signals.push({
      id: "clarity",
      message: "Answer needs clearer structure.",
      severity: "warning",
    });
  }

  if (depthScore <= 6 && wordCount > 0) {
    signals.push({
      id: "depth",
      message: "Missing proof of depth.",
      severity: "warning",
    });
  }

  return {
    clarityScore,
    compositeScore,
    depthScore,
    eyeContactScore: normalizedEyeContactScore,
    hesitationScore,
    pauseEvents,
    relevanceScore,
    responseDelaySeconds,
    signals,
  };
}

export function getMissedOpportunityLabels(behaviorSnapshot) {
  const missedOpportunities = [];

  if (behaviorSnapshot.depthScore <= 6) {
    missedOpportunities.push("Add measurable impact.");
  }

  if (behaviorSnapshot.clarityScore <= 6) {
    missedOpportunities.push("Use a tighter STAR structure.");
  }

  if (behaviorSnapshot.relevanceScore <= 6) {
    missedOpportunities.push("Tie the answer back to the exact question.");
  }

  if (behaviorSnapshot.hesitationScore <= 6) {
    missedOpportunities.push("Start faster and remove filler words.");
  }

  return missedOpportunities.length > 0
    ? missedOpportunities
    : ["Answer was stable; push harder on ownership and tradeoffs."];
}
