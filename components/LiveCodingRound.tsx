"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  buildCodingChallengeSignature,
  CODING_LANGUAGE_OPTIONS,
  getChallengeEntryPoint,
  getCodingLanguageLabel,
  getCodingTechstack,
  getStarterCode,
  isLanguageSupportedForChallenge,
  LIVE_CODING_CHALLENGES,
  pickCodingChallenges,
} from "@/constants/liveCoding";
import {
  analyzeInterviewAnswer,
  createFeedback,
  createInterviewSession,
  recordInterviewCompletion,
  runLiveCodingChecks,
} from "@/lib/actions/general.action";
import { cn } from "@/lib/utils";

const DEFAULT_CHALLENGE_COUNT = 2;
const MAX_CHALLENGE_COUNT = 4;
const EMPTY_CODING_CHALLENGES: CodingChallenge[] = [];

type SelectionMode = "smart" | "custom";

type CodingDraft = {
  code: string;
  explanation: string;
  lastResult: CodingExecutionSummary | null;
  coaching: AnswerCoaching | null;
  submitted: boolean;
  askedAt: string;
  answeredAt: string;
};

const getSignatureStorageKey = (language: CodingLanguage, count: number) =>
  `live-coding:last-signature:${language}:${count}`;

const buildDrafts = (challenges: CodingChallenge[], language: CodingLanguage) => {
  const now = new Date().toISOString();

  return challenges.reduce<Record<string, CodingDraft>>((accumulator, challenge) => {
    accumulator[challenge.id] = {
      code: getStarterCode(challenge, language),
      explanation: "",
      lastResult: null,
      coaching: null,
      submitted: false,
      askedAt: now,
      answeredAt: "",
    };

    return accumulator;
  }, {});
};

const buildCodingAnswerSummary = (
  challenge: CodingChallenge,
  draft: CodingDraft,
  language: CodingLanguage,
) => {
  const result = draft.lastResult;
  const checkSummary = result
    ? `Passed ${result.passedChecks}/${result.totalChecks} checks.\n${result.checkResults
        .map((check) => `${check.passed ? "PASS" : "FAIL"}: ${check.title} - ${check.details}`)
        .join("\n")}`
    : "Checks not run yet.";

  return [
    `Challenge: ${challenge.title}`,
    `Language: ${getCodingLanguageLabel(language)}`,
    `Entry point: ${getChallengeEntryPoint(challenge, language)}`,
    challenge.prompt,
    checkSummary,
    `Explanation:\n${draft.explanation.trim() || "(No explanation provided)"}`,
    `Code:\n${draft.code.trim() || "(No code provided)"}`,
  ].join("\n\n");
};

