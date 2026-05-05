export const INTERVIEW_AGENTS = [
  {
    accent: "emerald",
    agenda: "Validate ownership, communication, and motivation.",
    id: "hr",
    name: "Maya",
    personality:
      "Calm but direct HR interviewer. She challenges vague behavioral stories and asks for responsibility.",
    prompt: "Give me a direct example. What was your responsibility?",
    role: "HR",
    systemPrompt:
      "You are Maya, the HR interviewer. Probe ownership, communication, teamwork, conflict, and motivation. Ask short behavioral follow-ups.",
  },
  {
    accent: "sky",
    agenda: "Probe architecture, tradeoffs, debugging, and technical depth.",
    id: "technical",
    name: "Arjun",
    personality:
      "Senior technical interviewer. He cross-examines implementation choices and asks for tradeoffs.",
    prompt: "Walk me through the technical tradeoff. Why was this the right approach?",
    role: "Technical",
    systemPrompt:
      "You are Arjun, the technical interviewer. Probe system design, code quality, performance, edge cases, and tradeoffs.",
  },
  {
    accent: "rose",
    agenda: "Stress-test weak logic, shallow claims, and unconvincing answers.",
    id: "strict",
    name: "Vikram",
    personality:
      "Strict final-round interviewer. He interrupts weak answers and demands precise evidence.",
    prompt: "That answer sounds rehearsed. Prove it with details.",
    role: "Strict",
    systemPrompt:
      "You are Vikram, the strict interviewer. Challenge vague claims, demand evidence, and interrupt when the answer is weak.",
  },
];

export function getAgentById(agentId) {
  return INTERVIEW_AGENTS.find((agent) => agent.id === agentId) ?? INTERVIEW_AGENTS[1];
}

export function selectActiveAgent({ behaviorSnapshot, pressureSnapshot, responseAnalysis }) {
  if (pressureSnapshot?.level === "critical") {
    return getAgentById("strict");
  }

  if (behaviorSnapshot?.depthScore <= 6 || responseAnalysis.wordCount > 120) {
    return getAgentById("technical");
  }

  if (behaviorSnapshot?.hesitationScore <= 6 || responseAnalysis.confidenceScore <= 6) {
    return getAgentById("hr");
  }

  return getAgentById("technical");
}

export function createAgentTurn({
  activeAgent,
  behaviorSnapshot,
  pressureSnapshot,
  question,
  role,
}) {
  const followUpQuestion = createRuleBasedFollowUp({
    activeAgent,
    behaviorSnapshot,
    pressureSnapshot,
    question,
    role,
  });

  return {
    activeAgent,
    followUpQuestion,
    pressureLevel: pressureSnapshot.level,
    turnType: pressureSnapshot.level === "critical" ? "interrupt" : "follow-up",
  };
}

export function createRuleBasedFollowUp({
  activeAgent,
  behaviorSnapshot,
  pressureSnapshot,
  question,
  role,
}) {
  if (activeAgent.id === "strict") {
    if (pressureSnapshot.events.some((event) => event.id === "vague-answer")) {
      return "You are not answering the question. Give one specific example now.";
    }

    if (pressureSnapshot.events.some((event) => event.id === "overlong-answer")) {
      return "Stop drifting. Summarize the decision, tradeoff, and result in three sentences.";
    }

    return "Why should I believe this answer is not rehearsed?";
  }

  if (activeAgent.id === "technical") {
    if (behaviorSnapshot.depthScore <= 6) {
      return "What was the hardest technical tradeoff, and what alternative did you reject?";
    }

    return `For a ${role || "target"} role, explain the architecture or implementation detail behind this answer.`;
  }

  if (behaviorSnapshot.hesitationScore <= 6) {
    return "Pause less. Start again with the situation and your exact responsibility.";
  }

  return `Tie this answer back to the original question: ${question}`;
}

export function buildAgentPromptTemplates() {
  return INTERVIEW_AGENTS.map((agent) => ({
    id: agent.id,
    role: agent.role,
    systemPrompt: agent.systemPrompt,
  }));
}
