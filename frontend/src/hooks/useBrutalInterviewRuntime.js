import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeBrutalResponse } from "../services/brutalMode/analysisService";
import { createBehaviorSnapshot } from "../services/brutalMode/behaviorAnalysis";
import { createAgentTurn, selectActiveAgent } from "../services/brutalMode/multiAgentSystem";
import {
  BRUTAL_QUESTION_SECONDS,
  createPressureSnapshot,
  getDynamicInterruption,
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
  role,
  visualMetrics = {},
}) {
  const [firstSpeechDelaySeconds, setFirstSpeechDelaySeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [lastInterruption, setLastInterruption] = useState(null);
  const [pauseEvents, setPauseEvents] = useState([]);
  const [responseDelaySeconds, setResponseDelaySeconds] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(BRUTAL_QUESTION_SECONDS);
  const [voiceError, setVoiceError] = useState("");
  const questionStartedAtRef = useRef(Date.now());
  const lastAnswerChangedAtRef = useRef(Date.now());
  const lastTranscriptAtRef = useRef(null);
  const previousWordCountRef = useRef(0);
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
    lastAnswerChangedAtRef.current = Date.now();
    lastTranscriptAtRef.current = null;
    previousWordCountRef.current = 0;
    triggeredInterruptionsRef.current = new Set();
    setFirstSpeechDelaySeconds(0);
    setInterimTranscript("");
    setLastInterruption(null);
    setPauseEvents([]);
    setResponseDelaySeconds(0);
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
  const behaviorSnapshot = useMemo(
    () =>
      createBehaviorSnapshot({
        answer,
        currentQuestion: selectedQuestion,
        eyeContactScore: visualMetrics.eyeContactScore ?? 10,
        firstSpeechDelaySeconds,
        lookAwayEvents: visualMetrics.lookAwayEvents ?? 0,
        pauseEvents,
        responseAnalysis: analysis,
        responseDelaySeconds,
      }),
    [
      analysis,
      answer,
      firstSpeechDelaySeconds,
      pauseEvents,
      responseDelaySeconds,
      selectedQuestion,
      visualMetrics.eyeContactScore,
      visualMetrics.lookAwayEvents,
    ],
  );
  const pressureSnapshot = useMemo(
    () =>
      createPressureSnapshot({
        analysis,
        behaviorSnapshot,
        elapsedSeconds,
        timeRemaining,
      }),
    [analysis, behaviorSnapshot, elapsedSeconds, timeRemaining],
  );
  const activeAgent = useMemo(
    () =>
      selectActiveAgent({
        behaviorSnapshot,
        pressureSnapshot,
        responseAnalysis: analysis,
      }),
    [analysis, behaviorSnapshot, pressureSnapshot],
  );
  const agentTurn = useMemo(
    () =>
      createAgentTurn({
        activeAgent,
        behaviorSnapshot,
        pressureSnapshot,
        question: selectedQuestion,
        role,
      }),
    [activeAgent, behaviorSnapshot, pressureSnapshot, role, selectedQuestion],
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const delayTimerId = window.setInterval(() => {
      setResponseDelaySeconds(
        Math.round((Date.now() - questionStartedAtRef.current) / 1000),
      );
    }, 1000);

    return () => window.clearInterval(delayTimerId);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const nextWordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

    if (nextWordCount > previousWordCountRef.current && firstSpeechDelaySeconds === 0) {
      setFirstSpeechDelaySeconds(
        Math.round((Date.now() - questionStartedAtRef.current) / 1000),
      );
    }

    if (nextWordCount > previousWordCountRef.current) {
      lastAnswerChangedAtRef.current = Date.now();
      setResponseDelaySeconds(
        Math.round((Date.now() - questionStartedAtRef.current) / 1000),
      );
    }

    previousWordCountRef.current = nextWordCount;
  }, [answer, enabled, firstSpeechDelaySeconds]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interruption = getDynamicInterruption({
      analysis,
      behaviorSnapshot,
      elapsedSeconds,
      pressureScore: pressureSnapshot.pressureScore,
    });

    if (!interruption || triggeredInterruptionsRef.current.has(interruption.id)) {
      return;
    }

    triggeredInterruptionsRef.current.add(interruption.id);
    setLastInterruption(interruption);
  }, [analysis, behaviorSnapshot, elapsedSeconds, enabled, pressureSnapshot.pressureScore]);

  function appendTranscript(transcript) {
    if (!transcript) {
      return;
    }

    if (firstSpeechDelaySeconds === 0) {
      setFirstSpeechDelaySeconds(
        Math.round((Date.now() - questionStartedAtRef.current) / 1000),
      );
    }

    if (lastTranscriptAtRef.current) {
      const pauseSeconds = Math.round((Date.now() - lastTranscriptAtRef.current) / 1000);

      if (pauseSeconds >= 3) {
        setPauseEvents((currentEvents) => [
          ...currentEvents.slice(-4),
          {
            seconds: pauseSeconds,
            timestamp: Date.now(),
          },
        ]);
      }
    }

    lastTranscriptAtRef.current = Date.now();

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
    activeAgent,
    analysis,
    agentTurn,
    behaviorSnapshot,
    elapsedSeconds,
    firstSpeechDelaySeconds,
    interimTranscript,
    isListening,
    lastInterruption,
    pauseEvents,
    pressureSnapshot,
    startListening,
    stopListening,
    timeRemaining,
    voiceError,
    voiceSupported,
  };
}
