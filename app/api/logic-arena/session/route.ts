import { cookies } from "next/headers";

import { auth, db } from "@/firebase/admin";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const getLevelFromXp = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const body = (await request.json()) as {
      stack?: string;
      mode?: string;
      difficulty?: string;
      title?: string;
      source?: string;
      score?: number;
      accuracy?: number;
      correctCount?: number;
      questionCount?: number;
      bestStreak?: number;
    };

    const questionCount = clamp(Number(body.questionCount || 0), 1, 100);
    const correctCount = clamp(Number(body.correctCount || 0), 0, questionCount);
    const accuracy = clamp(Number(body.accuracy || 0), 0, 100);
    const score = clamp(Number(body.score || 0), 0, 100000);
    const bestStreak = clamp(Number(body.bestStreak || 0), 0, questionCount);

    await db.collection("logicArenaSessions").add({
      userId: decoded.uid,
      stack: String(body.stack || "Unknown").trim() || "Unknown",
      mode: String(body.mode || "concept-sprint").trim() || "concept-sprint",
      difficulty: String(body.difficulty || "Intermediate").trim() || "Intermediate",
      title: String(body.title || "Logic Arena Round").trim() || "Logic Arena Round",
      source: body.source === "ai" ? "ai" : "fallback",
      score,
      accuracy,
      correctCount,
      questionCount,
      bestStreak,
      createdAt: new Date().toISOString(),
    });

    const gamificationRef = db.collection("userGamification").doc(decoded.uid);
    const gamificationDoc = await gamificationRef.get();
    const existing = gamificationDoc.exists ? gamificationDoc.data() : {};
    const nextXp = Number(existing?.xp || 0) + 45;
    const nextLogicArenaRounds = Number(existing?.logicArenaRounds || 0) + 1;
    const badgesEarned = new Set<string>(
      Array.isArray(existing?.badgesEarned) ? existing.badgesEarned : [],
    );

    if (nextLogicArenaRounds >= 1) {
      badgesEarned.add("logic-initiate");
    }

    await gamificationRef.set(
      {
        userId: decoded.uid,
        currentStreakDays: Number(existing?.currentStreakDays || 0),
        longestStreakDays: Number(existing?.longestStreakDays || 0),
        totalPracticeDays: Number(existing?.totalPracticeDays || 0),
        interviewsCompleted: Number(existing?.interviewsCompleted || 0),
        logicArenaRounds: nextLogicArenaRounds,
        xp: nextXp,
        level: getLevelFromXp(nextXp),
        badgesEarned: [...badgesEarned],
        weeklyChallengeId: existing?.weeklyChallengeId || "default-template",
        weeklyProgress: {
          interviewsCompleted: Number(existing?.weeklyProgress?.interviewsCompleted || 0),
          scoreDelta: Number(existing?.weeklyProgress?.scoreDelta || 0),
          logicArenaRounds: Number(existing?.weeklyProgress?.logicArenaRounds || 0) + 1,
        },
        lastPracticeAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error saving Logic Arena session:", error);
    return Response.json(
      { success: false, message: "Could not save Logic Arena session." },
      { status: 500 },
    );
  }
}
