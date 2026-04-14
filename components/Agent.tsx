"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CameraOff,
  LoaderCircle,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";
import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

import { cn } from "@/lib/utils";
import {
  analyzeInterviewAnswer,
  createFeedback,
  createInterviewSession,
  recordInterviewCompletion,
} from "@/lib/actions/general.action";
import { vapi } from "@/lib/vapi.sdk";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type SpeechRecognitionResult = {
  transcript: string;
};

type SpeechRecognitionResultListLike = {
  [index: number]: {
    [index: number]: SpeechRecognitionResult;
    length: number;
    isFinal?: boolean;
  };
  length: number;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEvent = {
  error?: string;
  message?: string;
};

const INTRO_QUESTION = "Tell me about yourself and your background.";
const ANSWER_SILENCE_GAP_MS = 10000;
const LISTENING_RESUME_DELAY_MS = 120;
const HAS_VAPI_TOKEN = Boolean(vapi);

const VOICE_AGENT: CreateAssistantDTO = {
  name: "Interviewer",
  firstMessage: "",
  firstMessageMode: "assistant-waits-for-user",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "vapi",
    voiceId: "Neha",
    speed: 1,
  },
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a controlled recruiter voice inside an interview UI. Speak only the exact text the app sends you. Never mention commands, controls, or system behavior. Never ask your own questions or continue the interview on your own. While the candidate is speaking, remain silent, then wait for the app to send the next question after the silence gap.",
      },
    ],
  },
};

const DEFAULT_QUESTION_BANK = [
  INTRO_QUESTION,
  "What are your key strengths and weaknesses?",
  "What did you do in the last year to improve your knowledge?",
  "What are your hobbies and interests?",
  "What do you know about our company?",
  "Why do you want to work here?",
  "What motivates you?",
  "Why should we hire you?",
  "Why are you leaving your current or last job?",
  "Tell me about a time you handled conflict or stress.",
  "Tell me about a time you made a mistake.",
  "What are your short-term and long-term goals?",
  "Tell me about a time you demonstrated leadership.",
  "Are you a team player?",
  "How do you handle tight deadlines or competing priorities?",
  "How quickly do you adapt to new technology?",
  "Are you open to relocation or travel?",
  "What are your salary expectations?",
  "What is your availability to start?",
  "Do you have any questions for us?",
  "Describe a project you are most proud of and why.",
  "How do you handle feedback from your manager or teammates?",
  "Tell me about a time you worked with a difficult teammate.",
  "How do you prioritize tasks when everything feels urgent?",
  "What would your previous manager say about your work style?",
] as const;

type InterviewQuestionItem = {
  id: string;
  question: string;
  wasFollowUp: boolean;
  followUpToQuestionId?: string | null;
};

const ROUND_QUESTION_BANKS: Record<InterviewRoundType, readonly string[]> = {
  hr: [
    "Walk me through your background and what led you to apply for this role.",
    "Why do you want to work here?",
    "Tell me about a time you handled conflict within a team.",
    "Describe a situation where you had to work under pressure.",
    "What motivates you at work?",
    "Tell me about a failure and what you learned from it.",
    "How do you respond to feedback from a manager or teammate?",
    "Describe a time you showed ownership without being asked.",
    "What kind of work environment helps you perform best?",
    "Why should we hire you for this role?",
  ],
  technical: [
    "Walk me through a recent technical project and the exact code or architecture decisions you owned.",
    "Write or explain an algorithm to find duplicates in an array efficiently.",
    "How do you debug an issue that only happens in production?",
    "Explain the time and space complexity of a solution you recently implemented.",
    "How would you design a scalable REST API for a high-traffic application?",
    "Describe a performance bottleneck you fixed in code. What changed quantitatively?",
    "How do you test edge cases before shipping a backend or frontend feature?",
    "Explain a database schema or query optimization you implemented.",
    "How would you prevent race conditions or data inconsistency in a concurrent system?",
    "Walk through a recent bug from reproduction to root cause to final fix.",
  ],
  managerial: [
    "Tell me about a time you led a team through a difficult deadline or delivery.",
    "How do you prioritize work when multiple stakeholders need attention?",
    "Tell me about a time you had to align a team around a difficult decision.",
    "How do you balance delivery speed with quality and team health?",
    "Describe a situation where expectations were unclear. What did you do?",
    "How do you mentor or support less experienced teammates?",
    "Tell me about a time you pushed back on a request and why.",
    "How do you communicate risks early in a project?",
    "Describe a decision you made with incomplete information.",
    "How do you measure whether your work created business value?",
  ],
  "full-loop": [
    "Tell me about yourself and how your experience fits this opportunity.",
    "Why do you want to work here?",
    "Describe a technically challenging project you built and your exact contribution.",
    "How do you prioritize work when multiple stakeholders need attention?",
    "Tell me about a time you aligned teammates around a difficult decision.",
    "How do you debug an issue that only happens in production?",
    "What kind of environment helps you perform at your best?",
    "Tell me about a time you handled conflict within a team.",
    "Explain a trade-off you made between performance, simplicity, and maintainability.",
    "Describe a situation where expectations were unclear. What did you do?",
    "Walk through a recent bug from discovery to resolution.",
    "How do you respond to feedback from a manager or teammate?",
    "How do you measure whether your work created business value?",
  ],
  video: [
    "Give me your introduction.",
    "Why does this role fit your background right now?",
    "Describe a project you can explain clearly to a non-technical hiring manager.",
    "Tell me about a time you handled ambiguity and communicated clearly under pressure.",
    "How do you keep remote or distributed collaboration effective?",
    "Tell me about a result you delivered and how you communicated the impact.",
    "Describe a time you had to influence someone without direct authority.",
    "How do you answer confidently when you do not know something immediately?",
  ],
  "live-coding": [
    "This round uses the dedicated live coding workspace instead of the voice interview flow.",
  ],
};

const VIDEO_INTERVIEW_META: Pick<
  Interview,
  "role" | "type" | "level" | "techstack"
> = {
  role: "Video Interview Practice",
  type: "Video",
  level: "Mid",
  techstack: ["Communication", "Confidence", "Storytelling"],
};

const DELIVERY_FILLER_TERMS = [
  "um",
  "uh",
  "like",
  "you know",
  "actually",
  "basically",
  "literally",
  "i mean",
] as const;

const clampMetric = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const countPatternOccurrences = (value: string, pattern: RegExp) =>
  value.match(pattern)?.length || 0;

const countDeliveryFillers = (answer: string) => {
  const normalized = answer.toLowerCase();

  return DELIVERY_FILLER_TERMS.reduce((total, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return total + countPatternOccurrences(normalized, new RegExp(`\\b${escaped}\\b`, "g"));
  }, 0);
};

const getAnswerDurationSeconds = (
  askedAt: string | undefined,
  answeredAt: string | undefined,
  wordCount: number,
) => {
  const started = askedAt ? new Date(askedAt).getTime() : NaN;
  const ended = answeredAt ? new Date(answeredAt).getTime() : NaN;
  const fromTimestamps =
    Number.isFinite(started) && Number.isFinite(ended) && ended > started
      ? Math.round((ended - started) / 1000)
      : 0;

  if (fromTimestamps > 0) return Math.max(1, fromTimestamps);

  if (wordCount <= 0) return 0;

  return Math.max(3, Math.round((wordCount / 125) * 60));
};

const buildAnswerDeliveryMetrics = (params: {
  answer: string;
  askedAt?: string;
  answeredAt?: string;
  pauseCount?: number;
}): AnswerDeliveryMetrics => {
  const normalizedAnswer = params.answer.trim();
  const wordCount = normalizedAnswer
    ? normalizedAnswer.split(/\s+/).filter(Boolean).length
    : 0;
  const durationSeconds = getAnswerDurationSeconds(
    params.askedAt,
    params.answeredAt,
    wordCount,
  );
  const wordsPerMinute =
    wordCount > 0 && durationSeconds > 0
      ? clampMetric((wordCount / durationSeconds) * 60, 0, 240)
      : 0;
  const fillerCount = countDeliveryFillers(normalizedAnswer);
  const pauseCount = Math.max(0, Number(params.pauseCount || 0));
  const pacePenalty =
    wordsPerMinute > 0 ? Math.min(26, Math.abs(wordsPerMinute - 135) / 3.5) : 18;
  const shortAnswerPenalty = wordCount >= 18 ? 0 : Math.max(0, 18 - wordCount);
  const confidenceScore = clampMetric(
    92 - fillerCount * 8 - pauseCount * 6 - pacePenalty - shortAnswerPenalty,
  );

  return {
    wordCount,
    durationSeconds,
    wordsPerMinute,
    fillerCount,
    pauseCount,
    confidenceScore,
  };
};

