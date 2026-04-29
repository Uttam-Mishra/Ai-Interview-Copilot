import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeBrutalResponse } from "../services/brutalMode/analysisService";
import {
  BRUTAL_QUESTION_SECONDS,
  getBrutalInterruption,
} from "../services/brutalMode/pressureEngine";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
} from "../services/voiceService";

export function useBrutalInterviewRuntime({
  answer,
  enabled,
  onTranscript,
  selectedQuestion,
}) {
  const [firstSpeechDelaySeconds, setFirstSpeechDelaySeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastInterruption, setLastInterruption] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(BRUTAL_QUESTION_SECONDS);
  const [voiceError, setVoiceError] = useState("");
  const questionStartedAtRef = useRef(Date.now());
  const recognitionRef = useRef(null);
  const triggeredInterruptionsRef = useRef(new Set());
  const voiceSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!enabled) {
      setIsListening(false);
      setTimeRemaining(BRUTAL_QUESTION_SECONDS);
      setLastInterruption(null);
      setVoiceError("");
      return;
    }

    questionStartedAtRef.current = Date.now();
    triggeredInterruptionsRef.current = new Set();
    setFirstSpeechDelaySeconds(0);
    setInterimTranscript("");
    setLastInterruption(null);
    setTimeRemaining(BRUTAL_QUESTION_SECONDS);
    setVoiceError("");
  }, [enabled, selectedQuestion]);

  useEffect(() => {
    if (!enabled || !selectedQuestion || timeRemaining <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setTimeRemaining((currentValue) => Math.max(0, currentValue - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [enabled, selectedQuestion, timeRemaining]);

  useEffect(() => {
    if (!enabled || timeRemaining > 0 || !recognitionRef.current) {
      return;
    }

    recognitionRef.current.stop();
  }, [enabled, timeRemaining]);

  const elapsedSeconds = BRUTAL_QUESTION_SECONDS - timeRemaining;
  const analysis = useMemo(
    () =>
      analyzeBrutalResponse({
        answer,
        elapsedSeconds,
        firstSpeechDelaySeconds,
        isTimeExpired: timeRemaining === 0,
      }),
    [answer, elapsedSeconds, firstSpeechDelaySeconds, timeRemaining],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interruption = getBrutalInterruption({
      analysis,
      elapsedSeconds,
    });

    if (!interruption || triggeredInterruptionsRef.current.has(interruption.id)) {
      return;
    }

    triggeredInterruptionsRef.current.add(interruption.id);
    setLastInterruption(interruption);
  }, [analysis, elapsedSeconds, enabled]);

  function appendTranscript(transcript) {
    if (!transcript) {
      return;
    }

    if (firstSpeechDelaySeconds === 0) {
      setFirstSpeechDelaySeconds(
        Math.round((Date.now() - questionStartedAtRef.current) / 1000),
      );
    }

    onTranscript?.(transcript);
  }

  function startListening() {
    if (!enabled || !voiceSupported || timeRemaining === 0) {
      return;
    }

    setVoiceError("");

    const recognition = createSpeechRecognition({
      onEnd: () => {
        setIsListening(false);
      },
      onError: (error) => {
        setVoiceError(String(error));
        setIsListening(false);
      },
      onResult: ({ finalTranscript, interimTranscript: nextInterim }) => {
        setInterimTranscript(nextInterim);
        appendTranscript(finalTranscript);
      },
    });

    if (!recognition) {
      setVoiceError("Speech recognition is not supported in this browser.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return {
    analysis,
    elapsedSeconds,
    firstSpeechDelaySeconds,
    interimTranscript,
    isListening,
    lastInterruption,
    startListening,
    stopListening,
    timeRemaining,
    voiceError,
    voiceSupported,
  };
}
