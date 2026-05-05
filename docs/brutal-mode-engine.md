# Brutal Mode Real-Time Interview Engine

Brutal Mode is isolated from Normal Mode. Normal Mode keeps the existing resume, question, and answer evaluation flow. Brutal Mode adds a real-time simulation layer on the dedicated `/brutal-interview` route.

## Event Model

- `onUserResponse`: speech or typed transcript updates the response analysis snapshot.
- `onDelayDetected`: response delay over the threshold increases pressure and can trigger an HR or Strict interruption.
- `onLowConfidence`: filler words, long pauses, and weak eye contact lower behavior scores.
- `onWeakAnswer`: vague, overlong, or low-depth answers trigger adaptive follow-ups.

## Frontend Services

- `pressureEngine`: timer tone, interruption rules, pressure score, and pressure strategy.
- `behaviorAnalysis`: clarity, depth, relevance, hesitation, eye contact, and composite behavior score.
- `multiAgentSystem`: HR, Technical, and Strict interviewer personas, active speaker selection, and rule-based follow-ups.
- `evaluationService`: final No Mercy Report generation from behavior and pressure snapshots.
- `voiceService` and `ttsService`: browser speech-to-text and text-to-speech loop.

## Backend Services

- `/api/brutal/follow-up`: Brutal-only LLM endpoint for adaptive follow-up generation.
- `brutalMode/followup.service.js`: validates the mode, sends live pressure and behavior snapshots to the LLM, and returns a structured follow-up payload.

## Scoring Model

The composite behavior score is calculated from:

```text
score = f(
  eye_contact_score,
  hesitation_score,
  clarity_score,
  depth_score,
  relevance_score
)
```

Pressure score is tracked separately from behavior quality. High pressure does not automatically mean a poor answer; it means the system should become more aggressive, switch active agents, or interrupt.
