export const INTERVIEW_MODES = {
  BRUTAL: "brutal",
  NORMAL: "normal",
};

export const DEFAULT_INTERVIEW_MODE = INTERVIEW_MODES.NORMAL;

export const INTERVIEW_MODE_OPTIONS = [
  {
    description: "Keeps the current friendly interview workflow unchanged.",
    key: INTERVIEW_MODES.NORMAL,
    label: "Normal Mode",
    shortLabel: "Normal",
  },
  {
    description: "Arms the high-pressure track for stricter prompts and upcoming pressure mechanics.",
    key: INTERVIEW_MODES.BRUTAL,
    label: "Brutal Mode",
    shortLabel: "Brutal Mode 🔥",
    warning: "This mode simulates high-pressure interviews. No retries allowed.",
  },
];

export function normalizeInterviewMode(value) {
  return value === INTERVIEW_MODES.BRUTAL
    ? INTERVIEW_MODES.BRUTAL
    : DEFAULT_INTERVIEW_MODE;
}

export function getInterviewModeOption(value) {
  const normalizedMode = normalizeInterviewMode(value);
  return (
    INTERVIEW_MODE_OPTIONS.find((option) => option.key === normalizedMode) ??
    INTERVIEW_MODE_OPTIONS[0]
  );
}

export function isBrutalMode(value) {
  return normalizeInterviewMode(value) === INTERVIEW_MODES.BRUTAL;
}
