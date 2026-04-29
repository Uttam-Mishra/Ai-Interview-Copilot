const FILLER_WORD_PATTERN = /\b(um+|uh+|umm+|hmm+|like|basically|actually|you know|sort of|kind of)\b/gi;

export function analyzeBrutalResponse({
  answer,
  elapsedSeconds,
  firstSpeechDelaySeconds,
  isTimeExpired,
}) {
  const trimmedAnswer = answer.trim();
  const words = trimmedAnswer ? trimmedAnswer.split(/\s+/).filter(Boolean) : [];
  const fillerMatches = trimmedAnswer.match(FILLER_WORD_PATTERN) ?? [];
  const wordCount = words.length;
  const fillerCount = fillerMatches.length;

  const flags = [];

  if (firstSpeechDelaySeconds >= 6) {
    flags.push("You hesitated before answering.");
  }

  if (fillerCount >= 3) {
    flags.push("Too many filler words.");
  }

  if (wordCount > 0 && wordCount < 35) {
    flags.push("Too short to prove depth.");
  }

  if (wordCount > 180) {
    flags.push("Over-explaining. Tighten the answer.");
  }

  if (isTimeExpired && wordCount < 80) {
    flags.push("Time ran out before a complete answer.");
  }

  const confidenceScore = Math.max(
    1,
    Math.min(
      10,
      10 -
        Math.min(4, fillerCount) -
        (firstSpeechDelaySeconds >= 6 ? 2 : 0) -
        (wordCount > 0 && wordCount < 35 ? 2 : 0) -
        (wordCount > 180 ? 1 : 0) -
        (elapsedSeconds > 70 && wordCount < 80 ? 1 : 0),
    ),
  );

  return {
    confidenceScore,
    fillerCount,
    flags,
    firstSpeechDelaySeconds,
    wordCount,
  };
}
