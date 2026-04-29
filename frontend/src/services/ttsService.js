export function isTextToSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelSpeech() {
  if (!isTextToSpeechSupported()) {
    return;
  }

  window.speechSynthesis.cancel();
}

export function speakText(text, options = {}) {
  if (!isTextToSpeechSupported() || !text) {
    return false;
  }

  cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang ?? "en-US";
  utterance.pitch = options.pitch ?? 0.86;
  utterance.rate = options.rate ?? 0.94;
  utterance.volume = options.volume ?? 1;

  window.speechSynthesis.speak(utterance);
  return true;
}
