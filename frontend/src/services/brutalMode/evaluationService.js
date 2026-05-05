import { getMissedOpportunityLabels } from "./behaviorAnalysis";

function clampScore(value) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function createCompositeInterviewScore({ behaviorSnapshot, pressureSnapshot }) {
  const pressurePenalty =
    pressureSnapshot.level === "critical" ? 2 : pressureSnapshot.level === "elevated" ? 1 : 0;

  return clampScore(behaviorSnapshot.compositeScore - pressurePenalty);
}

export function generateNoMercyReport({
  answer,
  behaviorSnapshot,
  pressureSnapshot,
  responseAnalysis,
  role,
}) {
  const finalScore = createCompositeInterviewScore({
    behaviorSnapshot,
    pressureSnapshot,
  });
  const criticalMistakes = [];

  if (!answer.trim()) {
    criticalMistakes.push("No answer was captured, so there is no evidence to evaluate.");
  }

  if (responseAnalysis.wordCount > 0 && responseAnalysis.wordCount < 35) {
    criticalMistakes.push("Answer was too short to prove ownership or depth.");
  }

  if (responseAnalysis.wordCount > 180) {
    criticalMistakes.push("Answer was too long and lost decision-making clarity.");
  }

  if (behaviorSnapshot.hesitationScore <= 6) {
    criticalMistakes.push("Hesitation and filler words weakened confidence.");
  }

  if (behaviorSnapshot.eyeContactScore <= 6) {
    criticalMistakes.push("Eye contact broke too often for a high-pressure interview.");
  }

  if (criticalMistakes.length === 0) {
    criticalMistakes.push("Answer was stable, but it still needs sharper proof and impact.");
  }

  return {
    criticalMistakes,
    finalScore,
    improvements: [
      "Answer in STAR: situation, task, action, result.",
      "Add one concrete metric or measurable outcome.",
      "Name the tradeoff and explain why your choice was better.",
      "Start within three seconds and remove filler words.",
    ],
    missedOpportunities: getMissedOpportunityLabels(behaviorSnapshot),
    rejectionReason:
      finalScore <= 5
        ? `For a ${role || "target"} role, this answer would likely fail because it lacks proof, structure, and confidence.`
        : `For a ${role || "target"} role, this answer is close but still needs stronger evidence and sharper delivery.`,
    scoreBreakdown: {
      clarity: behaviorSnapshot.clarityScore,
      composite: behaviorSnapshot.compositeScore,
      depth: behaviorSnapshot.depthScore,
      eyeContact: behaviorSnapshot.eyeContactScore,
      hesitation: behaviorSnapshot.hesitationScore,
      pressure: pressureSnapshot.pressureScore,
      relevance: behaviorSnapshot.relevanceScore,
    },
  };
}
