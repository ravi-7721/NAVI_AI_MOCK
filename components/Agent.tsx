"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  onerror: (() => void) | null;
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

const INTRO_QUESTION = "Tell me about yourself and your background.";
const SILENCE_TIMEOUT_MS = 1700;
const HAS_VAPI_TOKEN = Boolean(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);

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
          "You are a silent recruiter voice assistant inside a controlled interview UI. Never ask your own questions, never continue the interview on your own, and never answer unless the client explicitly sends a say command. Stay silent while the candidate is speaking.",
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
  "live-coding": [
    "This round uses the dedicated live coding workspace instead of the voice interview flow.",
  ],
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

const getVapiErrorMeta = (error: unknown) => {
  if (typeof error === "string") {
    return { type: "", message: error };
  }

  if (!error || typeof error !== "object") {
    return { type: "", message: "Unknown Vapi error" };
  }

  const record = error as {
    type?: string;
    error?: {
      message?: string;
      msg?: string;
      type?: string;
      errorMsg?: string;
    };
    message?: {
      msg?: string;
      type?: string;
    };
  };

  return {
    type: String(record.type || record.error?.type || record.message?.type || ""),
    message: String(
      record.error?.message ||
        record.error?.msg ||
        record.error?.errorMsg ||
        record.message?.msg ||
        "Unknown Vapi error",
    ),
  };
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
  const [voiceProvider, setVoiceProvider] = React.useState<"vapi" | "browser">(
    HAS_VAPI_TOKEN ? "vapi" : "browser",
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
  const [isListening, setIsListening] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = React.useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = React.useState(false);
  const [resolvedInterviewId, setResolvedInterviewId] = React.useState<
    string | undefined
  >(interviewId);
  const [startedAt, setStartedAt] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const spokenTextRef = React.useRef("");
  const isSubmittingRef = React.useRef(false);
  const autoSubmitFromSpeechRef = React.useRef<(answer: string) => void>(() => {});
  const startListeningRef = React.useRef<() => void>(() => {});
  const silenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualStopRef = React.useRef(false);
  const shouldAutoSubmitOnEndRef = React.useRef(false);
  const autoStartTriggeredRef = React.useRef(false);
  const preSpokenQuestionIndexRef = React.useRef<number | null>(null);
  const callStatusRef = React.useRef<CallStatus>(CallStatus.INACTIVE);
  const currentQuestionIndexRef = React.useRef(-1);
  const currentPromptRef = React.useRef("");
  const voiceProviderRef = React.useRef<"vapi" | "browser">(
    HAS_VAPI_TOKEN ? "vapi" : "browser",
  );
  const pendingSpeechRef = React.useRef<string | null>(null);
  const lastFinalTranscriptRef = React.useRef<{
    questionIndex: number;
    transcript: string;
  } | null>(null);
  const lastSpokenQuestionIndexRef = React.useRef<number | null>(null);
  const isSpeaking = assistantSpeaking;

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
    callStatusRef.current = callStatus;
  }, [callStatus]);

  React.useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  React.useEffect(() => {
    currentPromptRef.current = currentPrompt;
  }, [currentPrompt]);

  const clearSilenceTimer = React.useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = React.useCallback(() => {
    manualStopRef.current = true;
    shouldAutoSubmitOnEndRef.current = false;
    clearSilenceTimer();

    if (voiceProviderRef.current === "vapi") {
      setIsListening(false);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearSilenceTimer]);

  const speakText = React.useCallback((text: string, onDone: () => void) => {
    if (voiceProviderRef.current === "vapi") {
      if (callStatusRef.current !== CallStatus.ACTIVE) {
        pendingSpeechRef.current = text;
        window.setTimeout(onDone, 50);
        return;
      }

      try {
        pendingSpeechRef.current = null;
        vapi.say(text);
      } catch (error) {
        console.error(error);
      }

      window.setTimeout(onDone, 50);
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      onDone();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = onDone;
    utterance.onerror = onDone;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = React.useCallback(() => {
    if (voiceProviderRef.current === "vapi") {
      setIsListening(true);
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSpeechSupported(false);
      return;
    }

    stopListening();
    manualStopRef.current = false;
    shouldAutoSubmitOnEndRef.current = false;
    clearSilenceTimer();

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
      spokenTextRef.current = finalText;
      setCurrentAnswer(finalText);

      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        shouldAutoSubmitOnEndRef.current = true;
        recognition.stop();
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      clearSilenceTimer();
      const finalSpoken = (spokenTextRef.current || "").trim();
      setCurrentAnswer((prev) => (finalSpoken || prev || "").trim());
      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      if (shouldAutoSubmitOnEndRef.current && finalSpoken) {
        shouldAutoSubmitOnEndRef.current = false;

        // In question-answer mode, only submit if this looks like a real answer.
        if (
          currentQuestionIndexRef.current >= 0 &&
          !isValidInterviewAnswer(finalSpoken, currentPromptRef.current)
        ) {
          spokenTextRef.current = "";
          setCurrentAnswer("");
          if (callStatus === CallStatus.ACTIVE && !isGeneratingReport && !isInterviewCompleted) {
            setTimeout(() => {
              startListeningRef.current();
            }, 150);
          }
          return;
        }

        autoSubmitFromSpeechRef.current(finalSpoken);
        return;
      }

      if (callStatus === CallStatus.ACTIVE && !isGeneratingReport && !isInterviewCompleted) {
        setTimeout(() => {
          startListeningRef.current();
        }, 150);
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [
    callStatus,
    clearSilenceTimer,
    currentPrompt,
    currentQuestionIndex,
    isGeneratingReport,
    isInterviewCompleted,
    stopListening,
  ]);

  React.useEffect(() => {
    if (!HAS_VAPI_TOKEN) return;

    const handleCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      setIsListening(true);

      if (pendingSpeechRef.current) {
        const queuedPrompt = pendingSpeechRef.current;
        pendingSpeechRef.current = null;
        vapi.say(queuedPrompt);
      }
    };

    const handleCallEnd = () => {
      setAssistantSpeaking(false);
      setIsListening(false);
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

        autoSubmitFromSpeechRef.current(finalTranscript);
      }
    };

    const handleError = (error: unknown) => {
      const { message: errorMessage } = getVapiErrorMeta(error);

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
        void vapi.stop().catch(() => {});

        if (callStatusRef.current === CallStatus.CONNECTING) {
          setCallStatus(CallStatus.ACTIVE);
        }

        toast.error("Voice connection dropped. Switched to local voice mode.");
        return;
      }

      toast.error(`Voice agent failed: ${errorMessage}`);
      setCallStatus(CallStatus.INACTIVE);
      setIsListening(false);
      setAssistantSpeaking(false);
    };

    const handleCallStartFailed = (event: {
      error?: string;
      stage?: string;
    }) => {
      const stage = event?.stage ? `${event.stage}: ` : "";
      toast.error(`Voice start failed. ${stage}${event?.error || "Unknown error"}`);
      setCallStatus(CallStatus.INACTIVE);
      setIsListening(false);
      setAssistantSpeaking(false);
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);
    vapi.on("call-start-failed", handleCallStartFailed);

    return () => {
      vapi.removeListener("call-start", handleCallStart);
      vapi.removeListener("call-end", handleCallEnd);
      vapi.removeListener("speech-start", handleSpeechStart);
      vapi.removeListener("speech-end", handleSpeechEnd);
      vapi.removeListener("message", handleMessage);
      vapi.removeListener("error", handleError);
      vapi.removeListener("call-start-failed", handleCallStartFailed);
      void vapi.stop();
    };
  }, [setVoiceProviderMode]);

  React.useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const startVoiceAgentCall = React.useCallback(async () => {
    if (!HAS_VAPI_TOKEN || voiceProviderRef.current !== "vapi") return true;

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
      setCallStatus(CallStatus.INACTIVE);
      return false;
    }
  }, [setVoiceProviderMode]);

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

      targetLog[index] = {
        ...targetLog[index],
        answer: answer.trim() || "(No answer)",
        answeredAt: new Date().toISOString(),
      };

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
          setCallStatus(CallStatus.FINISHED);
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
          setCallStatus(CallStatus.FINISHED);
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

        setCallStatus(CallStatus.FINISHED);
        router.push(`/interview/${idToUse}/feedback`);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate report. Please try again.");
        setCallStatus(CallStatus.FINISHED);
      } finally {
        setIsGeneratingReport(false);
      }
    },
    [effectiveRoundType, feedbackId, resolvedInterviewId, router, startedAt, userId],
  );

  const handleListenAgain = React.useCallback(() => {
    if (!currentPrompt) {
      startListening();
      return;
    }

    speakText(currentPrompt, startListening);
  }, [currentPrompt, speakText, startListening]);

  const endInterviewAndGenerateReport = React.useCallback(async () => {
    stopListening();
    if (voiceProviderRef.current === "vapi") {
      await vapi.stop();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const withCurrent = commitAnswer(currentAnswer, currentQuestionIndex);
    setQaLog(withCurrent);
    await generateAndNavigateReport(withCurrent);
  }, [
    commitAnswer,
    currentAnswer,
    currentQuestionIndex,
    generateAndNavigateReport,
    stopListening,
  ]);

  const handleSubmitAnswer = React.useCallback(async (overrideAnswer?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const answerText =
      (typeof overrideAnswer === "string" ? overrideAnswer : currentAnswer).trim();

    try {
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
          const interviewMeta = inferInterviewMeta(selected);
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
            askedAt: now,
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
        return;
      }

      const activeQuestion = sessionQuestions[currentQuestionIndex];
      const updated = commitAnswer(answerText, currentQuestionIndex);
      setQaLog(updated);
      setCurrentAnswer("");
      stopListening();
      let insertedFollowUp = false;

      if (activeQuestion && resolvedInterviewId && userId) {
        const coaching = await analyzeInterviewAnswer({
          interviewId: resolvedInterviewId,
          userId,
          questionId: activeQuestion.id,
          question: activeQuestion.question,
          answer: answerText || "(No answer)",
          roundType: effectiveRoundType,
        });

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
              askedAt: new Date().toISOString(),
              answeredAt: "",
              wasFollowUp: true,
              followUpToQuestionId: activeQuestion.id,
            });
            return next;
          });
        }
      }

      const effectiveQuestionCount = sessionQuestions.length + (insertedFollowUp ? 1 : 0);
      const isLast = currentQuestionIndex >= effectiveQuestionCount - 1;
      if (isLast) {
        const completionMessage =
          "Your interview is completed. You can end your call now to generate your report.";
        setIsInterviewCompleted(true);
        setCurrentPrompt(completionMessage);
        speakText(completionMessage, startListening);
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
      resolvedInterviewId,
      safeQuestions,
      sessionQuestions,
      speakText,
      startListening,
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
    speakText(question.question, startListening);
  }, [
    callStatus,
    currentQuestionIndex,
    sessionQuestions,
    speakText,
    startListening,
  ]);

  React.useEffect(() => {
    if (callStatus !== CallStatus.INACTIVE) return;

    stopListening();
    if (HAS_VAPI_TOKEN) {
      void vapi.stop();
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSessionQuestions([]);
    setQaLog([]);
    setLatestCoaching(null);
    setCurrentPrompt("");
    setCurrentAnswer("");
    setCurrentQuestionIndex(-1);
    setIsInterviewCompleted(false);
    setResolvedInterviewId(interviewId);
    setStartedAt(null);
    pendingSpeechRef.current = null;
    lastFinalTranscriptRef.current = null;
    lastSpokenQuestionIndexRef.current = null;
    clearSilenceTimer();
    manualStopRef.current = false;
    shouldAutoSubmitOnEndRef.current = false;
    spokenTextRef.current = "";
  }, [callStatus, clearSilenceTimer, interviewId, stopListening]);

  const startInterview = async () => {
    setCallStatus(CallStatus.CONNECTING);
    const voiceAgentReady = await startVoiceAgentCall();
    if (!voiceAgentReady) return;

    if (safeQuestions.length > 0) {
      const seededQuestions = buildQuestionItems(safeQuestions);
      const now = new Date().toISOString();

      setSessionQuestions(seededQuestions);
      setQaLog(
        seededQuestions.map((item) => ({
          id: item.id,
          question: item.question,
          answer: "",
          askedAt: now,
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

      const firstQuestion = seededQuestions[0]?.question;
      if (firstQuestion) {
        preSpokenQuestionIndexRef.current = 0;
        lastSpokenQuestionIndexRef.current = 0;
        setCurrentPrompt(firstQuestion);
        setCurrentAnswer("");
        spokenTextRef.current = "";
        speakText(firstQuestion, startListening);
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
    speakText(countPrompt, startListening);
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
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  React.useEffect(() => {
    if (!autoStart) return;
    if (autoStartTriggeredRef.current) return;
    if (callStatus !== CallStatus.INACTIVE) return;
    if (safeQuestions.length === 0) return;

    autoStartTriggeredRef.current = true;
    startInterview();
  }, [autoStart, callStatus, safeQuestions.length]);

  return (
    <>
      <div className="call-view">
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
            {effectiveRoundType.replace("-", " ")} round
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
      </div>

      {(currentPrompt || callStatus === CallStatus.CONNECTING) && (
        <div className="transcript-border">
          <div className="transcript flex-col items-stretch">
            <p className="font-semibold text-left">
              {callStatus === CallStatus.CONNECTING ? "Connecting..." : currentPrompt}
            </p>

            {callStatus === CallStatus.ACTIVE && (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
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
                  className="w-full rounded-md bg-dark-200 border border-dark-300 px-3 py-2 text-white"
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
                    Click <strong>End</strong> to generate your report.
                  </p>
                )}
              </div>
            )}

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
              </div>
            ) : null}

            {!speechSupported && (
              <p className="mt-2 text-sm text-red-300">
                Voice input is not supported in this browser. Typing still works.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className="relative btn-call"
            onClick={handleCallClick}
            disabled={isGeneratingReport}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden",
              )}
            />
            <span className="relative">
              {isGeneratingReport
                ? "Generating Report..."
                : callStatus === CallStatus.FINISHED
                  ? "Start Again"
                  : "Call"}
            </span>
          </button>
        ) : (
          <button
            className="btn-disconnect"
            onClick={handleCallClick}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport ? "Generating..." : "End"}
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
