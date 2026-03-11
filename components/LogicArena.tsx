"use client";

import * as React from "react";
import { BrainCircuit, Code2, Crown, RefreshCcw, Sparkles, Timer } from "lucide-react";

import {
  LOGIC_ARENA_DIFFICULTIES,
  LOGIC_ARENA_MODES,
  LOGIC_ARENA_QUESTION_LIMITS,
  LOGIC_ARENA_STACKS,
} from "@/constants/game";
import ClassicGamesHub from "@/components/ClassicGamesHub";

type GameQuestion = {
  id: string;
  stack: string;
  difficulty: string;
  mode: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  tags: string[];
};

type GameResponse = {
  success: boolean;
  title: string;
  summary: string;
  source: "ai" | "fallback";
  questions: GameQuestion[];
};

const QUESTION_TIME_SECONDS = 35;

const formatModeLabel = (mode: string) =>
  LOGIC_ARENA_MODES.find((item) => item.id === mode)?.label || mode;

const clampCount = (value: number) =>
  Math.min(Math.max(value, LOGIC_ARENA_QUESTION_LIMITS.min), LOGIC_ARENA_QUESTION_LIMITS.max);

const LogicArena = () => {
  const [arenaView, setArenaView] = React.useState<"quiz" | "classic">("quiz");
  const [stack, setStack] = React.useState<string>("JavaScript");
  const [difficulty, setDifficulty] = React.useState<string>("Intermediate");
  const [mode, setMode] = React.useState<string>("concept-sprint");
  const [count, setCount] = React.useState<number>(10);
  const [game, setGame] = React.useState<GameResponse | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [secondsLeft, setSecondsLeft] = React.useState(QUESTION_TIME_SECONDS);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [completed, setCompleted] = React.useState(false);
  const savedSessionRef = React.useRef<string | null>(null);

  const question = game?.questions[currentIndex] ?? null;
  const progress =
    game?.questions.length ? ((currentIndex + (completed ? 1 : 0)) / game.questions.length) * 100 : 0;
  const attemptsUsed = completed
    ? game?.questions.length ?? 0
    : currentIndex + (revealed ? 1 : 0);
  const accuracy =
    attemptsUsed > 0 ? Math.round((correctCount / Math.max(1, attemptsUsed)) * 100) : 0;

  const resetRoundState = React.useCallback(() => {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setRevealed(false);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setSecondsLeft(QUESTION_TIME_SECONDS);
    setCompleted(false);
    savedSessionRef.current = null;
  }, []);

  const generateGame = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/logic-arena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stack,
          difficulty,
          mode,
          count: clampCount(count),
        }),
      });

      const data = (await response.json()) as GameResponse & { message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not generate game round.");
      }

      setGame(data);
      resetRoundState();
    } catch (err) {
      setGame(null);
      setError(err instanceof Error ? err.message : "Could not generate game round.");
    } finally {
      setLoading(false);
    }
  }, [count, difficulty, mode, resetRoundState, stack]);

  React.useEffect(() => {
    if (!game || completed || revealed) return;
    if (secondsLeft <= 0) {
      setRevealed(true);
      setSelectedIndex(null);
      setStreak(0);
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [completed, game, revealed, secondsLeft]);

  React.useEffect(() => {
    setSecondsLeft(QUESTION_TIME_SECONDS);
  }, [currentIndex, game]);

  React.useEffect(() => {
    if (!completed || !game || game.questions.length === 0) return;

    const sessionKey = [
      game.title,
      stack,
      difficulty,
      mode,
      score,
      correctCount,
      game.questions.length,
    ].join("|");

    if (savedSessionRef.current === sessionKey) return;
    savedSessionRef.current = sessionKey;

    void fetch("/api/logic-arena/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stack,
        mode,
        difficulty,
        title: game.title,
        source: game.source,
        score,
        accuracy,
        correctCount,
        questionCount: game.questions.length,
        bestStreak,
      }),
    });
  }, [
    accuracy,
    bestStreak,
    completed,
    correctCount,
    difficulty,
    game,
    mode,
    score,
    stack,
  ]);

  const handleAnswer = (index: number) => {
    if (!question || revealed) return;

    setSelectedIndex(index);
    setRevealed(true);

    if (index === question.answerIndex) {
      setCorrectCount((value) => value + 1);
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      setScore((value) => value + 100 + secondsLeft * 3);
      return;
    }

    setStreak(0);
  };

  const moveNext = () => {
    if (!game) return;

    if (currentIndex >= game.questions.length - 1) {
      setCompleted(true);
      return;
    }

    setCurrentIndex((value) => value + 1);
    setSelectedIndex(null);
    setRevealed(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.96),rgba(9,12,21,0.96))] p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setArenaView("quiz")}
            className={`rounded-[22px] border px-5 py-4 text-left transition-all ${
              arenaView === "quiz"
                ? "border-primary-200/45 bg-primary-200/12 shadow-[0_0_24px_rgba(202,197,254,0.16)]"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Code2 className="size-5 text-primary-100" />
              <h2 className="text-lg text-white">Quiz Arena</h2>
            </div>
            <p className="mt-2 text-sm text-light-400">
              AI-generated MCQ rounds by stack, difficulty, and mode.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setArenaView("classic")}
            className={`rounded-[22px] border px-5 py-4 text-left transition-all ${
              arenaView === "classic"
                ? "border-primary-200/45 bg-primary-200/12 shadow-[0_0_24px_rgba(202,197,254,0.16)]"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-primary-100" />
              <h2 className="text-lg text-white">Classic Games</h2>
            </div>
            <p className="mt-2 text-sm text-light-400">
              Sudoku, chess, crossword, and wordle with built-in tutorials.
            </p>
          </button>
        </div>
      </section>

      {arenaView === "classic" ? <ClassicGamesHub /> : null}

      {arenaView === "quiz" ? (
        <>
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(202,197,254,0.18),transparent_30%),linear-gradient(135deg,rgba(18,22,38,0.98),rgba(8,10,18,0.98))] p-6 sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)] opacity-60" />
        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.85fr]">
          <div className="flex flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-200/25 bg-primary-200/10 px-4 py-2 text-sm font-semibold text-primary-100">
              <Sparkles className="size-4" />
              Logic Arena
            </div>
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Play smart coding rounds that actually improve logic.
              </h1>
              <p className="mt-3 text-base text-light-100 sm:text-lg">
                Generate fresh MCQs by stack, difficulty, and mode. Practice concept speed,
                output prediction, and debugging in one fast competitive flow.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-light-400">Question Source</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {game?.source === "ai" ? "Fresh AI Round" : "Dynamic Practice"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-light-400">Best Streak</p>
                <p className="mt-2 text-lg font-semibold text-white">{bestStreak}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-light-400">Current Score</p>
                <p className="mt-2 text-lg font-semibold text-white">{score}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
            <div className="mb-5 flex items-center gap-2 text-white">
              <Code2 className="size-5 text-primary-100" />
              <h2 className="text-xl">Create a Round</h2>
            </div>

            <div className="grid gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-light-100">Tech stack or topic</span>
                <select
                  value={stack}
                  onChange={(e) => setStack(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-dark-200 px-4 py-3 text-white"
                >
                  {LOGIC_ARENA_STACKS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-light-100">Difficulty</span>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-dark-200 px-4 py-3 text-white"
                  >
                    {LOGIC_ARENA_DIFFICULTIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-light-100">Question count</span>
                  <input
                    type="number"
                    value={count}
                    min={LOGIC_ARENA_QUESTION_LIMITS.min}
                    max={LOGIC_ARENA_QUESTION_LIMITS.max}
                    onChange={(e) => setCount(clampCount(Number(e.target.value || 0)))}
                    className="rounded-2xl border border-white/10 bg-dark-200 px-4 py-3 text-white"
                  />
                </label>
              </div>

              <div className="grid gap-3">
                <span className="text-sm font-medium text-light-100">Mode</span>
                <div className="grid gap-3">
                  {LOGIC_ARENA_MODES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                        mode === item.id
                          ? "border-primary-200/50 bg-primary-200/12 shadow-[0_0_24px_rgba(202,197,254,0.16)]"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-light-400">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void generateGame()}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-200 px-5 text-sm font-bold text-dark-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Sparkles className="size-4" />
                {loading ? "Generating..." : "Start Arena"}
              </button>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,40,0.96),rgba(9,12,21,0.96))] p-5">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-primary-100" />
            <h2 className="text-xl text-white">Arena Stats</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Mode</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatModeLabel(mode)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Accuracy</p>
              <p className="mt-2 text-lg font-semibold text-white">{accuracy}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Correct Answers</p>
              <p className="mt-2 text-lg font-semibold text-white">{correctCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Current Streak</p>
              <p className="mt-2 text-lg font-semibold text-white">{streak}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-primary-200/20 bg-primary-200/8 p-4">
            <div className="flex items-center gap-2 text-primary-100">
              <Crown className="size-4" />
              <p className="font-semibold">Why this section matters</p>
            </div>
            <p className="mt-2 text-sm text-light-100">
              Students can practice outside full interviews, sharpen logic daily, and keep
              engagement high with short competitive rounds.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,40,0.96),rgba(9,12,21,0.96))] p-5 sm:p-6">
          {!game ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
              <Code2 className="size-12 text-primary-100/70" />
              <h2 className="mt-4 text-2xl text-white">No round loaded</h2>
              <p className="mt-2 max-w-md text-light-400">
                Pick a stack, mode, and question count, then generate a fresh round to begin.
              </p>
            </div>
          ) : completed ? (
            <div className="flex min-h-[420px] flex-col justify-center rounded-[24px] border border-primary-200/20 bg-primary-200/[0.06] p-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-200/30 bg-primary-200/12 px-4 py-2 text-sm font-semibold text-primary-100">
                <Crown className="size-4" />
                Round Complete
              </div>
              <h2 className="mt-5 text-3xl text-white">{game.title}</h2>
              <p className="mt-2 text-light-100">{game.summary}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-light-400">Final Score</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{score}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-light-400">Accuracy</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{accuracy}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-light-400">Best Streak</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{bestStreak}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void generateGame()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-200 px-5 text-sm font-bold text-dark-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-100"
                >
                  <RefreshCcw className="size-4" />
                  Generate Another Round
                </button>
                <button
                  type="button"
                  onClick={resetRoundState}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
                >
                  Replay Same Round
                </button>
              </div>
            </div>
          ) : question ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-light-400">
                      Question {currentIndex + 1} of {game.questions.length}
                    </p>
                    <h2 className="mt-2 text-2xl text-white">{game.title}</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-white">
                    <Timer className="size-4 text-primary-100" />
                    <span>{secondsLeft}s</span>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#cac5fe,#ffffff)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-primary-200/25 bg-primary-200/10 px-3 py-1 text-xs font-semibold text-primary-100">
                    {question.stack}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-light-100">
                    {question.difficulty}
                  </span>
                  {question.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-light-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-lg leading-8 text-white">{question.question}</p>
              </div>

              <div className="grid gap-3">
                {question.options.map((option, index) => {
                  const isCorrect = revealed && index === question.answerIndex;
                  const isWrong = revealed && selectedIndex === index && index !== question.answerIndex;

                  return (
                    <button
                      key={`${question.id}-${index}`}
                      type="button"
                      onClick={() => handleAnswer(index)}
                      disabled={revealed}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        isCorrect
                          ? "border-green-400/50 bg-green-500/10 text-white"
                          : isWrong
                            ? "border-red-400/50 bg-red-500/10 text-white"
                            : "border-white/10 bg-white/5 text-light-100 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      <span className="font-semibold text-white">{String.fromCharCode(65 + index)}.</span>{" "}
                      {option}
                    </button>
                  );
                })}
              </div>

              {revealed ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-light-400">Explanation</p>
                  <p className="mt-2 text-base leading-7 text-light-100">{question.explanation}</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={moveNext}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary-200 px-5 text-sm font-bold text-dark-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-100"
                    >
                      {currentIndex >= game.questions.length - 1 ? "Finish Round" : "Next Question"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void generateGame()}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
                    >
                      <RefreshCcw className="size-4" />
                      New Random Round
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
        </>
      ) : null}
    </div>
  );
};

export default LogicArena;
