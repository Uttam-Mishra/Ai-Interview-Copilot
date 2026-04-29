import { useEffect, useMemo, useRef, useState } from "react";
import { startCameraStream, stopCameraStream } from "../services/cameraService";
import {
  analyzeVideoAttention,
  isNativeFaceDetectionSupported,
} from "../services/brutalMode/visionService";
import {
  PANEL_INTERVIEWERS,
  getActivePanelInterviewer,
} from "../services/brutalMode/panelInterviewers";

export function useVirtualInterviewRoom({ analysis, enabled, lastInterruption }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [attentionMessage, setAttentionMessage] = useState("Camera is off.");
  const [cameraError, setCameraError] = useState("");
  const [eyeContactScore, setEyeContactScore] = useState(10);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lookAwayEvents, setLookAwayEvents] = useState(0);
  const faceDetectionSupported = isNativeFaceDetectionSupported();
  const activeInterviewer = useMemo(
    () => getActivePanelInterviewer({ analysis, lastInterruption }),
    [analysis, lastInterruption],
  );

  useEffect(() => {
    if (!enabled) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      setIsCameraActive(false);
      return;
    }

    return () => {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!isCameraActive || !enabled) {
      return undefined;
    }

    const monitorId = window.setInterval(async () => {
      const result = await analyzeVideoAttention(videoRef.current);

      setAttentionMessage(result.message);

      if (result.gazeStatus === "away") {
        setLookAwayEvents((currentValue) => currentValue + 1);
        setEyeContactScore((currentValue) => Math.max(1, currentValue - 1));
      }

      if (result.gazeStatus === "centered") {
        setEyeContactScore((currentValue) => Math.min(10, currentValue + 0.25));
      }
    }, 1800);

    return () => window.clearInterval(monitorId);
  }, [enabled, isCameraActive]);

  async function startCamera() {
    setCameraError("");

    try {
      const stream = await startCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setAttentionMessage(
        faceDetectionSupported
          ? "Camera active. Keep your face centered."
          : "Camera active. Native gaze detection is unavailable in this browser.",
      );
      setIsCameraActive(true);
    } catch (error) {
      setCameraError(error.message);
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    stopCameraStream(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setAttentionMessage("Camera is off.");
    setIsCameraActive(false);
  }

  return {
    activeInterviewer,
    attentionMessage,
    cameraError,
    eyeContactScore,
    faceDetectionSupported,
    interviewers: PANEL_INTERVIEWERS,
    isCameraActive,
    lookAwayEvents,
    startCamera,
    stopCamera,
    videoRef,
  };
}
