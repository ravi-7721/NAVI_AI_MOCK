const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function loadEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^"/, "")
      .replace(/"$/, "");

    env[key] = value;
  }

  return env;
}

function initFirebaseAdmin(env) {
  if (admin.apps.length) return admin.app();

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

async function main() {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local was not found.");
  }

  const env = loadEnvFile(envPath);
  initFirebaseAdmin(env);

  const db = admin.firestore();
  const now = new Date().toISOString();
  const batch = db.batch();

  const schemaRef = db.collection("_meta").doc("schema");
  batch.set(
    schemaRef,
    {
      version: 1,
      updatedAt: now,
      collections: [
        "users",
        "interviews",
        "feedback",
        "logicArenaSessions",
        "interviewReplays",
        "answerCoaching",
        "userGamification",
        "weeklyChallenges",
        "badges",
        "interviewModes",
      ],
      featureFlags: {
        adaptiveFollowUps: true,
        answerLevelCoaching: true,
        interviewReplay: true,
        gamification: true,
        interviewModes: true,
        liveCodingRound: true,
      },
    },
    { merge: true },
  );

  const interviewModesRef = db.collection("interviewModes").doc("default");
  batch.set(
    interviewModesRef,
    {
      updatedAt: now,
      modes: [
        {
          id: "hr",
          name: "HR Round",
          description: "Behavioral screening focused on communication, motivation, and culture fit.",
          scoringFocus: ["Communication Skills", "Behavioral Skills", "Confidence & Clarity"],
          targetQuestionCount: 8,
        },
        {
          id: "technical",
          name: "Technical Round",
          description: "Core technical knowledge, debugging, trade-offs, and implementation depth.",
          scoringFocus: ["Technical Knowledge", "Problem-Solving", "Aptitude"],
          targetQuestionCount: 10,
        },
        {
          id: "managerial",
          name: "Managerial Round",
          description: "Ownership, prioritization, leadership, and stakeholder communication.",
          scoringFocus: ["Communication Skills", "Problem-Solving", "Cultural & Role Fit"],
          targetQuestionCount: 8,
        },
        {
          id: "full-loop",
          name: "Full Loop",
          description: "Combined HR, technical, and managerial stages in one guided flow.",
          scoringFocus: ["Communication Skills", "Technical Knowledge", "Problem-Solving", "Cultural & Role Fit"],
          targetQuestionCount: 15,
        },
        {
          id: "live-coding",
          name: "Live Coding",
          description: "Solve JavaScript coding problems with starter code, timed checks, and coding-specific feedback.",
          scoringFocus: ["Technical Knowledge", "Problem-Solving", "Aptitude"],
          targetQuestionCount: 2,
        },
      ],
    },
    { merge: true },
  );

  const defaultChallengeRef = db.collection("weeklyChallenges").doc("default-template");
  batch.set(
    defaultChallengeRef,
    {
      name: "Weekly Interview Sprint",
      updatedAt: now,
      active: true,
      goals: [
        { id: "complete-interviews", label: "Complete 3 interviews", target: 3, metric: "interviewsCompleted" },
        { id: "improve-score", label: "Improve average score by 5 points", target: 5, metric: "scoreDelta" },
        { id: "logic-arena", label: "Finish 2 Logic Arena rounds", target: 2, metric: "logicArenaRounds" },
      ],
      rewardBadgeIds: ["weekly-warrior"],
    },
    { merge: true },
  );

  const badges = [
    {
      id: "first-interview",
      name: "First Step",
      description: "Complete your first interview.",
      criteria: { metric: "interviewsCompleted", threshold: 1 },
    },
    {
      id: "streak-7",
      name: "7-Day Streak",
      description: "Practice on seven consecutive days.",
      criteria: { metric: "practiceStreakDays", threshold: 7 },
    },
    {
      id: "logic-initiate",
      name: "Arena Initiate",
      description: "Finish your first Logic Arena round.",
      criteria: { metric: "logicArenaRounds", threshold: 1 },
    },
    {
      id: "weekly-warrior",
      name: "Weekly Warrior",
      description: "Complete all weekly challenge goals.",
      criteria: { metric: "weeklyChallengesCompleted", threshold: 1 },
    },
  ];

  for (const badge of badges) {
    batch.set(
      db.collection("badges").doc(badge.id),
      {
        ...badge,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  const sampleReplayRef = db.collection("interviewReplays").doc("_template");
  batch.set(
    sampleReplayRef,
    {
      template: true,
      updatedAt: now,
      interviewId: "INTERVIEW_ID",
      userId: "USER_ID",
      roundType: "technical",
      startedAt: now,
      completedAt: now,
      qaLog: [
        {
          id: "q1",
          question: "Tell me about yourself.",
          answer: "Sample answer",
          askedAt: now,
          answeredAt: now,
          wasFollowUp: false,
          followUpToQuestionId: null,
          coachingId: "COACHING_ID",
        },
      ],
    },
    { merge: true },
  );

  const sampleCoachingRef = db.collection("answerCoaching").doc("_template");
  batch.set(
    sampleCoachingRef,
    {
      template: true,
      updatedAt: now,
      interviewId: "INTERVIEW_ID",
      userId: "USER_ID",
      questionId: "q1",
      question: "Tell me about yourself.",
      answer: "Sample answer",
      clarityScore: 70,
      relevanceScore: 72,
      depthScore: 68,
      overallScore: 70,
      strengths: ["Direct opening"],
      improvements: ["Add a measurable project outcome"],
      quickTip: "Use a tighter STAR-style structure.",
      shouldAskFollowUp: true,
      suggestedFollowUpQuestion: "Can you quantify the result of that project?",
    },
    { merge: true },
  );

  const gamificationTemplateRef = db.collection("userGamification").doc("_template");
  batch.set(
    gamificationTemplateRef,
    {
      template: true,
      updatedAt: now,
      userId: "USER_ID",
      currentStreakDays: 0,
      longestStreakDays: 0,
      totalPracticeDays: 0,
      interviewsCompleted: 0,
      logicArenaRounds: 0,
      badgesEarned: [],
      xp: 0,
      level: 1,
      weeklyChallengeId: "default-template",
      weeklyProgress: {
        interviewsCompleted: 0,
        scoreDelta: 0,
        logicArenaRounds: 0,
      },
      lastPracticeAt: null,
    },
    { merge: true },
  );

  await batch.commit();

  console.log("firestore-bootstrap-ok");
  console.log(`project=${env.FIREBASE_PROJECT_ID}`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
