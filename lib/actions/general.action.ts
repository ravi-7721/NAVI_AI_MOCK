"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
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
