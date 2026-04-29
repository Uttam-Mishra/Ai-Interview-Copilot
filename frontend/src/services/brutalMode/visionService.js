function getFaceDetector() {
  if (typeof window === "undefined" || !("FaceDetector" in window)) {
    return null;
  }

  return new window.FaceDetector({
    fastMode: true,
    maxDetectedFaces: 1,
  });
}

export function isNativeFaceDetectionSupported() {
  return Boolean(getFaceDetector());
}

export async function analyzeVideoAttention(videoElement) {
  const detector = getFaceDetector();

  if (!detector || !videoElement?.videoWidth || !videoElement?.videoHeight) {
    return {
      faceDetected: null,
      gazeStatus: "unsupported",
      message: "Native face detection is not available in this browser.",
    };
  }

  const faces = await detector.detect(videoElement).catch(() => []);
  const face = faces[0];

  if (!face?.boundingBox) {
    return {
      faceDetected: false,
      gazeStatus: "away",
      message: "Face not detected. Stay centered.",
    };
  }

  const videoCenterX = videoElement.videoWidth / 2;
  const faceCenterX = face.boundingBox.x + face.boundingBox.width / 2;
  const horizontalOffset = Math.abs(faceCenterX - videoCenterX) / videoElement.videoWidth;

  if (horizontalOffset > 0.22) {
    return {
      faceDetected: true,
      gazeStatus: "away",
      message: "Maintain eye contact.",
    };
  }

  return {
    faceDetected: true,
    gazeStatus: "centered",
    message: "Eye contact looks stable.",
  };
}
