"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { db } from "@/firebase/admin";
import { feedbackSchema, interviewTemplates } from "@/constants";
import { getInterviewCoverBySeed } from "@/lib/utils";

const DEFAULT_FEEDBACK_CATEGORIES = [
  "Communication Skills",
  "Behavioral Skills",
  "Technical Knowledge",
  "Aptitude",
  "Problem-Solving",
  "Cultural & Role Fit",
  "Confidence & Clarity",
] as const;

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const buildFallbackFeedback = (transcript: { role: string; content: string }[]) => {
  const answers = transcript
    .filter((line) => line.role === "user")
    .map((line) => line.content?.trim())
    .filter(Boolean) as string[];

  const nonEmptyAnswers = answers.filter((ans) => ans !== "(No answer)");
  const avgAnswerLength =
    nonEmptyAnswers.length > 0
      ? nonEmptyAnswers.reduce((sum, ans) => sum + ans.length, 0) / nonEmptyAnswers.length
      : 0;

  const baseScore = clampScore(55 + Math.min(avgAnswerLength / 4, 25));

  const categoryScores = DEFAULT_FEEDBACK_CATEGORIES.map((name, idx) => ({
    name,
    score: clampScore(baseScore + (idx % 3) * 2 - 2),
    comment:
      nonEmptyAnswers.length > 0
        ? "Based on available interview responses, performance is moderate with room for improvement."
        : "Insufficient response content for a deeper evaluation.",
  }));

  return {
    totalScore: clampScore(
      categoryScores.reduce((sum, item) => sum + item.score, 0) / categoryScores.length,
    ),
    categoryScores,
    strengths:
      nonEmptyAnswers.length > 0
        ? ["Attempted most questions", "Showed willingness to continue the interview"]
        : ["Completed interview flow"],
    areasForImprovement: [
      "Provide more detailed examples using STAR format",
      "Add clearer technical depth and explanation",
    ],
    finalAssessment:
      nonEmptyAnswers.length > 0
        ? "Decent baseline performance. More specific, structured answers would improve the score."
        : "Interview completed, but responses were too limited for a full AI-quality assessment.",
  };
};

