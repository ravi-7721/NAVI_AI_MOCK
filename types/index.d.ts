interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  fallbackUsed?: boolean;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  coverImage?: string;
  roundType?: InterviewRoundType;
  codingLanguage?: CodingLanguage;
  codingChallengeIds?: string[];
  codingChallenges?: CodingChallenge[];
}

type InterviewRoundType =
  | "hr"
  | "technical"
  | "managerial"
  | "full-loop"
  | "video"
  | "live-coding";

type CodingLanguage = "javascript" | "python" | "java" | "go" | "ruby";
type CodingValueType = "number" | "boolean" | "string" | "number[]" | "string[]";

interface CodingChallengeParameter {
  name: string;
  type: CodingValueType;
}

interface CodingChallengeTestCase {
  id: string;
  title: string;
  args: unknown[];
  expected: unknown;
  explanation?: string;
  visibility?: "sample" | "hidden";
}

interface CodingChallenge {
  id: string;
  title: string;
  prompt: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedMinutes: number;
  functionName: string;
  parameters: CodingChallengeParameter[];
  returnType: CodingValueType;
  starterCodeByLanguage: Record<CodingLanguage, string>;
  entryPointByLanguage?: Partial<Record<CodingLanguage, string>>;
  supportedLanguages?: CodingLanguage[];
  tags: string[];
  hints: string[];
  evaluationFocus: string[];
  testCases: CodingChallengeTestCase[];
}

interface CodingCheckResult {
  id: string;
  title: string;
  passed: boolean;
  details: string;
  visibility?: "sample" | "hidden";
}

interface CodingExecutionSummary {
  language: CodingLanguage;
  code: string;
  explanation: string;
  passedChecks: number;
  totalChecks: number;
  visiblePassedChecks?: number;
  visibleTotalChecks?: number;
  hiddenPassedChecks?: number;
  hiddenTotalChecks?: number;
  attemptCount?: number;
  hintCount?: number;
  elapsedSeconds?: number;
  checkResults: CodingCheckResult[];
}

interface AnswerDeliveryMetrics {
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number;
  fillerCount: number;
  pauseCount: number;
  confidenceScore: number;
}

interface InterviewModeDefinition {
  id: InterviewRoundType;
  name: string;
  description: string;
  scoringFocus: string[];
  targetQuestionCount: number;
}

interface AnswerCoaching {
  id: string;
  interviewId: string;
  userId: string;
  questionId: string;
  question: string;
  answer: string;
  roundType: InterviewRoundType;
  clarityScore: number;
  relevanceScore: number;
  depthScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  quickTip: string;
  improvedAnswer?: string;
  deliveryNote?: string;
  shouldAskFollowUp: boolean;
  suggestedFollowUpQuestion?: string;
  updatedAt: string;
}

interface ReplayQuestionEntry {
  id: string;
  question: string;
  answer: string;
  askedAt: string;
  answeredAt: string;
  wasFollowUp: boolean;
  followUpToQuestionId?: string | null;
  coachingId?: string;
  deliveryMetrics?: AnswerDeliveryMetrics;
  codingSummary?: CodingExecutionSummary;
}

interface InterviewReplay {
  id: string;
  interviewId: string;
  userId: string;
  roundType: InterviewRoundType;
  startedAt: string;
  completedAt: string;
  qaLog: ReplayQuestionEntry[];
}

interface WeeklyChallengeGoal {
  id: string;
  label: string;
  target: number;
  metric: "interviewsCompleted" | "scoreDelta" | "logicArenaRounds";
}

interface WeeklyChallenge {
  id: string;
  name: string;
  active: boolean;
  goals: WeeklyChallengeGoal[];
  rewardBadgeIds: string[];
}

interface UserGamification {
  userId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  totalPracticeDays: number;
  interviewsCompleted: number;
  logicArenaRounds: number;
  badgesEarned: string[];
  xp: number;
  level: number;
  weeklyChallengeId?: string;
  weeklyProgress: {
    interviewsCompleted: number;
    scoreDelta: number;
    logicArenaRounds: number;
  };
  lastPracticeAt?: string | null;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
  profileURL?: string;
  dateOfBirth?: string;
  age?: number;
  education?: string;
  hobbies?: string[];
  personalDetails?: string;
  settings?: UserSettings;
}

interface UserSettings {
  preferredRole: string;
  preferredLevel: "Junior" | "Mid" | "Senior";
  preferredType: "Technical" | "Behavioral" | "Mixed";
  preferredTechStack: string[];
  interviewGoal: string;
}

interface InterviewCardProps {
  interviewId?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
  coverImage?: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  profileImage?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
  autoStart?: boolean;
  roundType?: InterviewRoundType;
}

interface LiveCodingRoundProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  challenges?: CodingChallenge[];
  autoStart?: boolean;
  initialLanguage?: CodingLanguage;
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface DashboardStats {
  totalInterviews: number;
  totalFeedback: number;
  averageScore: number;
  strongestCategory: string;
  weakestCategory: string;
}

interface QuestionBankItem {
  id: string;
  question: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  interviewId: string;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email?: string;
  interviews: number;
  feedbackCount: number;
  averageScore: number;
  improvementScore: number;
  consistencyScore: number;
  competitiveScore: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

interface LogicArenaQuestion {
  id: string;
  stack: string;
  difficulty: string;
  mode: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  tags: string[];
}

interface LogicArenaStats {
  totalRounds: number;
  bestScore: number;
  averageAccuracy: number;
  favoriteStack: string;
}

interface LogicArenaSession {
  id: string;
  userId: string;
  stack: string;
  mode: string;
  difficulty: string;
  title: string;
  source: "ai" | "fallback";
  score: number;
  accuracy: number;
  correctCount: number;
  questionCount: number;
  bestStreak: number;
  createdAt: string;
}
