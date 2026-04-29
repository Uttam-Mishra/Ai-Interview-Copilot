export const APP_STATE_STORAGE_KEY = "ai-interview-copilot-state";

export function readStoredAppState() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    return storedState ? JSON.parse(storedState) : {};
  } catch {
    return {};
  }
}

export function writeStoredAppState(state) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
}
