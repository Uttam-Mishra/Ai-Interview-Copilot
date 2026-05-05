export const INTERVIEW_MODES = {
  BRUTAL: "brutal",
  NORMAL: "normal",
};

export const DEFAULT_INTERVIEW_MODE = INTERVIEW_MODES.NORMAL;

const MODE_METADATA = {
  [INTERVIEW_MODES.NORMAL]: {
    description: "Friendly, guided interview practice with the current coaching flow.",
    key: INTERVIEW_MODES.NORMAL,
    label: "Normal Mode",
    warning: "",
  },
  [INTERVIEW_MODES.BRUTAL]: {
    description: "High-pressure interview track with pressure, behavior, and multi-agent simulation.",
    key: INTERVIEW_MODES.BRUTAL,
    label: "Brutal Mode",
    warning: "This mode simulates high-pressure interviews. No retries allowed.",
  },
};

export function normalizeInterviewMode(value) {
  return value === INTERVIEW_MODES.BRUTAL
    ? INTERVIEW_MODES.BRUTAL
    : DEFAULT_INTERVIEW_MODE;
}

export function getInterviewModeMetadata(value) {
  const mode = normalizeInterviewMode(value);
  return MODE_METADATA[mode];
}

export function listInterviewModes() {
  return Object.values(MODE_METADATA);
}
