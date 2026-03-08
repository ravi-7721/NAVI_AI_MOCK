"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn, getFallbackInterviewRoleBySeed } from "@/lib/utils";
import {
  createFeedback,
  createInterviewSession,
} from "@/lib/actions/general.action";

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

  let role = getFallbackInterviewRoleBySeed(selectedQuestions.join("|"));
  if (hasJava && (hasFrontend || hasBackend)) role = "Full Stack Java Developer";
  else if (hasPython && (hasFrontend || hasBackend))
    role = "Full Stack Python Developer";
  else if (hasDotnet && (hasFrontend || hasBackend))
    role = "Full Stack .NET Developer";
  else if (hasJava) role = "Java Developer";
  else if (hasPython) role = "Python Developer";
  else if (hasDotnet) role = ".NET Developer";
  else if (hasFrontend && hasBackend) role = "Full Stack Developer";

  const techstack: string[] = [];
  if (hasJava) techstack.push("Java", "Spring Boot");
  if (hasPython) techstack.push("Python", "Django");
  if (hasDotnet) techstack.push("C#", ".NET");
  if (hasFrontend) techstack.push("React", "TypeScript");
  if (hasBackend) techstack.push("Node.js", "SQL");
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

const Agent = ({
  userName,
  profileImage: _profileImage,
  userId,
  interviewId,
  feedbackId,
  type: _type,
  questions,
}: AgentProps) => {
  void [_profileImage, _type];

  const router = useRouter();
  const safeQuestions = React.useMemo(() => questions ?? [], [questions]);

  const [callStatus, setCallStatus] = React.useState<CallStatus>(
    CallStatus.INACTIVE,
  );
  const [sessionQuestions, setSessionQuestions] = React.useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(-1);
  const [currentPrompt, setCurrentPrompt] = React.useState("");
  const [currentAnswer, setCurrentAnswer] = React.useState("");
  const [qaLog, setQaLog] = React.useState<{ question: string; answer: string }[]>(
    [],
  );
  const [isListening, setIsListening] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = React.useState(false);
  const [resolvedInterviewId, setResolvedInterviewId] = React.useState<
    string | undefined
  >(interviewId);

  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const spokenTextRef = React.useRef("");
  const isSubmittingRef = React.useRef(false);
  const autoSubmitFromSpeechRef = React.useRef<(answer: string) => void>(() => {});
  const startListeningRef = React.useRef<() => void>(() => {});
  const silenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualStopRef = React.useRef(false);
  const shouldAutoSubmitOnEndRef = React.useRef(false);
  const isSpeaking = callStatus === CallStatus.ACTIVE;

  React.useEffect(() => {
    setSpeechSupported(!!getRecognitionCtor());
  }, []);

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

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearSilenceTimer]);

  const speakText = React.useCallback((text: string, onDone: () => void) => {
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
    isGeneratingReport,
    isInterviewCompleted,
    stopListening,
  ]);

  React.useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const commitAnswer = React.useCallback(
    (answer: string, index: number, baseLog?: { question: string; answer: string }[]) => {
      const targetLog = baseLog ? [...baseLog] : [...qaLog];
      if (!targetLog[index]) return targetLog;

      targetLog[index] = {
        ...targetLog[index],
        answer: answer.trim() || "(No answer)",
      };

      return targetLog;
    },
    [qaLog],
  );

  const generateAndNavigateReport = React.useCallback(
    async (finalLog: { question: string; answer: string }[]) => {
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
    [feedbackId, resolvedInterviewId, router, userId],
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
    if (typeof window !== "undefined" && window.speechSynthesis) {
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
      const bank = safeQuestions.length > 0 ? safeQuestions : [...DEFAULT_QUESTION_BANK];
      const uniqueBank = [...new Set(bank.map((q) => q.trim()).filter(Boolean))];
      const remainingQuestions = uniqueBank.filter(
        (q) => q.toLowerCase() !== INTRO_QUESTION.toLowerCase(),
      );
      const orderedBank = [INTRO_QUESTION, ...shuffle(remainingQuestions)];
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
        });

        if (created.success) {
          setResolvedInterviewId(created.interviewId);
        } else {
          toast.error("Failed to create interview session.");
          return;
        }
      }

      setSessionQuestions(selected);
      setQaLog(selected.map((question) => ({ question, answer: "" })));
      setCurrentAnswer("");
      setCurrentQuestionIndex(0);
      setIsInterviewCompleted(false);
      return;
    }

    const updated = commitAnswer(answerText, currentQuestionIndex);
    setQaLog(updated);
    setCurrentAnswer("");
    stopListening();

    const isLast = currentQuestionIndex >= sessionQuestions.length - 1;
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
    commitAnswer,
    currentAnswer,
    currentQuestionIndex,
    safeQuestions,
    sessionQuestions.length,
    speakText,
    startListening,
    stopListening,
    interviewId,
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

    const question = sessionQuestions[currentQuestionIndex];
    setCurrentPrompt(question);
    setCurrentAnswer("");
    spokenTextRef.current = "";
    speakText(question, startListening);
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
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSessionQuestions([]);
    setQaLog([]);
    setCurrentPrompt("");
    setCurrentAnswer("");
    setCurrentQuestionIndex(-1);
    setIsInterviewCompleted(false);
    setResolvedInterviewId(interviewId);
    clearSilenceTimer();
    manualStopRef.current = false;
    shouldAutoSubmitOnEndRef.current = false;
    spokenTextRef.current = "";
  }, [callStatus, clearSilenceTimer, interviewId, stopListening]);

  const startInterview = () => {
    const countPrompt = "How many questions do you want for this interview?";

    setSessionQuestions([]);
    setQaLog([]);
    setCurrentPrompt(countPrompt);
    setCurrentAnswer("");
    setCurrentQuestionIndex(-1);
    setCallStatus(CallStatus.CONNECTING);

    setTimeout(() => {
      setCallStatus(CallStatus.ACTIVE);
      speakText(countPrompt, startListening);
    }, 700);
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleSubmitAnswer();
                    }}
                    className="btn-primary"
                    disabled={isGeneratingReport}
                  >
                    {currentQuestionIndex === -1
                      ? "Set Question Count"
                      : "Submit Answer"}
                  </button>
                  <button
                    type="button"
                    onClick={handleListenAgain}
                    className="btn-secondary"
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
