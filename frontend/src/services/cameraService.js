export function isCameraSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function startCameraStream() {
  if (!isCameraSupported()) {
    throw new Error("Camera access is not supported in this browser.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      height: {
        ideal: 720,
      },
      width: {
        ideal: 1280,
      },
    },
  });
}

export function stopCameraStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}