const normalizeFeedbackObject = (object: {
  totalScore?: number;
  categoryScores?: Array<{ name?: string; score?: number; comment?: string }>;
  strengths?: string[];
  areasForImprovement?: string[];
  finalAssessment?: string;
}) => {
  const categoryScores =
    object.categoryScores
      ?.filter((item) => item && item.name)
      .map((item) => ({
        name: item.name!.trim(),
        score: clampScore(Number(item.score ?? 0)),
        comment: (item.comment ?? "").trim() || "No comment provided.",
      })) ?? [];

  const normalizedCategories =
    categoryScores.length >= 5
      ? categoryScores
      : buildFallbackFeedback([]).categoryScores;

  const computedTotal =
    normalizedCategories.reduce((sum, item) => sum + item.score, 0) / normalizedCategories.length;

  return {
    totalScore: clampScore(Number(object.totalScore ?? computedTotal)),
    categoryScores: normalizedCategories,
    strengths:
      object.strengths?.filter(Boolean) ?? ["Communication", "Willingness to participate"],
    areasForImprovement:
      object.areasForImprovement?.filter(Boolean) ?? [
        "Increase clarity and depth of responses",
      ],
    finalAssessment:
      object.finalAssessment?.trim() || "Interview completed with moderate performance.",
  };
};

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`,
      )
      .join("");

    let object: {
      totalScore?: number;
      categoryScores?: Array<{ name?: string; score?: number; comment?: string }>;
      strengths?: string[];
      areasForImprovement?: string[];
      finalAssessment?: string;
    };
    let fallbackUsed = false;

    try {
      const generated = await generateObject({
        model: google("gemini-2.0-flash-001"),
        schema: feedbackSchema,
        prompt: `
          You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
          Transcript:
          ${formattedTranscript}

          Please score the candidate from 0 to 100 in the following areas:
          - Communication Skills
          - Behavioral Skills
          - Technical Knowledge
          - Aptitude
          - Problem-Solving
          - Cultural & Role Fit
          - Confidence & Clarity

          Return valid structured output with the required fields only.
        `,
        system:
          "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
      });

      object = generated.object;
    } catch (generationError) {
      console.error("AI feedback generation failed, using fallback:", generationError);
      object = buildFallbackFeedback(transcript);
      fallbackUsed = true;
    }

    const normalized = normalizeFeedbackObject(object);

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: normalized.totalScore,
      categoryScores: normalized.categoryScores,
      strengths: normalized.strengths,
      areasForImprovement: normalized.areasForImprovement,
      finalAssessment: normalized.finalAssessment,
      fallbackUsed,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false, error: "Could not save feedback to database." };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams,
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getFeedbackByUserId(userId: string): Promise<Feedback[]> {
  try {
    const snapshot = await db
      .collection("feedback")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      ) as Feedback[];
  } catch (error) {
    console.error("Error getting feedback by user:", error);
    return [];
  }
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams,
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string,
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function ensureDefaultInterviewsForUser(userId: string) {
  try {
    const existing = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!existing.empty) return;

    const batch = db.batch();
    const baseTime = Date.now();

    interviewTemplates.forEach((template, index) => {
      const createdAt = new Date(baseTime - index * 60_000).toISOString();
      const docRef = db.collection("interviews").doc();

      batch.set(docRef, {
        role: template.role,
        type: template.type,
        level: template.level,
        techstack: template.techstack,
        questions: template.questions,
        userId,
        finalized: true,
        createdAt,
        coverImage: getInterviewCoverBySeed(
          `${userId}-${createdAt}-${template.role}`,
        ),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error seeding default interviews:", error);
  }
}

export async function createInterviewSession(params: {
  userId: string;
  questions: string[];
  role?: string;
  level?: string;
  type?: string;
  techstack?: string[];
}) {
  const {
    userId,
    questions,
    role = "General Interview",
    level = "Mid",
    type = "Mixed",
    techstack = ["Communication", "Problem Solving"],
  } = params;

  try {
    const createdAt = new Date().toISOString();
    const interview = {
      role,
      type,
      level,
      techstack,
      questions,
      userId,
      finalized: true,
      createdAt,
      coverImage: getInterviewCoverBySeed(`${userId}-${createdAt}-${role}`),
    };

    const doc = await db.collection("interviews").add(interview);
    return { success: true, interviewId: doc.id };
  } catch (error) {
    console.error("Error creating interview session:", error);
    return { success: false as const };
  }
}

export async function getDashboardStatsByUserId(
  userId: string,
): Promise<DashboardStats> {
  try {
    const [interviewsSnapshot, feedbackSnapshot] = await Promise.all([
      db.collection("interviews").where("userId", "==", userId).get(),
      db.collection("feedback").where("userId", "==", userId).get(),
    ]);

    const feedbackDocs = feedbackSnapshot.docs.map((doc) => doc.data() as Feedback);
    const categoryAggregate = new Map<string, { total: number; count: number }>();

    feedbackDocs.forEach((feedback) => {
      feedback.categoryScores?.forEach((item) => {
        const key = item.name?.trim() || "General";
        const existing = categoryAggregate.get(key) || { total: 0, count: 0 };
        categoryAggregate.set(key, {
          total: existing.total + Number(item.score || 0),
          count: existing.count + 1,
        });
      });
    });

    const categoryAverages = [...categoryAggregate.entries()].map(([name, values]) => ({
      name,
      average: values.count > 0 ? values.total / values.count : 0,
    }));

    const strongestCategory =
      categoryAverages.length > 0
        ? categoryAverages.reduce((best, item) =>
            item.average > best.average ? item : best,
          ).name
        : "N/A";

    const weakestCategory =
      categoryAverages.length > 0
        ? categoryAverages.reduce((worst, item) =>
            item.average < worst.average ? item : worst,
          ).name
        : "N/A";

    const averageScore =
      feedbackDocs.length > 0
        ? Math.round(
            feedbackDocs.reduce((sum, item) => sum + Number(item.totalScore || 0), 0) /
              feedbackDocs.length,
          )
        : 0;

    return {
      totalInterviews: interviewsSnapshot.size,
      totalFeedback: feedbackSnapshot.size,
      averageScore,
      strongestCategory,
      weakestCategory,
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return {
      totalInterviews: 0,
      totalFeedback: 0,
      averageScore: 0,
      strongestCategory: "N/A",
      weakestCategory: "N/A",
    };
  }
}

export async function getQuestionBankByUserId(
  userId: string,
): Promise<QuestionBankItem[]> {
  try {
    const interviews = await getInterviewsByUserId(userId);
    if (!interviews?.length) return [];

    const seen = new Set<string>();
    const items: QuestionBankItem[] = [];

    interviews.forEach((interview) => {
      interview.questions?.forEach((question, idx) => {
        const normalizedQuestion = (question || "").trim();
        if (!normalizedQuestion) return;

        const dedupeKey = normalizedQuestion.toLowerCase();
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        items.push({
          id: `${interview.id}-${idx}`,
          question: normalizedQuestion,
          role: interview.role,
          level: interview.level,
          type: interview.type,
          techstack: interview.techstack || [],
          interviewId: interview.id,
          createdAt: interview.createdAt,
        });
      });
    });

    return items;
  } catch (error) {
    console.error("Error getting question bank:", error);
    return [];
  }
}

export async function getCompetitiveLeaderboard(
  limit = 20,
): Promise<LeaderboardEntry[]> {
  try {
    const [usersSnapshot, interviewsSnapshot, feedbackSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("interviews").get(),
      db.collection("feedback").get(),
    ]);

    const users = new Map<
      string,
      {
        name?: string;
        email?: string;
      }
    >();

    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { name?: string; email?: string };
      users.set(doc.id, {
        name: data.name,
        email: data.email,
      });
    });

    const interviewsCount = new Map<string, number>();
    interviewsSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { userId?: string };
      const userId = data.userId;
      if (!userId) return;
      interviewsCount.set(userId, (interviewsCount.get(userId) || 0) + 1);
    });

    const feedbackByUser = new Map<
      string,
      Array<{ totalScore: number; createdAt: string }>
    >();
    feedbackSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { userId?: string; totalScore?: number; createdAt?: string };
      if (!data.userId) return;

      const existing = feedbackByUser.get(data.userId) || [];
      existing.push({
        totalScore: Number(data.totalScore || 0),
        createdAt: data.createdAt || "",
      });
      feedbackByUser.set(data.userId, existing);
    });

    const allUserIds = new Set<string>([
      ...users.keys(),
      ...interviewsCount.keys(),
      ...feedbackByUser.keys(),
    ]);

    const entries: LeaderboardEntry[] = [...allUserIds].map((userId) => {
      const user = users.get(userId);
      const interviews = interviewsCount.get(userId) || 0;
      const feedback = [...(feedbackByUser.get(userId) || [])].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );

      const feedbackCount = feedback.length;
      const averageScore =
        feedbackCount > 0
          ? Math.round(
              feedback.reduce((sum, item) => sum + item.totalScore, 0) / feedbackCount,
            )
          : 0;

      const improvementScore =
        feedbackCount >= 2
          ? Math.max(
              0,
              Math.round(feedback[feedbackCount - 1].totalScore - feedback[0].totalScore),
            )
          : 0;

      const consistencyScore =
        feedbackCount > 1
          ? Math.max(
              0,
              Math.round(
                100 -
                  Math.sqrt(
                    feedback.reduce(
                      (sum, item) => sum + Math.pow(item.totalScore - averageScore, 2),
                      0,
                    ) / feedbackCount,
                  ),
              ),
            )
          : averageScore;

      const competitiveScore = Math.round(
        averageScore * 0.6 + consistencyScore * 0.25 + improvementScore * 0.15,
      );

      return {
        rank: 0,
        userId,
        name: user?.name || "Anonymous",
        email: user?.email,
        interviews,
        feedbackCount,
        averageScore,
        improvementScore,
        consistencyScore,
        competitiveScore,
      };
    });

    return entries
      .filter((entry) => entry.interviews > 0 || entry.feedbackCount > 0)
      .sort((a, b) => {
        if (b.competitiveScore !== a.competitiveScore)
          return b.competitiveScore - a.competitiveScore;
        if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
        return b.interviews - a.interviews;
      })
      .slice(0, Math.max(1, limit))
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));
  } catch (error) {
    console.error("Error building competitive leaderboard:", error);
    return [];
  }
}

export async function getLogicArenaStatsByUserId(
  userId: string,
): Promise<LogicArenaStats> {
  try {
    const snapshot = await db
      .collection("logicArenaSessions")
      .where("userId", "==", userId)
      .get();

    if (snapshot.empty) {
      return {
        totalRounds: 0,
        bestScore: 0,
        averageAccuracy: 0,
        favoriteStack: "N/A",
      };
    }

    const sessions = snapshot.docs.map((doc) => doc.data() as LogicArenaSession);
    const stackCounts = new Map<string, number>();

    sessions.forEach((session) => {
      const stack = session.stack?.trim() || "Unknown";
      stackCounts.set(stack, (stackCounts.get(stack) || 0) + 1);
    });

    const favoriteStack =
      [...stackCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    const bestScore = Math.max(...sessions.map((session) => Number(session.score || 0)));
    const averageAccuracy = Math.round(
      sessions.reduce((sum, session) => sum + Number(session.accuracy || 0), 0) /
        sessions.length,
    );

    return {
      totalRounds: sessions.length,
      bestScore,
      averageAccuracy,
      favoriteStack,
    };
  } catch (error) {
    console.error("Error getting Logic Arena stats:", error);
    return {
      totalRounds: 0,
      bestScore: 0,
      averageAccuracy: 0,
      favoriteStack: "N/A",
    };
  }
}

export async function getRecentLogicArenaSessionsByUserId(
  userId: string,
  limit = 5,
): Promise<LogicArenaSession[]> {
  try {
    const snapshot = await db
      .collection("logicArenaSessions")
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) =>
        String((b as LogicArenaSession).createdAt || "").localeCompare(
          String((a as LogicArenaSession).createdAt || ""),
        ),
      )
      .slice(0, Math.max(1, limit)) as LogicArenaSession[];
  } catch (error) {
    console.error("Error getting recent Logic Arena sessions:", error);
    return [];
  }
}

const resumeInterviewSchema = z.object({
  role: z.string().min(1),
  level: z.enum(["Junior", "Mid", "Senior"]),
  type: z.enum(["Technical", "Behavioral", "Mixed"]),
  techstack: z.array(z.string().min(1)).min(2).max(10),
  questions: z.array(z.string().min(1)).min(5).max(20),
});

const buildFallbackInterviewFromResume = (params: {
  resumeText: string;
  jobDescription?: string;
  questionCount: number;
}) => {
  const { resumeText, jobDescription = "", questionCount } = params;
  const text = `${resumeText}\n${jobDescription}`.toLowerCase();

  let role = "Software Engineer";
  if (/frontend|react|next\.js|ui/.test(text)) role = "Frontend Developer";
  else if (/backend|api|node|express|spring|django/.test(text))
    role = "Backend Developer";
  else if (/data\s*science|machine learning|ml|ai/.test(text))
    role = "ML Engineer";
  else if (/full\s*stack/.test(text)) role = "Full Stack Developer";

  const level: "Junior" | "Mid" | "Senior" = /lead|senior|architect|8\+|10\+/.test(text)
    ? "Senior"
    : /intern|fresher|entry|junior/.test(text)
      ? "Junior"
      : "Mid";

  const techstack: string[] = [];
  if (/html/.test(text)) techstack.push("HTML");
  if (/css|tailwind|bootstrap/.test(text)) techstack.push("CSS");
  if (/react/.test(text)) techstack.push("React");
  if (/next/.test(text)) techstack.push("Next.js");
  if (/typescript/.test(text)) techstack.push("TypeScript");
  if (/javascript/.test(text)) techstack.push("JavaScript");
  if (/node/.test(text)) techstack.push("Node.js");
  if (/python/.test(text)) techstack.push("Python");
  if (/java/.test(text)) techstack.push("Java");
  if (/sql|postgres|mysql/.test(text)) techstack.push("SQL");
  if (/mysql/.test(text)) techstack.push("MySQL");
  if (/nosql|mongo/.test(text)) techstack.push("NoSQL");
  if (/mongodb/.test(text)) techstack.push("MongoDB");
  if (/aws|azure|gcp/.test(text)) techstack.push("Cloud");
  if (techstack.length < 2) techstack.push("Problem Solving", "Communication");

  const questionsPool = [
    `Walk me through your most relevant project for a ${role} position.`,
    "What was your biggest technical challenge recently, and how did you solve it?",
    "How do you approach debugging when a production issue appears?",
    "How do you ensure code quality and maintainability in your work?",
    "Explain a trade-off decision you made in system or feature design.",
    "How do you prioritize tasks when deadlines are tight?",
    "Describe a time you received critical feedback and what you changed.",
    "How do you collaborate with teammates across product, design, and QA?",
    "Which parts of the target role or JD match your strongest skills?",
    "What do you want to improve in the next 6 months, and how?",
    `If hired as a ${role}, what would be your first 30-day plan?`,
    "How do you validate performance and scalability before release?",
    "Tell me about a failure in a project and what you learned from it.",
    "How do you communicate complex technical ideas to non-technical stakeholders?",
    "What makes you a strong fit for this specific opportunity?",
  ];

  const questions = questionsPool.slice(0, questionCount);

  return {
    role,
    level,
    type: "Mixed" as const,
    techstack: [...new Set(techstack)].slice(0, 10),
    questions,
  };
};

export async function createInterviewFromResume(params: {
  userId: string;
  resumeText: string;
  jobDescription?: string;
  questionCount?: number;
}) {
  const { userId, resumeText, jobDescription = "", questionCount = 8 } = params;
  const normalizedCount = Math.min(Math.max(questionCount, 5), 15);

  if (!resumeText.trim()) {
    return {
      success: false as const,
      message: "Resume text is required.",
    };
  }

  try {
    let generatedObject: z.infer<typeof resumeInterviewSchema> | null = null;

    try {
      const { object } = await generateObject({
        model: google("gemini-2.0-flash-001"),
        schema: resumeInterviewSchema,
        prompt: `