const orderQuestionBank = (questions: readonly string[]) => {
  const cleaned = [...new Set(questions.map((q) => q.trim()).filter(Boolean))];
  if (cleaned.length <= 1) return cleaned;

  const [openingQuestion, ...remainingQuestions] = cleaned;
  return [openingQuestion, ...shuffle(remainingQuestions)];
};

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const extractCountFromWords = (text: string) => {
  const cleaned = text
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^a-z\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;

  let value = 0;
  let seenNumberToken = false;

  for (const token of tokens) {
    if (token === "and") continue;

    if (token === "hundred" && value > 0) {
      value *= 100;
      seenNumberToken = true;
      continue;
    }

    const mapped = NUMBER_WORDS[token];
    if (typeof mapped === "number") {
      value += mapped;
      seenNumberToken = true;
      continue;
    }

    if (seenNumberToken) break;
  }

  if (!seenNumberToken) return null;
  return value;
};

const extractQuestionCount = (text: string, max: number) => {
  const match = text.match(/\d+/);
  const parsed = match ? Number(match[0]) : extractCountFromWords(text);
  if (parsed === null || !Number.isFinite(parsed)) return null;

  return Math.min(Math.max(parsed, 1), max);
};

const inferInterviewMeta = (selectedQuestions: string[]) => {
  const text = selectedQuestions.join(" ").toLowerCase();

  const hasJava = /\bjava\b|spring|hibernate/.test(text);
  const hasPython = /\bpython\b|django|flask|fastapi/.test(text);
  const hasDotnet = /\.net|c#|asp\.net/.test(text);
  const hasFrontend = /react|next\.js|frontend|ui|css|javascript|typescript/.test(
    text,
  );
  const hasBackend = /api|backend|database|sql|node|server|microservice/.test(text);
  const hasDevops = /devops|docker|kubernetes|ci\/cd|aws|azure|gcp|terraform/.test(
    text,
  );
  const hasData = /data|sql|analytics|etl|warehouse|tableau|power bi/.test(text);
  const hasMl = /machine learning|deep learning|llm|ai model|prompt/.test(text);
  const hasQa = /qa|testing|automation|selenium|cypress|jest/.test(text);
  const hasMobile = /android|ios|flutter|react native|kotlin|swift/.test(text);
  const hasMarketing =
    /marketing|seo|campaign|brand|content strategy|social media|growth/.test(text);

  let role = "Software Engineer";
  if (hasJava && (hasFrontend || hasBackend)) role = "Full Stack Java Developer";
  else if (hasPython && (hasFrontend || hasBackend))
    role = "Full Stack Python Developer";
  else if (hasDotnet && (hasFrontend || hasBackend))
    role = "Full Stack .NET Developer";
  else if (hasFrontend && hasBackend) role = "Full Stack Developer";
  else if (hasFrontend) role = "Frontend Developer";
  else if (hasBackend) role = "Backend Developer";
  else if (hasMl) role = "ML Engineer";
  else if (hasData) role = "Data Engineer";
  else if (hasDevops) role = "DevOps Engineer";
  else if (hasQa) role = "QA Automation Engineer";
  else if (hasMobile) role = "Mobile App Developer";
  else if (hasMarketing) role = "Digital Marketing Specialist";
  else {
    const genericRoles = [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "DevOps Engineer",
      "Data Engineer",
    ];
    role = genericRoles[Math.floor(Math.random() * genericRoles.length)];
  }

  const techstack: string[] = [];
  if (hasJava) techstack.push("HTML", "CSS", "JavaScript", "Java", "Spring Boot");
  if (hasPython) techstack.push("Python", "Django");
  if (hasDotnet) techstack.push("C#", ".NET");
  if (hasFrontend) techstack.push("HTML", "CSS", "JavaScript", "React", "TypeScript");
  if (hasBackend) techstack.push("Node.js", "SQL", "MySQL", "NoSQL");
  if (hasDevops) techstack.push("Docker", "Kubernetes");
  if (hasMl) techstack.push("Python", "LLM");
  if (hasData) techstack.push("SQL", "Analytics");
  if (hasQa) techstack.push("Testing", "Automation");
  if (hasMarketing) techstack.push("SEO", "Analytics");
  if (techstack.length === 0) techstack.push("Communication", "Problem Solving");

  return {
    role,
    type: hasFrontend || hasBackend ? "Mixed" : "Behavioral",
    level: "Mid",
    techstack: [...new Set(techstack)],
  };
};

const getRecognitionCtor = (): BrowserSpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;

  const w = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const normalizeSpeech = (value: string) =>
  value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

const getVoiceFallbackSupport = () => {
  if (typeof window === "undefined") return false;

  return Boolean(getRecognitionCtor() || window.speechSynthesis);
};

const FEMALE_VOICE_HINTS = [
  "neha",
  "zira",
  "samantha",
  "hazel",
  "jenny",
  "aria",
  "ava",
  "sara",
  "susan",
  "female",
] as const;

const pickPreferredFemaleVoice = (voices: SpeechSynthesisVoice[]) => {
  if (!voices.length) return null;

  const matchesHint = (voice: SpeechSynthesisVoice) => {
    const normalizedName = voice.name.toLowerCase();
    return FEMALE_VOICE_HINTS.some((hint) => normalizedName.includes(hint));
  };

  const englishVoices = voices.filter((voice) =>
    /^en([-_]|$)/i.test(voice.lang || ""),
  );

  return (
    englishVoices.find(matchesHint) ||
    voices.find(matchesHint) ||
    englishVoices[0] ||
    voices[0] ||
    null
  );
};

const getVapiErrorMeta = (error: unknown) => {
  if (typeof error === "string") {
    return { type: "", stage: "", message: error };
  }

  if (error instanceof Error) {
    return {
      type: error.name || "",
      stage: "",
      message: error.message || "Unknown Vapi error",
    };
  }

  if (!error || typeof error !== "object") {
    return { type: "", stage: "", message: "Unknown Vapi error" };
  }

  const record = error as {
    type?: string;
    stage?: string;
    error?:
      | string
      | {
          message?: string;
          msg?: string;
          type?: string;
          errorMsg?: string;
        };
    message?:
      | string
      | {
          msg?: string;
          type?: string;
        };
  };
  const nestedError =
    record.error && typeof record.error === "object" ? record.error : undefined;
  const nestedMessage =
    record.message && typeof record.message === "object" ? record.message : undefined;

  return {
    type: String(record.type || nestedError?.type || nestedMessage?.type || ""),
    stage: String(record.stage || ""),
    message: String(
      (typeof record.error === "string" ? record.error : "") ||
        nestedError?.message ||
        nestedError?.msg ||
        nestedError?.errorMsg ||
        (typeof record.message === "string" ? record.message : "") ||
        nestedMessage?.msg ||
        "Unknown Vapi error",
    ),
  };
};

const isRecoverableVapiAudioProcessingError = (error: unknown) => {
  const { type, stage, message } = getVapiErrorMeta(error);
  const combined = `${type} ${stage} ${message}`.toLowerCase();

  return (
    combined.includes("audio-processing-setup-error") ||
    combined.includes("audio-processor-error") ||
    combined.includes("error unloading krisp processor") ||
    combined.includes("krisp") ||
    combined.includes("noise-cancellation") ||
    combined.includes("wasm_or_worker_not_ready")
  );
};

const isRecoverableVapiDisconnect = (error: unknown) => {
  const { type, message } = getVapiErrorMeta(error);
  const combined = `${type} ${message}`.toLowerCase();

  return (
    combined.includes("send transport changed to disconnected") ||
    combined.includes("meeting has ended") ||
    combined.includes("ejected") ||
    combined.includes("customer-ended-call") ||
    combined.includes("disconnected")
  );
};

const shouldSilenceVapiError = (error: unknown) => {
  const { type, message } = getVapiErrorMeta(error);
  const combined = `${type} ${message}`.toLowerCase();

  return (
    isRecoverableVapiAudioProcessingError(error) ||
    isRecoverableVapiDisconnect(error) ||
    combined.includes("meeting ended due to ejection") ||
    combined.includes("meeting has ended")
  );
};

