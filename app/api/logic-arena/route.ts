import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import {
  LOGIC_ARENA_DIFFICULTIES,
  LOGIC_ARENA_MODES,
  LOGIC_ARENA_QUESTION_LIMITS,
  LOGIC_ARENA_STACKS,
} from "@/constants/game";
import { getLargeFallbackPoolForStack } from "@/lib/logicArenaFallback";

const requestSchema = z.object({
  stack: z.string().min(1),
  difficulty: z.enum(LOGIC_ARENA_DIFFICULTIES),
  mode: z.enum(LOGIC_ARENA_MODES.map((item) => item.id) as [string, ...string[]]),
  count: z
    .number()
    .int()
    .min(LOGIC_ARENA_QUESTION_LIMITS.min)
    .max(LOGIC_ARENA_QUESTION_LIMITS.max),
});

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1).max(4),
});

const responseSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  questions: z.array(questionSchema).min(5).max(LOGIC_ARENA_QUESTION_LIMITS.max),
});

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeStack = (stack: string) => {
  const allowed = new Set(LOGIC_ARENA_STACKS);
  return allowed.has(stack as (typeof LOGIC_ARENA_STACKS)[number])
    ? stack
    : "Logical Reasoning";
};

const STACK_KEYWORDS: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "ecmascript", "node.js", "nodejs"],
  TypeScript: ["typescript", "ts"],
  Python: ["python", "py"],
  Java: ["java", "jvm", "spring"],
  C: ["language c", "c language", "stdio.h"],
  "C++": ["c++", "cpp", "std::", "stl"],
  "C#": ["c#", ".net", "dotnet", "asp.net"],
  Go: ["golang", "go routine", "goroutine"],
  Rust: ["rust", "cargo", "borrow checker"],
  PHP: ["php", "laravel"],
  Ruby: ["ruby", "rails"],
  Swift: ["swift", "xcode"],
  Kotlin: ["kotlin", "android"],
  React: ["react", "jsx", "hooks"],
  "Next.js": ["next.js", "nextjs", "app router"],
  "Node.js": ["node.js", "nodejs", "event loop", "express"],
  SQL: ["sql", "select ", "join ", "where ", "group by"],
  MongoDB: ["mongodb", "mongo", "aggregation pipeline"],
  HTML: ["html", "semantic element", "<div", "<section"],
  CSS: ["css", "flexbox", "grid", "selector"],
  Git: ["git", "commit", "branch", "rebase"],
  DevOps: ["devops", "ci/cd", "docker", "kubernetes", "pipeline"],
  "Data Structures": ["data structure", "stack", "queue", "heap", "tree", "graph"],
  Algorithms: ["algorithm", "binary search", "dynamic programming", "complexity"],
  Aptitude: ["ratio", "probability", "average", "profit", "speed"],
  "Logical Reasoning": ["sequence", "pattern", "analogy", "puzzle", "logic"],
};

const textIncludesAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const isQuestionAlignedWithStack = (stack: string, question: z.infer<typeof questionSchema>) => {
  if (stack === "Logical Reasoning" || stack === "Aptitude") return true;

  const text = [
    question.question,
    ...question.options,
    question.explanation,
    ...question.tags,
  ]
    .join(" ")
    .toLowerCase();

  const allowedKeywords = STACK_KEYWORDS[stack] ?? [stack.toLowerCase()];
  const hasAllowedSignal = textIncludesAny(text, allowedKeywords);
  if (!hasAllowedSignal) return false;

  for (const [otherStack, keywords] of Object.entries(STACK_KEYWORDS)) {
    if (otherStack === stack) continue;
    if (textIncludesAny(text, keywords)) return false;
  }

  return true;
};