const LiveCodingRound = ({
  userName,
  userId,
  interviewId,
  challenges,
  autoStart = false,
  initialLanguage = "javascript",
}: LiveCodingRoundProps) => {
  const router = useRouter();
  const incomingChallenges = Array.isArray(challenges) ? challenges : EMPTY_CODING_CHALLENGES;
  const challengeSyncKey = `${interviewId || "new"}::${incomingChallenges
    .map((challenge) => challenge.id)
    .join("|")}`;
  const stableIncomingChallenges = React.useMemo(
    () => incomingChallenges,
    [challengeSyncKey],
  );
  const hasExistingSession = Boolean(interviewId && stableIncomingChallenges.length > 0);

  const [selectedLanguage, setSelectedLanguage] =
    React.useState<CodingLanguage>(initialLanguage);
  const [challengeCount, setChallengeCount] = React.useState(
    Math.max(
      1,
      Math.min(stableIncomingChallenges.length || DEFAULT_CHALLENGE_COUNT, MAX_CHALLENGE_COUNT),
    ),
  );
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>(
    hasExistingSession ? "custom" : "smart",
  );
  const [customChallengeIds, setCustomChallengeIds] = React.useState<string[]>(
    stableIncomingChallenges.map((challenge) => challenge.id),
  );
  const [randomPreviewIds, setRandomPreviewIds] = React.useState<string[]>(
    stableIncomingChallenges.map((challenge) => challenge.id),
  );
  const [sessionChallenges, setSessionChallenges] =
    React.useState<CodingChallenge[]>(stableIncomingChallenges);
  const [drafts, setDrafts] = React.useState<Record<string, CodingDraft>>(
    buildDrafts(stableIncomingChallenges, initialLanguage),
  );
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [roundStarted, setRoundStarted] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isRunningChecks, setIsRunningChecks] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [resolvedInterviewId, setResolvedInterviewId] = React.useState<string | undefined>(
    interviewId,
  );
  const [startedAt, setStartedAt] = React.useState<string | null>(null);

  const availableChallenges = React.useMemo(
    () =>
      LIVE_CODING_CHALLENGES.filter((challenge) =>
        isLanguageSupportedForChallenge(challenge, selectedLanguage),
      ),
    [selectedLanguage],
  );
  const availableChallengeMap = React.useMemo(
    () => new Map(availableChallenges.map((challenge) => [challenge.id, challenge])),
    [availableChallenges],
  );
  const maxSelectableCount = Math.max(
    1,
    Math.min(MAX_CHALLENGE_COUNT, availableChallenges.length || DEFAULT_CHALLENGE_COUNT),
  );
  const countOptions = React.useMemo(
    () => Array.from({ length: maxSelectableCount }, (_, index) => index + 1),
    [maxSelectableCount],
  );

  React.useEffect(() => {
    const nextLanguage = initialLanguage || "javascript";
    const nextCount = Math.max(
      1,
      Math.min(stableIncomingChallenges.length || DEFAULT_CHALLENGE_COUNT, MAX_CHALLENGE_COUNT),
    );
    const nextIds = stableIncomingChallenges.map((challenge) => challenge.id);

    setSelectedLanguage(nextLanguage);
    setChallengeCount(nextCount);
    setSelectionMode(stableIncomingChallenges.length > 0 ? "custom" : "smart");
    setCustomChallengeIds(nextIds);
    setRandomPreviewIds(nextIds);
    setSessionChallenges(stableIncomingChallenges);
    setDrafts(buildDrafts(stableIncomingChallenges, nextLanguage));
    setCurrentIndex(0);
    setRoundStarted(false);
    setResolvedInterviewId(interviewId);
    setStartedAt(null);
  }, [challengeSyncKey, initialLanguage, interviewId, stableIncomingChallenges]);

  React.useEffect(() => {
    setChallengeCount((previous) => Math.max(1, Math.min(previous, maxSelectableCount)));
  }, [maxSelectableCount]);

  React.useEffect(() => {
    if (hasExistingSession || selectionMode !== "smart") return;

    const storageKey = getSignatureStorageKey(selectedLanguage, challengeCount);
    const previousSignature =
      typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey) : null;
    const nextPreview = pickCodingChallenges({
      count: challengeCount,
      pool: availableChallenges,
      previousSignature,
    });

    setRandomPreviewIds(nextPreview.map((challenge) => challenge.id));

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        storageKey,
        buildCodingChallengeSignature(nextPreview),
      );
    }
  }, [availableChallenges, challengeCount, hasExistingSession, selectedLanguage, selectionMode]);

  React.useEffect(() => {
    if (hasExistingSession) return;

    setCustomChallengeIds((previous) =>
      previous.filter((id) => availableChallengeMap.has(id)).slice(0, challengeCount),
    );
  }, [availableChallengeMap, challengeCount, hasExistingSession]);

  const randomPreviewChallenges = React.useMemo(
    () =>
      randomPreviewIds
        .map((id) => availableChallengeMap.get(id))
        .filter(Boolean) as CodingChallenge[],
    [availableChallengeMap, randomPreviewIds],
  );

  const customSelectedChallenges = React.useMemo(
    () =>
      customChallengeIds
        .map((id) => availableChallengeMap.get(id))
        .filter(Boolean)
        .slice(0, challengeCount) as CodingChallenge[],
    [availableChallengeMap, challengeCount, customChallengeIds],
  );

  const setupChallenges = hasExistingSession
    ? sessionChallenges
    : selectionMode === "custom"
      ? customSelectedChallenges
      : randomPreviewChallenges;

  const completedCount = sessionChallenges.filter((challenge) => drafts[challenge.id]?.submitted)
    .length;
  const readyToFinish =
    sessionChallenges.length > 0 && completedCount === sessionChallenges.length;
  const currentChallenge = sessionChallenges[currentIndex];
  const currentDraft = currentChallenge ? drafts[currentChallenge.id] : null;
  const resultIsStale =
    Boolean(currentDraft?.lastResult) && currentDraft?.lastResult?.code !== currentDraft?.code;
  const isSetupReady =
    setupChallenges.length === Math.min(challengeCount, availableChallenges.length) &&
    (selectionMode !== "custom" || customChallengeIds.length === challengeCount);
  const totalEstimatedMinutes = setupChallenges.reduce(
    (sum, challenge) => sum + challenge.estimatedMinutes,
    0,
  );

  const updateDraft = React.useCallback(
    (challengeId: string, patch: Partial<CodingDraft>) => {
      setDrafts((previous) => ({
        ...previous,
        [challengeId]: {
          ...previous[challengeId],
          ...patch,
        },
      }));
    },
    [],
  );

  const regenerateRandomPreview = React.useCallback(() => {
    const previousSignature = buildCodingChallengeSignature(randomPreviewChallenges);
    const nextPreview = pickCodingChallenges({
      count: challengeCount,
      pool: availableChallenges,
      previousSignature,
    });

    setRandomPreviewIds(nextPreview.map((challenge) => challenge.id));

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        getSignatureStorageKey(selectedLanguage, challengeCount),
        buildCodingChallengeSignature(nextPreview),
      );
    }
  }, [availableChallenges, challengeCount, randomPreviewChallenges, selectedLanguage]);

  const toggleChallengeSelection = React.useCallback(
    (challengeId: string) => {
      if (hasExistingSession) return;

      setCustomChallengeIds((previous) => {
        if (previous.includes(challengeId)) {
          return previous.filter((id) => id !== challengeId);
        }

        if (previous.length >= challengeCount) {
          toast.error(`Select ${challengeCount} challenge${challengeCount > 1 ? "s" : ""} max.`);
          return previous;
        }

        return [...previous, challengeId];
      });
    },
    [challengeCount, hasExistingSession],
  );

  const handleSelectionModeChange = React.useCallback(
    (mode: SelectionMode) => {
      if (hasExistingSession) return;

      setSelectionMode(mode);

      if (mode === "custom") {
        setCustomChallengeIds((previous) => {
          if (previous.length > 0) return previous.slice(0, challengeCount);
          return randomPreviewIds.slice(0, challengeCount);
        });
      }
    },
    [challengeCount, hasExistingSession, randomPreviewIds],
  );

  const ensureInterviewSession = React.useCallback(
    async (nextChallenges: CodingChallenge[]) => {
      if (resolvedInterviewId) return resolvedInterviewId;
      if (!userId) {
        toast.error("You need to be signed in to start a coding round.");
        return null;
      }

      const created = await createInterviewSession({
        userId,
        questions: nextChallenges.map((challenge) => challenge.title),
        role: `Software Engineer Live Coding (${getCodingLanguageLabel(selectedLanguage)})`,
        type: "Technical",
        level: "Mid",
        techstack: getCodingTechstack(selectedLanguage),
        roundType: "live-coding",
        codingLanguage: selectedLanguage,
        codingChallenges: nextChallenges,
      });

      if (!created.success) {
        toast.error("Could not create the live coding session.");
        return null;
      }

      setResolvedInterviewId(created.interviewId);
      return created.interviewId;
    },
    [resolvedInterviewId, selectedLanguage, userId],
  );

  const handleStartRound = React.useCallback(async () => {
    if (!hasExistingSession && !isSetupReady) {
      toast.error("Finish your setup before starting the coding round.");
      return;
    }

    const nextChallenges = sessionChallenges.length > 0 ? sessionChallenges : setupChallenges;
    if (nextChallenges.length === 0) {
      toast.error("No coding challenges are available for this setup.");
      return;
    }

    setIsStarting(true);

    try {
      if (sessionChallenges.length === 0) {
        setSessionChallenges(nextChallenges);
        setDrafts(buildDrafts(nextChallenges, selectedLanguage));
      }

      const sessionId = await ensureInterviewSession(nextChallenges);
      if (!sessionId) return;

      setStartedAt((existing) => existing || new Date().toISOString());
      setRoundStarted(true);
    } finally {
      setIsStarting(false);
    }
  }, [
    ensureInterviewSession,
    hasExistingSession,
    isSetupReady,
    selectedLanguage,
    sessionChallenges,
    setupChallenges,
  ]);

  const handleRunChecks = React.useCallback(async () => {
    if (!currentChallenge || !currentDraft) return;

    setIsRunningChecks(true);

    try {
      const result = await runLiveCodingChecks({
        challenge: currentChallenge,
        language: selectedLanguage,
        code: currentDraft.code,
        explanation: currentDraft.explanation,
      });

      updateDraft(currentChallenge.id, {
        lastResult: result,
      });

      if (result.passedChecks === result.totalChecks) {
        toast.success("All checks passed.");
      } else {
        toast.error(`Passed ${result.passedChecks}/${result.totalChecks} checks.`);
      }
    } finally {
      setIsRunningChecks(false);
    }
  }, [currentChallenge, currentDraft, selectedLanguage, updateDraft]);

  const handleSubmitChallenge = React.useCallback(async () => {
    if (!currentChallenge || !currentDraft) return;
    if (!resolvedInterviewId || !userId) {
      toast.error("Missing interview session details. Restart the coding round.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        currentDraft.lastResult &&
        currentDraft.lastResult.code === currentDraft.code &&
        currentDraft.lastResult.language === selectedLanguage
          ? currentDraft.lastResult
          : await runLiveCodingChecks({
              challenge: currentChallenge,
              language: selectedLanguage,
              code: currentDraft.code,
              explanation: currentDraft.explanation,
            });

      const answeredAt = new Date().toISOString();
      const summary = buildCodingAnswerSummary(
        currentChallenge,
        {
          ...currentDraft,
          lastResult: result,
        },
        selectedLanguage,
      );

      const coaching = await analyzeInterviewAnswer({
        interviewId: resolvedInterviewId,
        userId,
        questionId: currentChallenge.id,
        question: `${currentChallenge.title}\n${currentChallenge.prompt}`,
        answer: summary,
        roundType: "live-coding",
      });

      updateDraft(currentChallenge.id, {
        lastResult: result,
        coaching,
        submitted: true,
        answeredAt,
      });

      const isLastChallenge = currentIndex >= sessionChallenges.length - 1;
      if (!isLastChallenge) {
        setCurrentIndex((previous) => previous + 1);
        toast.success("Challenge submitted. Move to the next one.");
      } else {
        toast.success("All challenges submitted. Generate your report.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentChallenge,
    currentDraft,
    currentIndex,
    resolvedInterviewId,
    selectedLanguage,
    sessionChallenges.length,
    updateDraft,
    userId,
  ]);

  const handleGenerateReport = React.useCallback(async () => {
    if (!readyToFinish || !resolvedInterviewId || !userId) {
      toast.error("Submit every coding challenge before generating the report.");
      return;
    }

    setIsGeneratingReport(true);

    try {
      const finalLog: ReplayQuestionEntry[] = sessionChallenges.map((challenge) => {
        const draft = drafts[challenge.id];
        const result =
          draft.lastResult ||
          ({
            language: selectedLanguage,
            code: draft.code,
            explanation: draft.explanation,
            passedChecks: 0,
            totalChecks: challenge.testCases.length,
            checkResults: [],
          } as CodingExecutionSummary);

        return {
          id: challenge.id,
          question: `${challenge.title}: ${challenge.prompt}`,
          answer: buildCodingAnswerSummary(
            challenge,
            {
              ...draft,
              lastResult: result,
            },
            selectedLanguage,
          ),
          askedAt: draft.askedAt,
          answeredAt: draft.answeredAt || new Date().toISOString(),
          wasFollowUp: false,
          followUpToQuestionId: null,
          codingSummary: result,
        };
      });

      const transcript = sessionChallenges.flatMap((challenge) => {
        const draft = drafts[challenge.id];

        return [
          {
            role: "assistant",
            content: [
              challenge.title,
              challenge.prompt,
              `Language: ${getCodingLanguageLabel(selectedLanguage)}`,
              `Focus: ${challenge.evaluationFocus.join(", ")}`,
            ].join("\n"),
          },
          {
            role: "user",
            content: buildCodingAnswerSummary(challenge, draft, selectedLanguage),
          },
        ];
      });

      const feedback = await createFeedback({
        interviewId: resolvedInterviewId,
        userId,
        transcript,
      });

      if (!feedback.success) {
        toast.error(feedback.error || "Could not generate the coding report.");
        return;
      }

      await recordInterviewCompletion({
        interviewId: resolvedInterviewId,
        userId,
        roundType: "live-coding",
        startedAt: startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        qaLog: finalLog,
        totalScore: feedback.totalScore,
      });

      router.push(`/interview/${resolvedInterviewId}/feedback`);
      router.refresh();
    } finally {
      setIsGeneratingReport(false);
    }
  }, [
    drafts,
    readyToFinish,
    resolvedInterviewId,
    router,
    selectedLanguage,
    sessionChallenges,
    startedAt,
    userId,
  ]);

  React.useEffect(() => {
    if (!autoStart || roundStarted || isStarting || setupChallenges.length === 0) return;
    void handleStartRound();
  }, [autoStart, handleStartRound, isStarting, roundStarted, setupChallenges.length]);

  if (!roundStarted) {
    return (
      <div className="mt-8 flex flex-col gap-6">
        <section className="card-cta !items-start !gap-5">
          <div className="max-w-3xl">
            <h2>Live Coding Round</h2>
            <p className="mt-3 text-base">
              Solve interview problems in JavaScript, Python, Java, Go, or Ruby with starter
              code, timed checks, and coding-specific feedback. Build a fresh set each round or
              customize the exact challenges yourself.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-primary-200/30 px-3 py-1 text-sm text-primary-100">
              Multi-language runner
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-light-100">
              Random + custom challenge sets
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-light-100">
              Replay + report
            </span>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="card-border w-full">
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-light-400">Setup</p>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-white">Choose your coding language</h3>
                  <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-100">
                    {getCodingLanguageLabel(selectedLanguage)} selected
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {CODING_LANGUAGE_OPTIONS.map((language) => (
                    <button
                      key={language.id}
                      type="button"
                      onClick={() => {
                        if (hasExistingSession) return;
                        setSelectedLanguage(language.id);
                      }}
                      disabled={hasExistingSession}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        selectedLanguage === language.id
                          ? "border-primary-200/50 bg-primary-200/10 text-white shadow-[0_0_0_1px_rgba(199,210,254,0.18)]"
                          : "border-white/10 bg-white/5 text-light-100 hover:border-white/20",
                        hasExistingSession && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-base font-semibold">{language.label}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-1 text-[11px]",
                            selectedLanguage === language.id
                              ? "border-primary-200/40 text-primary-100"
                              : "border-white/10 text-light-400",
                          )}
                        >
                          {language.shortLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-light-400">{language.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-white">Pick your challenge count</h3>
                  <p className="text-sm text-light-400">{challengeCount} selected</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {countOptions.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        if (hasExistingSession) return;
                        setChallengeCount(count);
                      }}
                      disabled={hasExistingSession}
                      className={cn(
                        "min-w-[112px] rounded-2xl border px-4 py-3 text-left transition-all",
                        challengeCount === count
                          ? "border-primary-200/50 bg-primary-200/10 text-white shadow-[0_12px_30px_rgba(94,106,210,0.18)]"
                          : "border-white/10 bg-white/5 text-light-100 hover:border-white/20",
                        hasExistingSession && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <p className="text-sm font-semibold">
                        {count} challenge{count > 1 ? "s" : ""}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          challengeCount === count ? "text-primary-100" : "text-light-400",
                        )}
                      >
                        {challengeCount === count ? "Selected" : "Tap to use"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-white">Choose how questions are picked</h3>
                  {hasExistingSession ? (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-400">
                      Locked for resume
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "smart" as const,
                      title: "Smart random",
                      description: "Generate a fresh challenge set each time and reshuffle it.",
                    },
                    {
                      id: "custom" as const,
                      title: "Custom pick",
                      description: "Manually choose the exact challenges you want to solve.",
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleSelectionModeChange(mode.id)}
                      disabled={hasExistingSession}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        selectionMode === mode.id
                          ? "border-primary-200/50 bg-primary-200/10 text-white"
                          : "border-white/10 bg-white/5 text-light-100 hover:border-white/20",
                        hasExistingSession && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <p className="text-base font-semibold">{mode.title}</p>
                      <p className="mt-2 text-sm text-light-400">{mode.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectionMode === "smart" ? (
                <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-light-400">
                        Fresh set
                      </p>
                      <p className="mt-2 text-sm text-light-100">
                        Regenerate until you get the mix you want.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={regenerateRandomPreview}
                      disabled={hasExistingSession}
                      className="btn-secondary"
                    >
                      Regenerate Set
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-light-400">
                    Custom selection
                  </p>
                  <p className="mt-2 text-sm text-light-100">
                    Select exactly {challengeCount} challenge
                    {challengeCount > 1 ? "s" : ""}. Current selection: {customChallengeIds.length}/
                    {challengeCount}.
                  </p>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {availableChallenges.map((challenge) => {
                      const isSelected = customChallengeIds.includes(challenge.id);
                      const isLocked =
                        !isSelected && customChallengeIds.length >= challengeCount;

                      return (
                        <button
                          key={challenge.id}
                          type="button"
                          onClick={() => toggleChallengeSelection(challenge.id)}
                          disabled={hasExistingSession}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all",
                            isSelected
                              ? "border-primary-200/50 bg-primary-200/10 text-white"
                              : "border-white/10 bg-white/5 text-light-100 hover:border-white/20",
                            isLocked && "opacity-60",
                            hasExistingSession && "cursor-not-allowed opacity-70",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{challenge.title}</p>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-1 text-[11px]",
                                isSelected
                                  ? "border-primary-200/40 text-primary-100"
                                  : "border-white/10 text-light-400",
                              )}
                            >
                              {isSelected ? "Selected" : isLocked ? "Full" : "Available"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-light-400">
                            {challenge.category} · {challenge.difficulty} · {challenge.estimatedMinutes} min
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {challenge.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-light-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    void handleStartRound();
                  }}
                  className="btn-primary"
                  disabled={isStarting || !isSetupReady}
                >
                  {isStarting
                    ? "Preparing..."
                    : interviewId
                      ? "Resume Coding Round"
                      : "Start Coding Round"}
                </button>
              </div>
            </div>
          </div>

          <div className="card-border w-full">
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-light-400">Round preview</p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-light-400">Language</p>
                  <p className="mt-2 text-white">{getCodingLanguageLabel(selectedLanguage)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-light-400">Challenge count</p>
                  <p className="mt-2 text-white">
                    {setupChallenges.length}/{challengeCount} ready
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-light-400">Estimated time</p>
                  <p className="mt-2 text-white">{totalEstimatedMinutes} min total</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {setupChallenges.map((challenge, index) => (
                  <div
                    key={challenge.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-white">
                        {index + 1}. {challenge.title}
                      </p>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-400">
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-light-400">
                      {challenge.category} · {challenge.estimatedMinutes} min
                    </p>
                    <p className="mt-2 text-sm text-light-100">
                      Use `{getChallengeEntryPoint(challenge, selectedLanguage)}` for this language.
                    </p>
                  </div>
                ))}

                {setupChallenges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-light-400">
                    Pick a language and setup to preview the coding round.
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-light-400">What you get</p>
                <p className="mt-2 text-white">
                  Each challenge includes starter code, test cases, coaching after submission,
                  and stored replay/report support.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!currentChallenge || !currentDraft) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <section className="card-cta !items-start !gap-5">
        <div className="max-w-3xl">
          <h2>Live Coding Round</h2>
          <p className="mt-3 text-base">
            Candidate: <span className="font-semibold text-white">{userName}</span>. Solve each
            challenge, run checks in {getCodingLanguageLabel(selectedLanguage)}, then submit the
            final approach for coaching.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-sm text-light-400">Progress</p>
            <p className="mt-1 text-lg text-white">
              {completedCount}/{sessionChallenges.length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-sm text-light-400">Runtime</p>
            <p className="mt-1 text-lg text-white">{getCodingLanguageLabel(selectedLanguage)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-sm text-light-400">Checks</p>
            <p className="mt-1 text-lg text-white">
              {currentDraft.lastResult
                ? `${currentDraft.lastResult.passedChecks}/${currentDraft.lastResult.totalChecks}`
                : "Not run"}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {sessionChallenges.map((challenge, index) => {
          const draft = drafts[challenge.id];

          return (
            <button
              key={challenge.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                currentIndex === index
                  ? "border-primary-200/40 bg-primary-200/10 text-primary-100"
                  : "border-white/10 bg-white/5 text-light-100 hover:border-white/20",
              )}
            >
              {index + 1}. {challenge.title}
              {draft?.submitted ? " - submitted" : ""}
            </button>
          );
        })}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card-border w-full">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-100">
                Challenge {currentIndex + 1}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-100">
                {currentChallenge.category}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-100">
                {currentChallenge.difficulty}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-100">
                {currentChallenge.estimatedMinutes} min
              </span>
            </div>

            <h3 className="mt-4 text-white">{currentChallenge.title}</h3>
            <p className="mt-4 whitespace-pre-line text-light-100">{currentChallenge.prompt}</p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-light-400">Selected entry point</p>
              <p className="mt-2 text-white">
                {getChallengeEntryPoint(currentChallenge, selectedLanguage)}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {currentChallenge.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-100"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-light-400">Hints</p>
                <ul className="mt-3 space-y-2">
                  {currentChallenge.hints.map((hint) => (
                    <li key={hint} className="text-sm text-light-100">
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-light-400">Evaluation focus</p>
                <ul className="mt-3 space-y-2">
                  {currentChallenge.evaluationFocus.map((focus) => (
                    <li key={focus} className="text-sm text-light-100">
                      {focus}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-light-400">Starter code</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-primary-100">
                <code>{getStarterCode(currentChallenge, selectedLanguage)}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="card-border w-full">
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-light-400">Run checks</p>
              <div className="mt-4 grid gap-3">
                {currentChallenge.testCases.map((testCase) => {
                  const matchingResult = currentDraft.lastResult?.checkResults.find(
                    (result) => result.id === testCase.id,
                  );

                  return (
                    <div
                      key={testCase.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-white">{testCase.title}</p>
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs",
                            matchingResult
                              ? matchingResult.passed
                                ? "border-emerald-400/30 text-emerald-300"
                                : "border-red-400/30 text-red-300"
                              : "border-white/10 text-light-400",
                          )}
                        >
                          {matchingResult
                            ? matchingResult.passed
                              ? "Passed"
                              : "Failed"
                            : "Pending"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-light-400">
                        args: {JSON.stringify(testCase.args)} | expected:{" "}
                        {JSON.stringify(testCase.expected)}
                      </p>
                      {matchingResult ? (
                        <p className="mt-2 text-sm text-light-100">{matchingResult.details}</p>
                      ) : testCase.explanation ? (
                        <p className="mt-2 text-sm text-light-100">{testCase.explanation}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card-border w-full">
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-light-400">Coding coaching</p>
              {currentDraft.coaching ? (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-light-400">Overall</p>
                      <p className="mt-1 text-white">
                        {currentDraft.coaching.overallScore}/100
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-light-400">Clarity</p>
                      <p className="mt-1 text-white">{currentDraft.coaching.clarityScore}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-light-400">Relevance</p>
                      <p className="mt-1 text-white">{currentDraft.coaching.relevanceScore}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-light-400">Depth</p>
                      <p className="mt-1 text-white">{currentDraft.coaching.depthScore}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white">{currentDraft.coaching.quickTip}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-light-400">
                  Submit the current challenge to receive coding-specific coaching.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-light-400">Editor</p>
                <p className="mt-1 text-sm text-light-100">
                  {getCodingLanguageLabel(selectedLanguage)} checks run locally if the runtime is
                  available on this machine.
                </p>
              </div>
              {resultIsStale ? (
                <span className="rounded-full border border-amber-300/30 px-3 py-1 text-xs text-amber-200">
                  Checks are stale
                </span>
              ) : null}
            </div>

            <textarea
              value={currentDraft.code}
              onChange={(event) =>
                updateDraft(currentChallenge.id, {
                  code: event.target.value,
                  submitted: false,
                  coaching: null,
                })
              }
              spellCheck={false}
              className="min-h-[320px] w-full rounded-2xl border border-white/10 bg-[#05070d] px-4 py-4 font-mono text-sm text-white outline-none transition-colors focus:border-primary-200/40"
            />

            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-light-400">Approach</p>
              <textarea
                value={currentDraft.explanation}
                onChange={(event) =>
                  updateDraft(currentChallenge.id, {
                    explanation: event.target.value,
                    submitted: false,
                    coaching: null,
                  })
                }
                placeholder="Explain your reasoning, complexity, and edge cases."
                className="mt-3 min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition-colors focus:border-primary-200/40"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleRunChecks();
              }}
              className="btn-secondary"
              disabled={isRunningChecks || isSubmitting || isGeneratingReport}
            >
              {isRunningChecks ? "Running..." : "Run Checks"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSubmitChallenge();
              }}
              className="btn-primary"
              disabled={isRunningChecks || isSubmitting || isGeneratingReport}
            >
              {isSubmitting ? "Submitting..." : "Submit Challenge"}
            </button>
            {readyToFinish ? (
              <button
                type="button"
                onClick={() => {
                  void handleGenerateReport();
                }}
                className="btn-primary"
                disabled={isGeneratingReport || isRunningChecks || isSubmitting}
              >
                {isGeneratingReport ? "Generating Report..." : "Generate Report"}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveCodingRound;