const shouldSilenceVapiConsoleArgs = (args: unknown[]) => args.some(shouldSilenceVapiError);

const isValidInterviewAnswer = (answer: string, question: string) => {
  const normalizedAnswer = normalizeSpeech(answer);
  const normalizedQuestion = normalizeSpeech(question);

  // Avoid auto-submitting extremely short/noisy captures.
  if (normalizedAnswer.length < 6) return false;

  // Prevent assistant prompt echo from being treated as candidate answer.
  if (normalizedQuestion && normalizedAnswer === normalizedQuestion) return false;
  if (
    normalizedQuestion &&
    (normalizedAnswer.includes(normalizedQuestion) ||
      normalizedQuestion.includes(normalizedAnswer))
  ) {
    return false;
  }

  return true;
};

const Agent = ({
  userName,
  profileImage: _profileImage,
  userId,
  interviewId,
  feedbackId,
  type: _type,
  questions,
  autoStart = false,
  roundType = "technical",
}: AgentProps) => {
  void [_profileImage, _type];

  const router = useRouter();
  const safeQuestions = React.useMemo(() => questions ?? [], [questions]);
  const effectiveRoundType = roundType;
  const isVideoInterview = effectiveRoundType === "video";
  const roundLabel = isVideoInterview
    ? "video interview"
    : `${effectiveRoundType.replace("-", " ")} round`;
  const [voiceProvider, setVoiceProvider] = React.useState<"vapi" | "browser">(
    !isVideoInterview && HAS_VAPI_TOKEN ? "vapi" : "browser",
  );

  const [callStatus, setCallStatus] = React.useState<CallStatus>(
    CallStatus.INACTIVE,
  );
  const [sessionQuestions, setSessionQuestions] = React.useState<InterviewQuestionItem[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(-1);
  const [currentPrompt, setCurrentPrompt] = React.useState("");
  const [currentAnswer, setCurrentAnswer] = React.useState("");
  const [qaLog, setQaLog] = React.useState<ReplayQuestionEntry[]>([]);
  const [latestCoaching, setLatestCoaching] = React.useState<AnswerCoaching | null>(null);
  const [latestDeliveryMetrics, setLatestDeliveryMetrics] =
    React.useState<AnswerDeliveryMetrics | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(true);
  const [micError, setMicError] = React.useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = React.useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = React.useState(false);
  const [isUserMicEnabled, setIsUserMicEnabled] = React.useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = React.useState(false);
  const [isPreparingCamera, setIsPreparingCamera] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [answerInputMode, setAnswerInputMode] = React.useState<"voice" | "typing">(
    "voice",
  );
  const [resolvedInterviewId, setResolvedInterviewId] = React.useState<
    string | undefined
  >(interviewId);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);

  const videoPreviewRef = React.useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const preferredSpeechVoiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const spokenTextRef = React.useRef("");
  const isSubmittingRef = React.useRef(false);
  const autoSubmitFromSpeechRef = React.useRef<(answer: string) => void>(() => {});
  const startListeningRef = React.useRef<() => void>(() => {});
  const silenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayedAutoSubmitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualStopRef = React.useRef(false);
  const shouldAutoSubmitOnEndRef = React.useRef(false);
  const autoStartTriggeredRef = React.useRef(false);
  const preSpokenQuestionIndexRef = React.useRef<number | null>(null);
  const callStatusRef = React.useRef<CallStatus>(CallStatus.INACTIVE);
  const currentQuestionIndexRef = React.useRef(-1);
  const currentPromptRef = React.useRef("");
  const voiceProviderRef = React.useRef<"vapi" | "browser">(
    !isVideoInterview && HAS_VAPI_TOKEN ? "vapi" : "browser",
  );
  const pendingSpeechRef = React.useRef<string | null>(null);
  const suppressUnexpectedVapiEndRef = React.useRef(false);
  const lastFinalTranscriptRef = React.useRef<{
    questionIndex: number;
    transcript: string;
  } | null>(null);
  const lastSpokenQuestionIndexRef = React.useRef<number | null>(null);
  const pauseCountByQuestionRef = React.useRef<Record<string, number>>({});
  const lastSpeechActivityAtRef = React.useRef<number | null>(null);
  const micPermissionGrantedRef = React.useRef(false);
  const answerInputFocusedRef = React.useRef(false);
  const manualInputModeRef = React.useRef(false);
  const isSpeaking = assistantSpeaking;
  const isUserMicOn = isUserMicEnabled;
  const isUserVideoOn = isCameraEnabled;
  const isAiMicOn =
    isSpeaking ||
    callStatus === CallStatus.ACTIVE ||
    callStatus === CallStatus.CONNECTING;

  const updateCallStatus = React.useCallback((nextStatus: CallStatus) => {
    callStatusRef.current = nextStatus;
    setCallStatus(nextStatus);
  }, []);

  const resetAnswerInputMode = React.useCallback(() => {
    answerInputFocusedRef.current = false;
    manualInputModeRef.current = false;
    setAnswerInputMode("voice");
  }, []);

  const resumeListening = React.useCallback(() => {
    if (
      answerInputFocusedRef.current ||
      manualInputModeRef.current ||
      callStatusRef.current !== CallStatus.ACTIVE ||
      isGeneratingReport ||
      isInterviewCompleted ||
      (isVideoInterview && !isUserMicEnabled)
    ) {
      return;
    }

    startListeningRef.current();
  }, [isGeneratingReport, isInterviewCompleted, isUserMicEnabled, isVideoInterview]);

  const renderStatusBadge = (
    active: boolean,
    ActiveIcon: React.ComponentType<{ className?: string }>,
    InactiveIcon: React.ComponentType<{ className?: string }>,
    label: string,
    options?: {
      onClick?: () => void;
      interactive?: boolean;
    },
  ) => {
    const Icon = active ? ActiveIcon : InactiveIcon;
    const isInteractive = Boolean(options?.interactive && options?.onClick);

    const className = cn(
      "video-status-badge",
      active ? "video-status-badge--active" : "video-status-badge--inactive",
      isInteractive && "video-status-badge--interactive",
    );

    if (isInteractive) {
      return (
        <button
          type="button"
          onClick={options?.onClick}
          className={className}
          aria-label={`${label} ${active ? "on" : "off"}`}
          title={`${label} ${active ? "on" : "off"}`}
        >
          <Icon className="size-4" />
        </button>
      );
    }

    return (
      <span
        className={cn(
          className,
        )}
        aria-label={`${label} ${active ? "on" : "off"}`}
        title={`${label} ${active ? "on" : "off"}`}
      >
        <Icon className="size-4" />
      </span>
    );
  };

  const setVoiceProviderMode = React.useCallback((nextMode: "vapi" | "browser") => {
    voiceProviderRef.current = nextMode;
    setVoiceProvider(nextMode);
  }, []);

  React.useEffect(() => {
    setSpeechSupported(
      voiceProvider === "vapi" ? true : Boolean(getRecognitionCtor()),
    );
  }, [voiceProvider]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const syncPreferredVoice = () => {
      preferredSpeechVoiceRef.current = pickPreferredFemaleVoice(
        window.speechSynthesis.getVoices(),
      );
    };

    syncPreferredVoice();
    window.speechSynthesis.addEventListener("voiceschanged", syncPreferredVoice);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", syncPreferredVoice);
    };
  }, []);

  React.useEffect(() => {
    const preferredProvider =
      !isVideoInterview && HAS_VAPI_TOKEN ? "vapi" : "browser";

    if (voiceProviderRef.current !== preferredProvider) {
      setVoiceProviderMode(preferredProvider);
    }
  }, [isVideoInterview, setVoiceProviderMode]);

  React.useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  React.useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  React.useEffect(() => {
    currentPromptRef.current = currentPrompt;
  }, [currentPrompt]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const originalConsoleError = console.error;

    console.error = (...args: Parameters<typeof console.error>) => {
      if (shouldSilenceVapiConsoleArgs(args)) return;
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const markQuestionAsked = React.useCallback((index: number) => {
    setQaLog((prev) => {
      if (!prev[index] || prev[index].askedAt) return prev;

      const next = [...prev];
      next[index] = {
        ...next[index],
        askedAt: new Date().toISOString(),
      };
      return next;
    });
  }, []);

  const currentDeliveryMetrics = React.useMemo(() => {
    if (!isVideoInterview || currentQuestionIndex < 0 || !currentAnswer.trim()) return null;

    const currentEntry = qaLog[currentQuestionIndex];
    return buildAnswerDeliveryMetrics({
      answer: currentAnswer,
      askedAt: currentEntry?.askedAt,
      answeredAt: new Date().toISOString(),
      pauseCount: currentEntry ? pauseCountByQuestionRef.current[currentEntry.id] || 0 : 0,
    });
  }, [currentAnswer, currentQuestionIndex, isVideoInterview, qaLog]);

  const ensureMicrophonePermission = React.useCallback(async () => {
    if (micPermissionGrantedRef.current) return true;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support microphone access.";
      setMicError(message);
      setSpeechSupported(false);
      toast.error(message);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      micPermissionGrantedRef.current = true;
      setMicError(null);
      setSpeechSupported(Boolean(getRecognitionCtor()));
      return true;
    } catch (error) {
      console.error(error);
      const message =
        "Microphone access is required for video interview input. Please allow microphone permission.";
      micPermissionGrantedRef.current = false;
      setMicError(message);
      toast.error(message);
      return false;
    }
  }, []);

  const releaseCameraStream = React.useCallback(() => {
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, []);

  const stopCameraStream = React.useCallback(() => {
    releaseCameraStream();
    setIsCameraEnabled(false);
    setIsPreparingCamera(false);
  }, [releaseCameraStream]);

  const attachCameraStream = React.useCallback((stream: MediaStream) => {
    const preview = videoPreviewRef.current;
    if (!preview) return;

    preview.srcObject = stream;
    const playPromise = preview.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, []);

  const ensureCameraReady = React.useCallback(async () => {
    if (!isVideoInterview) return true;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support camera access.";
      setCameraError(message);
      toast.error(message);
      return false;
    }

    const existingStream = cameraStreamRef.current;
    if (existingStream) {
      const hasLiveTrack = existingStream
        .getVideoTracks()
        .some((track) => track.readyState === "live");

      if (hasLiveTrack) {
        setCameraError(null);
        setIsCameraEnabled(true);
        attachCameraStream(existingStream);
        return true;
      }

      releaseCameraStream();
    }

    setIsPreparingCamera(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraEnabled(true);
      return true;
    } catch (error) {
      console.error(error);
      const message = "Camera access is required for video interview mode.";
      setCameraError(message);
      toast.error(message);
      return false;
    } finally {
      setIsPreparingCamera(false);
    }
  }, [attachCameraStream, isVideoInterview, releaseCameraStream]);

  const handleCameraToggle = React.useCallback(async () => {
    if (isCameraEnabled) {
      stopCameraStream();
      setCameraError(null);
      return;
    }

    await ensureCameraReady();
  }, [ensureCameraReady, isCameraEnabled, stopCameraStream]);

  React.useEffect(() => {
    if (!isVideoInterview || !isCameraEnabled || !cameraStreamRef.current) return;

    attachCameraStream(cameraStreamRef.current);
  }, [attachCameraStream, isCameraEnabled, isVideoInterview]);

  React.useEffect(() => {
    return () => {
      releaseCameraStream();
    };
  }, [releaseCameraStream]);

  const clearSilenceTimer = React.useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearDelayedAutoSubmitTimer = React.useCallback(() => {
    if (delayedAutoSubmitTimerRef.current) {
      clearTimeout(delayedAutoSubmitTimerRef.current);
      delayedAutoSubmitTimerRef.current = null;
    }
  }, []);

  const scheduleDelayedAutoSubmit = React.useCallback(
    (answer: string) => {
      const normalizedAnswer = answer.trim();
      clearDelayedAutoSubmitTimer();

      if (!normalizedAnswer) return;

      delayedAutoSubmitTimerRef.current = window.setTimeout(() => {
        delayedAutoSubmitTimerRef.current = null;
        autoSubmitFromSpeechRef.current(normalizedAnswer);
      }, ANSWER_SILENCE_GAP_MS);
    },
    [clearDelayedAutoSubmitTimer],
  );

  const stopListening = React.useCallback(() => {
    manualStopRef.current = true;
    shouldAutoSubmitOnEndRef.current = false;
    clearSilenceTimer();
    clearDelayedAutoSubmitTimer();
    lastSpeechActivityAtRef.current = null;

    if (voiceProviderRef.current === "vapi") {
      setIsListening(false);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearDelayedAutoSubmitTimer, clearSilenceTimer]);

  const speakText = React.useCallback((text: string, onDone: () => void) => {
    if (voiceProviderRef.current === "vapi") {
      if (!vapi) {
        window.setTimeout(onDone, 50);
        return;
      }

      if (callStatusRef.current !== CallStatus.ACTIVE) {
        pendingSpeechRef.current = text;
        window.setTimeout(onDone, 50);
        return;
      }

      try {
        pendingSpeechRef.current = null;
        vapi.say(text);
      } catch (error) {
        if (!shouldSilenceVapiError(error)) {
          console.error(error);
        }
      }

      window.setTimeout(onDone, 50);
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      setAssistantSpeaking(false);
      onDone();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice =
      preferredSpeechVoiceRef.current ||
      pickPreferredFemaleVoice(window.speechSynthesis.getVoices());

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || "en-US";
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.08;
    setAssistantSpeaking(true);
    utterance.onend = () => {
      setAssistantSpeaking(false);
      onDone();
    };
    utterance.onerror = () => {
      setAssistantSpeaking(false);
      onDone();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = React.useCallback(() => {
    if (isVideoInterview && !isUserMicEnabled) {
      setIsListening(false);
      return;
    }

    if (answerInputFocusedRef.current || manualInputModeRef.current) {
      setIsListening(false);
      return;
    }

    if (voiceProviderRef.current === "vapi") {
      setIsListening(true);
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSpeechSupported(false);
      return;
    }

    const beginRecognition = () => {
      stopListening();
      manualStopRef.current = false;
      shouldAutoSubmitOnEndRef.current = false;
      clearSilenceTimer();
      setMicError(null);

      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += `${event.results[i][0].transcript} `;
        }
        const finalText = transcript.replace(/\s+/g, " ").trim();
        const now = Date.now();
        const activeQuestion = sessionQuestions[currentQuestionIndexRef.current];

        if (
          activeQuestion &&
          finalText &&
          lastSpeechActivityAtRef.current &&
          now - lastSpeechActivityAtRef.current > 1400
        ) {
          pauseCountByQuestionRef.current[activeQuestion.id] =
            (pauseCountByQuestionRef.current[activeQuestion.id] || 0) + 1;
        }
        if (finalText) {
          lastSpeechActivityAtRef.current = now;
        }

        if (answerInputFocusedRef.current || manualInputModeRef.current) {
          spokenTextRef.current = finalText;
          return;
        }

        spokenTextRef.current = finalText;
        setAnswerInputMode("voice");
        setCurrentAnswer(finalText);

        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          shouldAutoSubmitOnEndRef.current = true;
          recognition.stop();
        }, ANSWER_SILENCE_GAP_MS);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const code = event?.error || "";
        if (code === "aborted") {
          setIsListening(false);
          return;
        }
        if (code === "not-allowed" || code === "service-not-allowed") {
          micPermissionGrantedRef.current = false;
          setMicError("Microphone permission is blocked. Allow it in Chrome and try again.");
          toast.error("Microphone permission is blocked. Allow it in Chrome and try again.");
        } else if (code === "audio-capture") {
          setMicError("No microphone was detected for speech input.");
          toast.error("No microphone was detected for speech input.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        clearSilenceTimer();
        lastSpeechActivityAtRef.current = null;
        const finalSpoken = (spokenTextRef.current || "").trim();
        if (manualStopRef.current) {
          manualStopRef.current = false;
          return;
        }

        setCurrentAnswer((prev) => (finalSpoken || prev || "").trim());

        if (shouldAutoSubmitOnEndRef.current && finalSpoken) {
          shouldAutoSubmitOnEndRef.current = false;

          if (
            currentQuestionIndexRef.current >= 0 &&
            !isValidInterviewAnswer(finalSpoken, currentPromptRef.current)
          ) {
            spokenTextRef.current = "";
            setCurrentAnswer("");
            if (
              callStatus === CallStatus.ACTIVE &&
              !isGeneratingReport &&
              !isInterviewCompleted &&
              !answerInputFocusedRef.current &&
              !manualInputModeRef.current
            ) {
              setTimeout(() => {
                startListeningRef.current();
              }, LISTENING_RESUME_DELAY_MS);
            }
            return;
          }

          autoSubmitFromSpeechRef.current(finalSpoken);
          return;
        }

        if (
          callStatus === CallStatus.ACTIVE &&
          !isGeneratingReport &&
          !isInterviewCompleted &&
          !answerInputFocusedRef.current &&
          !manualInputModeRef.current
        ) {
          setTimeout(() => {
            startListeningRef.current();
          }, LISTENING_RESUME_DELAY_MS);
        }
      };

      recognitionRef.current = recognition;
      setIsListening(true);

      try {
        recognition.start();
      } catch (error) {
        console.error(error);
        setIsListening(false);
        toast.error("Could not start microphone input. Please try again.");
      }
    };

    if (isVideoInterview && !micPermissionGrantedRef.current) {
      void ensureMicrophonePermission().then((granted) => {
        if (!granted) {
          setIsListening(false);
          return;
        }
        beginRecognition();
      });
      return;
    }

    beginRecognition();
  }, [
    callStatus,
    clearSilenceTimer,
    ensureMicrophonePermission,
    isGeneratingReport,
    isInterviewCompleted,
    isUserMicEnabled,
    isVideoInterview,
    sessionQuestions,
    stopListening,
  ]);

  React.useEffect(() => {
    if (!vapi) return;

    const client = vapi;

    const handleCallStart = () => {
      suppressUnexpectedVapiEndRef.current = false;
      updateCallStatus(CallStatus.ACTIVE);
      setIsListening(true);

      if (pendingSpeechRef.current) {
        const queuedPrompt = pendingSpeechRef.current;
        pendingSpeechRef.current = null;
        try {
          client.say(queuedPrompt);
        } catch (error) {
          if (!shouldSilenceVapiError(error)) {
            console.error(error);
          }
        }
      }
    };

    const handleCallEnd = () => {
      setAssistantSpeaking(false);
      setIsListening(false);
      clearSilenceTimer();
      clearDelayedAutoSubmitTimer();

      if (suppressUnexpectedVapiEndRef.current) {
        suppressUnexpectedVapiEndRef.current = false;
        return;
      }

      const endedUnexpectedly =
        voiceProviderRef.current === "vapi" &&
        callStatusRef.current !== CallStatus.INACTIVE &&
        callStatusRef.current !== CallStatus.FINISHED &&
        !isGeneratingReport &&
        !isInterviewCompleted;

      if (endedUnexpectedly && getVoiceFallbackSupport()) {
        setVoiceProviderMode("browser");
        setSpeechSupported(Boolean(getRecognitionCtor()));
        pendingSpeechRef.current = null;

        if (callStatusRef.current === CallStatus.CONNECTING) {
          updateCallStatus(CallStatus.ACTIVE);
        }

        toast.error("Voice meeting ended. Switched to local voice mode.");

        window.setTimeout(() => {
          resumeListening();
        }, LISTENING_RESUME_DELAY_MS);
      }
    };

    const handleSpeechStart = () => {
      setAssistantSpeaking(true);
    };

    const handleSpeechEnd = () => {
      setAssistantSpeaking(false);
    };

    const handleMessage = (message: Message | { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
      if (!message || message.type !== "transcript" || !message.transcript) return;

      if (message.role === "assistant") {
        setCurrentPrompt(message.transcript);
        return;
      }

      if (message.role !== "user") return;

      clearDelayedAutoSubmitTimer();
      setCurrentAnswer(message.transcript);

      if (message.transcriptType === "final") {
        const finalTranscript = message.transcript.trim();
        const lastFinalTranscript = lastFinalTranscriptRef.current;

        if (
          lastFinalTranscript &&
          lastFinalTranscript.questionIndex === currentQuestionIndexRef.current &&
          lastFinalTranscript.transcript === finalTranscript
        ) {
          return;
        }

        lastFinalTranscriptRef.current = {
          questionIndex: currentQuestionIndexRef.current,
          transcript: finalTranscript,
        };

        scheduleDelayedAutoSubmit(finalTranscript);
      }
    };

    const handleError = (error: unknown) => {
      const { message: errorMessage } = getVapiErrorMeta(error);

      if (isRecoverableVapiAudioProcessingError(error)) {
        return;
      }

      if (voiceProviderRef.current !== "vapi" && shouldSilenceVapiError(error)) {
        return;
      }

      if (
        voiceProviderRef.current === "vapi" &&
        isRecoverableVapiDisconnect(error) &&
        getVoiceFallbackSupport()
      ) {
        setVoiceProviderMode("browser");
        setSpeechSupported(Boolean(getRecognitionCtor()));
        setIsListening(false);
        setAssistantSpeaking(false);
        pendingSpeechRef.current = null;
        suppressUnexpectedVapiEndRef.current = true;
        void client.stop().catch(() => {});

        if (callStatusRef.current === CallStatus.CONNECTING) {
          updateCallStatus(CallStatus.ACTIVE);
        }

        toast.error("Voice connection dropped. Switched to local voice mode.");
        return;
      }

      toast.error(`Voice agent failed: ${errorMessage}`);
      updateCallStatus(CallStatus.INACTIVE);
      setIsListening(false);
      setAssistantSpeaking(false);
    };

    const handleCallStartFailed = (event: {
      error?: string;
      stage?: string;
    }) => {
      if (isRecoverableVapiAudioProcessingError(event)) {
        return;
      }

      const stage = event?.stage ? `${event.stage}: ` : "";
      toast.error(`Voice start failed. ${stage}${event?.error || "Unknown error"}`);
      updateCallStatus(CallStatus.INACTIVE);
      setIsListening(false);
      setAssistantSpeaking(false);
    };

    client.on("call-start", handleCallStart);
    client.on("call-end", handleCallEnd);
    client.on("speech-start", handleSpeechStart);
    client.on("speech-end", handleSpeechEnd);
    client.on("message", handleMessage);
    client.on("error", handleError);
    client.on("call-start-failed", handleCallStartFailed);

    return () => {
      client.removeListener("call-start", handleCallStart);
      client.removeListener("call-end", handleCallEnd);
      client.removeListener("speech-start", handleSpeechStart);
      client.removeListener("speech-end", handleSpeechEnd);
      client.removeListener("message", handleMessage);
      client.removeListener("error", handleError);
      client.removeListener("call-start-failed", handleCallStartFailed);
      suppressUnexpectedVapiEndRef.current = true;
      void client.stop().catch(() => {});
    };
  }, [
    clearDelayedAutoSubmitTimer,
    clearSilenceTimer,
    isGeneratingReport,
    isInterviewCompleted,
    resumeListening,
    scheduleDelayedAutoSubmit,
    setVoiceProviderMode,
    updateCallStatus,
  ]);

  React.useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const startVoiceAgentCall = React.useCallback(async () => {
    if (!vapi || voiceProviderRef.current !== "vapi") {
      if (callStatusRef.current === CallStatus.CONNECTING) {
        updateCallStatus(CallStatus.ACTIVE);
      }
      return true;
    }

    try {
      const webCall = await vapi.start(VOICE_AGENT);
      if (!webCall) {
        setVoiceProviderMode("browser");
        setSpeechSupported(Boolean(getRecognitionCtor()));
        toast.error("Voice agent unavailable. Switched to local voice mode.");
        return true;
      }

      return true;
    } catch (error) {
      if (getVoiceFallbackSupport()) {
        setVoiceProviderMode("browser");
        setSpeechSupported(Boolean(getRecognitionCtor()));
        toast.error("Voice agent unavailable. Switched to local voice mode.");
        return true;
      }

      const { message } = getVapiErrorMeta(error);
      toast.error(`Could not start the voice agent. ${message}`);
      updateCallStatus(CallStatus.INACTIVE);
      return false;
    }
  }, [setVoiceProviderMode, updateCallStatus]);

  const buildQuestionItems = React.useCallback((items: string[]) => {
    return items.map((question, index) => ({
      id: `q-${index + 1}`,
      question,
      wasFollowUp: false,
      followUpToQuestionId: null,
    }));
  }, []);

  const commitAnswer = React.useCallback(
    (answer: string, index: number, baseLog?: ReplayQuestionEntry[]) => {
      const targetLog = baseLog ? [...baseLog] : [...qaLog];
      if (!targetLog[index]) return targetLog;
      const normalizedAnswer = answer.trim();
      const answeredAt = new Date().toISOString();
      const askedAt = targetLog[index].askedAt || answeredAt;
      const deliveryMetrics = buildAnswerDeliveryMetrics({
        answer: normalizedAnswer,
        askedAt,
        answeredAt,
        pauseCount: pauseCountByQuestionRef.current[targetLog[index].id] || 0,
      });

      targetLog[index] = {
        ...targetLog[index],
        answer: normalizedAnswer || "(No answer)",
        askedAt,
        answeredAt,
        deliveryMetrics,
      };
      setLatestDeliveryMetrics(deliveryMetrics);
      pauseCountByQuestionRef.current[targetLog[index].id] = 0;

      return targetLog;
    },
    [qaLog],
  );

  const generateAndNavigateReport = React.useCallback(
    async (finalLog: ReplayQuestionEntry[]) => {
      setIsGeneratingReport(true);

      try {
        const idToUse = resolvedInterviewId;
        if (!idToUse || !userId) {
          updateCallStatus(CallStatus.FINISHED);
          toast.error("Missing interview session details for report generation.");
          return;
        }

        const transcript = finalLog
          .filter((x) => x.question)
          .flatMap((item) => [
            { role: "assistant", content: item.question },
            { role: "user", content: item.answer || "(No answer)" },
          ]);

        const result = await createFeedback({
          interviewId: idToUse,
          userId,
          transcript,
          feedbackId,
        });

        if (!result.success) {
          toast.error(result.error || "Failed to generate report. Please try again.");
          updateCallStatus(CallStatus.FINISHED);
          return;
        }

        await recordInterviewCompletion({
          interviewId: idToUse,
          userId,
          roundType: effectiveRoundType,
          startedAt: startedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          qaLog: finalLog,
          totalScore: result.totalScore,
        });

        updateCallStatus(CallStatus.FINISHED);
        router.push(`/interview/${idToUse}/feedback`);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate report. Please try again.");
        updateCallStatus(CallStatus.FINISHED);
      } finally {
        setIsGeneratingReport(false);
      }
    },
    [
      effectiveRoundType,
      feedbackId,
      resolvedInterviewId,
      router,
      startedAt,
      updateCallStatus,
      userId,
    ],
  );

  const handleListenAgain = React.useCallback(() => {
    resetAnswerInputMode();

    if (!currentPrompt) {
      resumeListening();
      return;
    }

    speakText(currentPrompt, resumeListening);
  }, [currentPrompt, resetAnswerInputMode, resumeListening, speakText]);

  const handleAnswerInputFocus = React.useCallback(() => {
    answerInputFocusedRef.current = true;
    manualInputModeRef.current = true;
    setAnswerInputMode("typing");
    stopListening();
  }, [stopListening]);

  const handleAnswerInputBlur = React.useCallback(() => {
    answerInputFocusedRef.current = false;

    if (!currentAnswer.trim()) {
      manualInputModeRef.current = false;
      setAnswerInputMode("voice");

      if (callStatusRef.current === CallStatus.ACTIVE) {
        window.setTimeout(() => {
          resumeListening();
        }, LISTENING_RESUME_DELAY_MS);
      }
    }
  }, [currentAnswer, resumeListening]);

  const handleAnswerInputChange = React.useCallback((value: string) => {
    manualInputModeRef.current = true;
    setAnswerInputMode("typing");
    spokenTextRef.current = value;
    setCurrentAnswer(value);
  }, []);

  const handleVoiceCaptureToggle = React.useCallback(() => {
    if (isListening) {
      manualInputModeRef.current = true;
      setAnswerInputMode("typing");
      stopListening();
      return;
    }

    manualInputModeRef.current = false;
    answerInputFocusedRef.current = false;
    setAnswerInputMode("voice");
    window.setTimeout(() => {
      resumeListening();
    }, 40);
  }, [isListening, resumeListening, stopListening]);

  const handleMicToggle = React.useCallback(() => {
    if (isUserMicEnabled) {
      setIsUserMicEnabled(false);
      stopListening();
      return;
    }

    setIsUserMicEnabled(true);

    if (
      callStatusRef.current === CallStatus.ACTIVE &&
      !isGeneratingReport &&
      !isInterviewCompleted &&
      !assistantSpeaking
    ) {
      window.setTimeout(() => {
        startListeningRef.current();
      }, LISTENING_RESUME_DELAY_MS);
    }
  }, [assistantSpeaking, isGeneratingReport, isInterviewCompleted, isUserMicEnabled, stopListening]);

  const endInterviewAndGenerateReport = React.useCallback(async () => {
    stopListening();
    if (isVideoInterview) {
      stopCameraStream();
    }
    if (voiceProviderRef.current === "vapi" && vapi) {
      try {
        suppressUnexpectedVapiEndRef.current = true;
        await vapi.stop();
      } catch (error) {
        if (!shouldSilenceVapiError(error)) {
          throw error;
        }
      }
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setAssistantSpeaking(false);
    }

    const withCurrent = commitAnswer(currentAnswer, currentQuestionIndex);
    setQaLog(withCurrent);
    await generateAndNavigateReport(withCurrent);
  }, [
    commitAnswer,
    currentAnswer,
    currentQuestionIndex,
    generateAndNavigateReport,
    isVideoInterview,
    stopCameraStream,
    stopListening,
  ]);

  const handleSubmitAnswer = React.useCallback(async (overrideAnswer?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const answerText =
      (typeof overrideAnswer === "string" ? overrideAnswer : currentAnswer).trim();

    try {
      resetAnswerInputMode();

      if (currentQuestionIndex === -1) {
        const bank =
          safeQuestions.length > 0
            ? safeQuestions
            : [...(ROUND_QUESTION_BANKS[effectiveRoundType] || DEFAULT_QUESTION_BANK)];
        const orderedBank = orderQuestionBank(bank);
        const count = extractQuestionCount(answerText, orderedBank.length);

        if (!count) {
          toast.error("Please enter how many questions you want (for example: 5).");
          return;
        }

        const selected = orderedBank.slice(0, count);
        if (!interviewId && userId) {
          const interviewMeta =
            effectiveRoundType === "video"
              ? { ...VIDEO_INTERVIEW_META }
              : inferInterviewMeta(selected);
          const created = await createInterviewSession({
            userId,
            questions: selected,
            role: interviewMeta.role,
            type: interviewMeta.type,
            level: interviewMeta.level,
            techstack: interviewMeta.techstack,
            roundType: effectiveRoundType,
          });

          if (created.success) {
            setResolvedInterviewId(created.interviewId);
          } else {
            toast.error("Failed to create interview session.");
            return;
          }
        }

        const selectedQuestions = buildQuestionItems(selected);
        const now = new Date().toISOString();

        setSessionQuestions(selectedQuestions);
        setQaLog(
          selectedQuestions.map((item) => ({
            id: item.id,
            question: item.question,
            answer: "",
            askedAt: "",
            answeredAt: "",
            wasFollowUp: item.wasFollowUp,
            followUpToQuestionId: item.followUpToQuestionId,
          })),
        );
        setStartedAt(now);
        setCurrentAnswer("");
        setCurrentQuestionIndex(0);
        setIsInterviewCompleted(false);
        setLatestCoaching(null);
        setLatestDeliveryMetrics(null);
        return;
      }

      const activeQuestion = sessionQuestions[currentQuestionIndex];
      const updated = commitAnswer(answerText, currentQuestionIndex);
      setQaLog(updated);
      setCurrentAnswer("");
      stopListening();
      let insertedFollowUp = false;

      if (activeQuestion && resolvedInterviewId && userId) {
        const coachingRequest = analyzeInterviewAnswer({
          interviewId: resolvedInterviewId,
          userId,
          questionId: activeQuestion.id,
          question: activeQuestion.question,
          answer: answerText || "(No answer)",
          roundType: effectiveRoundType,
        });

        if (effectiveRoundType === "video") {
          void coachingRequest
            .then((coaching) => {
              setLatestCoaching(coaching);
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          const coaching = await coachingRequest;

          setLatestCoaching(coaching);

          if (
            coaching.shouldAskFollowUp &&
            coaching.suggestedFollowUpQuestion &&
            !activeQuestion.wasFollowUp
          ) {
            insertedFollowUp = true;
            const followUpQuestion: InterviewQuestionItem = {
              id: `${activeQuestion.id}-followup`,
              question: coaching.suggestedFollowUpQuestion,
              wasFollowUp: true,
              followUpToQuestionId: activeQuestion.id,
            };

            setSessionQuestions((prev) => {
              if (prev.some((item) => item.id === followUpQuestion.id)) return prev;

              const next = [...prev];
              next.splice(currentQuestionIndex + 1, 0, followUpQuestion);
              return next;
            });

            setQaLog((prev) => {
              if (prev.some((item) => item.id === followUpQuestion.id)) return prev;

              const next = [...prev];
              next.splice(currentQuestionIndex + 1, 0, {
                id: followUpQuestion.id,
                question: followUpQuestion.question,
                answer: "",
                askedAt: "",
                answeredAt: "",
                wasFollowUp: true,
                followUpToQuestionId: activeQuestion.id,
              });
              return next;
            });
          }
        }
      }

      const effectiveQuestionCount = sessionQuestions.length + (insertedFollowUp ? 1 : 0);
      const isLast = currentQuestionIndex >= effectiveQuestionCount - 1;
      if (isLast) {
        const completionMessage =
          "Your interview is completed. You can end your call now to generate your report.";
        setIsInterviewCompleted(true);
        setCurrentPrompt(completionMessage);
        speakText(completionMessage, resumeListening);
        return;
      }

      setCurrentQuestionIndex((idx) => idx + 1);
      } finally {
        isSubmittingRef.current = false;
      }
    }, [
      buildQuestionItems,
      commitAnswer,
      currentAnswer,
      currentQuestionIndex,
      effectiveRoundType,
      interviewId,
      resetAnswerInputMode,
      resolvedInterviewId,
      safeQuestions,
      sessionQuestions,
      speakText,
      resumeListening,
      stopListening,
      userId,
    ]);

  React.useEffect(() => {
    autoSubmitFromSpeechRef.current = (answer: string) => {
      if (callStatus !== CallStatus.ACTIVE || isGeneratingReport) return;
      void handleSubmitAnswer(answer);
    };
  }, [callStatus, handleSubmitAnswer, isGeneratingReport]);

  React.useEffect(() => {
    if (callStatus !== CallStatus.ACTIVE) return;
    if (currentQuestionIndex < 0 || currentQuestionIndex >= sessionQuestions.length)
      return;

    markQuestionAsked(currentQuestionIndex);

    if (preSpokenQuestionIndexRef.current === currentQuestionIndex) {
      preSpokenQuestionIndexRef.current = null;
      lastSpokenQuestionIndexRef.current = currentQuestionIndex;
      return;
    }

    if (lastSpokenQuestionIndexRef.current === currentQuestionIndex) {
      return;
    }

    const question = sessionQuestions[currentQuestionIndex];
    if (!question) return;
    lastSpokenQuestionIndexRef.current = currentQuestionIndex;
    setCurrentPrompt(question.question);
    setCurrentAnswer("");
    spokenTextRef.current = "";
    speakText(question.question, resumeListening);
  }, [
    callStatus,
    currentQuestionIndex,
    markQuestionAsked,
    resumeListening,
    sessionQuestions,
    speakText,
  ]);

  React.useEffect(() => {
    if (callStatus !== CallStatus.INACTIVE) return;

    stopListening();
    if (isVideoInterview) {
      stopCameraStream();
    }
    if (vapi) {
      suppressUnexpectedVapiEndRef.current = true;
      void vapi.stop().catch(() => {});
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setAssistantSpeaking(false);
    }

    setSessionQuestions([]);
    setQaLog([]);
    setLatestCoaching(null);
    setLatestDeliveryMetrics(null);
    setCurrentPrompt("");
    setCurrentAnswer("");
    setCurrentQuestionIndex(-1);
    setIsInterviewCompleted(false);
    setIsUserMicEnabled(true);
    setMicError(null);
    setAnswerInputMode("voice");
    setResolvedInterviewId(interviewId);
    setStartedAt(null);
    pendingSpeechRef.current = null;
    lastFinalTranscriptRef.current = null;
    lastSpokenQuestionIndexRef.current = null;
    pauseCountByQuestionRef.current = {};
    lastSpeechActivityAtRef.current = null;
    answerInputFocusedRef.current = false;
    manualInputModeRef.current = false;
    clearSilenceTimer();
    clearDelayedAutoSubmitTimer();
    manualStopRef.current = false;
    shouldAutoSubmitOnEndRef.current = false;
    spokenTextRef.current = "";
  }, [
    callStatus,
    clearDelayedAutoSubmitTimer,
    clearSilenceTimer,
    interviewId,
    isVideoInterview,
    stopCameraStream,
    stopListening,
  ]);

  const startInterview = async () => {
    if (isVideoInterview) {
      const micReady = await ensureMicrophonePermission();
      if (!micReady) {
        updateCallStatus(CallStatus.INACTIVE);
        return;
      }

      const cameraReady = await ensureCameraReady();
      if (!cameraReady) {
        updateCallStatus(CallStatus.INACTIVE);
        return;
      }
    }

    updateCallStatus(CallStatus.CONNECTING);
    const voiceAgentReady = await startVoiceAgentCall();
    if (!voiceAgentReady) return;

    if (
      voiceProviderRef.current === "browser" &&
      callStatusRef.current === CallStatus.CONNECTING
    ) {
      updateCallStatus(CallStatus.ACTIVE);
    }

    if (safeQuestions.length > 0) {
      const seededQuestions = buildQuestionItems(safeQuestions);
      const now = new Date().toISOString();

      setSessionQuestions(seededQuestions);
      setQaLog(
        seededQuestions.map((item) => ({
          id: item.id,
          question: item.question,
          answer: "",
          askedAt: "",
          answeredAt: "",
          wasFollowUp: item.wasFollowUp,
          followUpToQuestionId: item.followUpToQuestionId,
        })),
      );
      setCurrentPrompt("");
      setCurrentAnswer("");
      setCurrentQuestionIndex(0);
      setIsInterviewCompleted(false);
      setStartedAt(now);
      setLatestCoaching(null);
      setLatestDeliveryMetrics(null);
      resetAnswerInputMode();

      const firstQuestion = seededQuestions[0]?.question;
      if (firstQuestion) {
        preSpokenQuestionIndexRef.current = 0;
        lastSpokenQuestionIndexRef.current = 0;
        setCurrentPrompt(firstQuestion);
        setCurrentAnswer("");
        spokenTextRef.current = "";
        speakText(firstQuestion, resumeListening);
      }
      return;
    }

    const countPrompt = "How many questions do you want for this interview?";

    setSessionQuestions([]);
    setQaLog([]);
    setCurrentPrompt(countPrompt);
    setCurrentAnswer("");
    setCurrentQuestionIndex(-1);
    setStartedAt(new Date().toISOString());
    resetAnswerInputMode();
    speakText(countPrompt, resumeListening);
  };

  const handleCallClick = async () => {
    if (isGeneratingReport) return;

    if (callStatus === CallStatus.INACTIVE) {
      startInterview();
      return;
    }

    if (callStatus === CallStatus.ACTIVE) {
      await endInterviewAndGenerateReport();
      return;
    }

    if (callStatus === CallStatus.FINISHED) {
      updateCallStatus(CallStatus.INACTIVE);
    }
  };

  React.useEffect(() => {
    if (!autoStart) return;
    if (autoStartTriggeredRef.current) return;
    if (callStatus !== CallStatus.INACTIVE) return;
    if (safeQuestions.length === 0) return;

    autoStartTriggeredRef.current = true;
    startInterview();
  }, [autoStart, callStatus, safeQuestions.length, startInterview]);

  const shouldShowResponsePanel =
    Boolean(currentPrompt) ||
    callStatus === CallStatus.CONNECTING ||
    (isVideoInterview && callStatus === CallStatus.ACTIVE);

  const responsePanelTitle =
    currentPrompt ||
    (callStatus === CallStatus.CONNECTING
      ? "Connecting..."
      : 
        (currentQuestionIndex === -1
          ? "How many questions do you want for this interview?"
          : isInterviewCompleted
            ? "Your interview is completed. Click End Interview to generate your report."
            : "Answer the current interview question below."));

  return (
    <>
      <div className="call-view">
        {isVideoInterview ? (
          <>
            <div className="card-border">
              <div className="card-content">
                <div className="flex w-full max-w-md flex-col items-center gap-4">
                  <div className="video-preview-shell">
                    <div className="video-preview-shell__screen">
                      <div className="video-preview-shell__recruiter-shot">
                        <Image
                          src="/robot.png"
                          alt="Female AI robot recruiter"
                          width={540}
                          height={405}
                          className={cn(
                            "h-full w-full object-contain px-6 pt-6 pb-3 drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out",
                            isSpeaking && "scale-[1.03] translate-y-1",
                          )}
                        />
                        <div
                          className={cn(
                            "video-preview-shell__recruiter-overlay",
                            isSpeaking && "video-preview-shell__recruiter-overlay--active",
                          )}
                        />
                        <div className="video-preview-shell__bars" aria-hidden="true">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <span
                              key={`ai-bar-${index}`}
                              className={cn(
                                "ai-speaking-bar",
                                isSpeaking && "ai-speaking-bar--active",
                              )}
                              style={{ animationDelay: `${index * 0.12}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <h3 className="!mt-0">AI Recruiter</h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-light-400">
                      Recruiter
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {renderStatusBadge(isAiMicOn, Mic, MicOff, "AI microphone")}
                      {renderStatusBadge(true, Video, VideoOff, "AI video")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-border">
              <div className="card-content">
                <div className="flex w-full max-w-md flex-col items-center gap-4">
                  <div className="video-preview-shell">
                    <div className="video-preview-shell__screen">
                      {isCameraEnabled ? (
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          muted
                          playsInline
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                          {isPreparingCamera ? (
                            <LoaderCircle className="size-8 animate-spin text-primary-100" />
                          ) : (
                            <CameraOff className="size-8 text-primary-100" />
                          )}
                          <p className="text-sm text-light-100">
                            {isPreparingCamera
                              ? "Preparing camera preview..."
                              : "Enable your camera to practice a real video interview."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <h3 className="!mt-0">{userName}</h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-light-400">
                      Candidate
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {renderStatusBadge(isUserMicOn, Mic, MicOff, "Microphone", {
                        onClick: handleMicToggle,
                        interactive: true,
                      })}
                      {renderStatusBadge(isUserVideoOn, Video, VideoOff, "Camera", {
                        onClick: () => {
                          void handleCameraToggle();
                        },
                        interactive: true,
                      })}
                    </div>
                  </div>

                  {cameraError ? (
                    <p className="max-w-sm text-center text-sm text-red-300">{cameraError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card-interviewer">
              <div className="avatar">
                <Image
                  src="/ai-avatar.png"
                  alt="profile-image"
                  width={65}
                  height={54}
                  className="object-cover"
                />
                {isSpeaking && <span className="animate-speak" />}
              </div>
              <h3>Ai Interviewer</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-light-400">
                {roundLabel}
              </p>
            </div>

            <div className="card-border">
              <div className="card-content">
                <Image
                  src="/user-avatar.png"
                  alt="user-image"
                  width={540}
                  height={540}
                  className="object-cover rounded-full size-[120px]"
                />
                <h3>{userName}</h3>
              </div>
            </div>
          </>
        )}
      </div>

      {shouldShowResponsePanel && (
        <div className="transcript-border">
          <div className="transcript flex-col items-stretch">
            <p className="font-semibold text-left">
              {responsePanelTitle}
            </p>

            {callStatus === CallStatus.ACTIVE && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      answerInputMode === "voice"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-300/30 bg-amber-300/10 text-amber-100",
                    )}
                  >
                    {answerInputMode === "voice"
                      ? isListening
                        ? "Mic capturing"
                        : "Voice ready"
                      : "Typing mode"}
                  </span>
                  {voiceProvider === "browser" && speechSupported && currentQuestionIndex >= 0 ? (
                    <button
                      type="button"
                      onClick={handleVoiceCaptureToggle}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-light-100 transition-all hover:border-primary-200/40 hover:bg-primary-200/10 hover:text-primary-100"
                      disabled={isGeneratingReport || !isUserMicEnabled}
                    >
                      {isListening ? "Pause Mic" : "Use Mic"}
                    </button>
                  ) : null}
                </div>
                <input
                  value={currentAnswer}
                  onFocus={handleAnswerInputFocus}
                  onBlur={handleAnswerInputBlur}
                  onChange={(e) => handleAnswerInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSubmitAnswer();
                    }
                  }}
                  placeholder={
                    currentQuestionIndex === -1
                      ? "Type number of questions, e.g. 5"
                      : isListening
                        ? "Listening... you can also type your answer"
                        : "Type your answer here"
                  }
                  className={cn(
                    "w-full rounded-2xl border bg-dark-200/80 px-4 py-3 text-white outline-none transition-all",
                    answerInputMode === "typing"
                      ? "border-amber-300/40 shadow-[0_0_0_1px_rgba(252,211,77,0.18)] focus:border-amber-300/60"
                      : "border-dark-300 focus:border-primary-200/50 focus:shadow-[0_0_0_1px_rgba(202,197,254,0.18)]",
                  )}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSubmitAnswer();
                    }}
                    className="btn-primary w-full sm:w-auto"
                    disabled={isGeneratingReport}
                  >
                    {currentQuestionIndex === -1
                      ? "Set Question Count"
                      : "Submit Answer"}
                  </button>
                  <button
                    type="button"
                    onClick={handleListenAgain}
                    className="btn-secondary w-full sm:w-auto"
                    disabled={isGeneratingReport}
                  >
                    {currentQuestionIndex === -1
                      ? "Repeat Question"
                      : "Listen Again"}
                  </button>
                </div>
                {isInterviewCompleted && (
                  <p className="text-sm text-light-100">
                    Click <strong>{isVideoInterview ? "End Video Interview" : "End"}</strong> to generate your report.
                  </p>
                )}
              </div>
            )}

            {isVideoInterview && (currentDeliveryMetrics || latestDeliveryMetrics) ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-100">
                    Delivery Snapshot
                  </span>
                  <span className="text-sm text-light-400">
                    {currentDeliveryMetrics ? "Live answer metrics" : "Latest submitted answer"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Confidence</p>
                    <p className="mt-1 text-white">
                      {(currentDeliveryMetrics || latestDeliveryMetrics)?.confidenceScore ?? 0}/100
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Pace</p>
                    <p className="mt-1 text-white">
                      {(currentDeliveryMetrics || latestDeliveryMetrics)?.wordsPerMinute ?? 0} wpm
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Fillers</p>
                    <p className="mt-1 text-white">
                      {(currentDeliveryMetrics || latestDeliveryMetrics)?.fillerCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Pauses</p>
                    <p className="mt-1 text-white">
                      {(currentDeliveryMetrics || latestDeliveryMetrics)?.pauseCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {latestCoaching ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-100">
                    Answer Coaching
                  </span>
                  <span className="text-sm text-light-400">
                    Overall {latestCoaching.overallScore}/100
                  </span>
                </div>
                <p className="mt-3 text-sm text-white">{latestCoaching.quickTip}</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Clarity</p>
                    <p className="mt-1 text-white">{latestCoaching.clarityScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Relevance</p>
                    <p className="mt-1 text-white">{latestCoaching.relevanceScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-light-400">Depth</p>
                    <p className="mt-1 text-white">{latestCoaching.depthScore}</p>
                  </div>
                </div>
                {latestCoaching.deliveryNote ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-light-400">Delivery note</p>
                    <p className="mt-1 text-sm text-white">{latestCoaching.deliveryNote}</p>
                  </div>
                ) : null}
                {latestCoaching.improvedAnswer ? (
                  <div className="mt-3 rounded-xl border border-primary-200/20 bg-primary-200/8 p-3">
                    <p className="text-sm text-light-400">Stronger answer</p>
                    <p className="mt-1 text-sm text-white">{latestCoaching.improvedAnswer}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!speechSupported && (
              <p className="mt-2 text-sm text-red-300">
                Voice input is not supported in this browser. Typing still works.
              </p>
            )}

            {micError && (
              <p className="mt-2 text-sm text-red-300">
                {micError}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED ? (
          <button
            className="relative btn-call"
            onClick={handleCallClick}
            disabled={isGeneratingReport}
          >
            <span className="relative">
              {isGeneratingReport
                ? "Generating Report..."
                : callStatus === CallStatus.FINISHED
                  ? "Start Again"
                  : isVideoInterview
                    ? "Start Video Interview"
                    : "Call"}
            </span>
          </button>
        ) : (
          <button
            className="btn-disconnect"
            onClick={handleCallClick}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport
              ? "Generating..."
              : isVideoInterview
                ? "End Video Interview"
                : "End"}
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