const buildFallbackQuestions = (params: z.infer<typeof requestSchema>) => {
  const { stack, difficulty, mode, count } = params;
  const fallbackPool = getLargeFallbackPoolForStack(stack);
  const filtered = fallbackPool.filter(
    (item) =>
      item.stack === stack &&
      (item.difficulty === difficulty || item.difficulty === "Intermediate") &&
      (item.mode === mode || item.mode === "concept-sprint"),
  );

  const exactStackPool =
    filtered.length > 0
      ? filtered
      : fallbackPool.filter((item) => item.stack === stack);

  const safePool = exactStackPool.length > 0 ? exactStackPool : [];

  return Array.from({ length: Math.min(count, safePool.length || count) }, (_, index) => {
      const item = safePool[index % safePool.length];
      if (!item) {
        return {
          id: `empty-${stack}-${index + 1}`,
          stack,
          difficulty,
          mode,
          question: `Could not load a fallback question for ${stack}. Please generate a new round.`,
          options: [
            "Generate another round",
            "Generate another round",
            "Generate another round",
            "Generate another round",
          ],
          answerIndex: 0,
          explanation: `Fallback questions are not available yet for ${stack}.`,
          tags: [stack.toLowerCase()],
        };
      }

      const correctText = item.options[item.answerIndex];
      const shuffledOptions = shuffle(item.options);

      return {
        id: `${item.id}-${index + 1}`,
        stack: item.stack,
        difficulty: item.difficulty,
        mode: item.mode,
        question: item.question,
        options: shuffledOptions,
        answerIndex: shuffledOptions.indexOf(correctText),
        explanation: item.explanation,
        tags: item.tags,
      };
    });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse({
      ...body,
      stack: normalizeStack(body?.stack ?? ""),
      count: Number(body?.count ?? LOGIC_ARENA_QUESTION_LIMITS.min),
    });

    try {
      const { object } = await generateObject({
        model: google("gemini-2.0-flash-001"),
        schema: responseSchema,
        prompt: `
Generate a unique MCQ coding game set for a student.

Stack or topic: ${parsed.stack}
Difficulty: ${parsed.difficulty}
Mode: ${parsed.mode}
Question count: ${parsed.count}

Requirements:
- Return exactly ${parsed.count} multiple-choice questions.
- Each question must be distinct and non-repetitive.
- Cover practical, conceptual, and interview-relevant topics for the selected stack only.
- For output-challenge mode, prefer output prediction questions.
- For debug-duel mode, prefer bug-spotting or fix-selection questions.
- For concept-sprint mode, prefer high-signal conceptual questions.
- Every question must have exactly 4 options.
- Include the correct answer index and a short explanation.
- Avoid vague trick questions.
- Use clean plain text.
- Do not ask about any other language, framework, database, or tool unless it is the selected stack itself.
- If the selected stack is JavaScript, every question must be about JavaScript only. Apply the same rule for every selected stack.
`,
        system:
          "You create polished, reliable coding-game MCQs for students. Never mix technologies. Return valid structured output only.",
      });

      const alignedQuestions = object.questions.filter((item) =>
        isQuestionAlignedWithStack(parsed.stack, item),
      );

      const aiQuestions = alignedQuestions.slice(0, parsed.count).map((item, index) => ({
        id: `${parsed.stack.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${parsed.mode}-${index + 1}`,
        stack: parsed.stack,
        difficulty: parsed.difficulty,
        mode: parsed.mode,
        question: item.question,
        options: item.options,
        answerIndex: item.answerIndex,
        explanation: item.explanation,
        tags: item.tags,
      }));

      const fallbackQuestions =
        aiQuestions.length < parsed.count
          ? buildFallbackQuestions({
              ...parsed,
              count: parsed.count - aiQuestions.length,
            })
          : [];

      const questions = [...aiQuestions, ...fallbackQuestions].slice(0, parsed.count);

      return Response.json({
        success: true,
        title: object.title,
        summary: object.summary,
        source: fallbackQuestions.length > 0 ? "fallback" : "ai",
        questions,
      });
    } catch (generationError) {
      console.error("Logic Arena generation failed, using fallback:", generationError);

      const questions = buildFallbackQuestions(parsed);
      return Response.json({
        success: true,
        title: `${parsed.stack} ${parsed.difficulty} Challenge`,
        summary:
          "Fallback question set loaded. You can still play, score, and generate another round.",
        source: "fallback",
        questions,
      });
    }
  } catch (error) {
    console.error("Logic Arena request failed:", error);
    return Response.json(
      { success: false, message: "Unable to create a game round right now." },
      { status: 500 },
    );
  }
}