You are an expert interview designer.
Create a targeted mock interview from the candidate profile and job description.

Candidate Resume:
${resumeText}

Job Description:
${jobDescription || "Not provided. Infer from resume profile."}

Rules:
- Return exactly ${normalizedCount} interview questions.
- Questions must be specific, realistic, and evaluative.
- Mix conceptual and practical questions.
- Keep each question concise and clear.
- Infer role/level/type based on resume + job description.
`,
        system:
          "Generate structured interview sets from candidate profile details. Return schema-compliant output only.",
      });

      generatedObject = object;
    } catch (generationError) {
      console.error(
        "AI resume interview generation failed, using deterministic fallback:",
        generationError,
      );
    }

    const fallback = buildFallbackInterviewFromResume({
      resumeText,
      jobDescription,
      questionCount: normalizedCount,
    });

    const finalRole = generatedObject?.role?.trim() || fallback.role;
    const finalLevel = generatedObject?.level || fallback.level;
    const finalType = generatedObject?.type || fallback.type;
    const finalTechstack =
      generatedObject?.techstack?.filter(Boolean).slice(0, 10) || fallback.techstack;

    const aiQuestions = generatedObject?.questions?.filter(Boolean) || [];
    const fallbackQuestions = fallback.questions;
    const mergedQuestions = [...aiQuestions];

    for (const question of fallbackQuestions) {
      if (mergedQuestions.length >= normalizedCount) break;
      if (!mergedQuestions.includes(question)) mergedQuestions.push(question);
    }

    const finalQuestions = mergedQuestions.slice(0, normalizedCount);
    if (finalQuestions.length < normalizedCount) {
      return {
        success: false as const,
        message: "Could not generate required number of interview questions.",
      };
    }

    const created = await createInterviewSession({
      userId,
      questions: finalQuestions,
      role: finalRole,
      level: finalLevel,
      type: finalType,
      techstack: finalTechstack,
    });

    if (!created.success) {
      return {
        success: false as const,
        message: "Failed to create interview session.",
      };
    }

    return {
      success: true as const,
      interviewId: created.interviewId,
      role: finalRole,
    };
  } catch (error) {
    console.error("Error creating interview from resume:", error);
    return {
      success: false as const,
      message: "Unable to generate interview from resume. Please try again.",
    };
  }
}
