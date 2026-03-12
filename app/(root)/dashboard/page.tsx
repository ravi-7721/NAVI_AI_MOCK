import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getDashboardStatsByUserId,
  getInterviewsByUserId,
  getUserGamificationByUserId,
  getLogicArenaStatsByUserId,
  getRecentLogicArenaSessionsByUserId,
  getWeeklyChallengeTemplate,
} from "@/lib/actions/general.action";
import { getDisplayInterviewRole } from "@/lib/utils";

const DashboardPage = async () => {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [stats, interviews, logicArenaStats, logicArenaSessions, gamification, weeklyChallenge] = userId
    ? await Promise.all([
        getDashboardStatsByUserId(userId),
        getInterviewsByUserId(userId),
        getLogicArenaStatsByUserId(userId),
        getRecentLogicArenaSessionsByUserId(userId),
        getUserGamificationByUserId(userId),
        getWeeklyChallengeTemplate(),
      ])
    : [
        {
          totalInterviews: 0,
          totalFeedback: 0,
          averageScore: 0,
          strongestCategory: "N/A",
          weakestCategory: "N/A",
        },
        [],
        {
          totalRounds: 0,
          bestScore: 0,
          averageAccuracy: 0,
          favoriteStack: "N/A",
        },
        [],
        {
          userId: "",
          currentStreakDays: 0,
          longestStreakDays: 0,
          totalPracticeDays: 0,
          interviewsCompleted: 0,
          logicArenaRounds: 0,
          badgesEarned: [],
          xp: 0,
          level: 1,
          weeklyProgress: {
            interviewsCompleted: 0,
            scoreDelta: 0,
            logicArenaRounds: 0,
          },
          lastPracticeAt: null,
        },
        null,
      ];

  const recentInterviews = interviews?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h2>Performance Dashboard</h2>
          <p className="text-base">
            Track your interview progress, identify weak areas, and jump back into
            practice in one click.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview">Start New Interview</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/questions">Open Question Bank</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Total Interviews</p>
            <h3 className="mt-2">{stats.totalInterviews}</h3>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Feedback Reports</p>
            <h3 className="mt-2">{stats.totalFeedback}</h3>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Average Score</p>
            <h3 className="mt-2">{stats.averageScore}/100</h3>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Strongest Category</p>
            <h3 className="mt-2 text-lg">{stats.strongestCategory}</h3>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="text-xl">Recent Interviews</h3>
            <Button asChild className="btn-secondary w-full sm:w-auto">
              <Link href="/interview">Create Interview</Link>
            </Button>
          </div>

          {recentInterviews.length === 0 ? (
            <p>No interviews yet. Create your first one to start tracking progress.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {recentInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-light-400">
                          Role
                        </p>
                        <p className="mt-1 text-white">
                          {getDisplayInterviewRole(
                            interview.role,
                            interview.techstack,
                            interview.id,
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/interview/${interview.id}`}
                        className="rounded-full border border-primary-200/40 px-3 py-1 text-sm text-primary-200 hover:bg-primary-200/10"
                      >
                        Resume
                      </Link>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-light-400">Type</p>
                        <p className="mt-1 text-white">{interview.type}</p>
                      </div>
                      <div>
                        <p className="text-light-400">Level</p>
                        <p className="mt-1 text-white">{interview.level}</p>
                      </div>
                      <div>
                        <p className="text-light-400">Questions</p>
                        <p className="mt-1 text-white">
                          {interview.questions?.length ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-light-400">
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Questions</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInterviews.map((interview) => (
                    <tr key={interview.id} className="border-b border-white/5">
                      <td className="py-3 pr-3">
                        {getDisplayInterviewRole(
                          interview.role,
                          interview.techstack,
                          interview.id,
                        )}
                      </td>
                      <td className="py-3 pr-3">{interview.type}</td>
                      <td className="py-3 pr-3">{interview.level}</td>
                      <td className="py-3 pr-3">{interview.questions?.length ?? 0}</td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/interview/${interview.id}`}
                          className="text-primary-200 hover:underline"
                        >
                          Resume
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl">Practice Momentum</h3>
              <p className="mt-1 text-sm text-light-400">
                Streaks, XP, and challenge progress from interviews and Logic Arena.
              </p>
            </div>
            <Button asChild className="btn-secondary w-full sm:w-auto">
              <Link href="/interview-history">Open History</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Current Streak</p>
              <h3 className="mt-2">{gamification.currentStreakDays} days</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Longest Streak</p>
              <h3 className="mt-2">{gamification.longestStreakDays} days</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">XP</p>
              <h3 className="mt-2">{gamification.xp}</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Level</p>
              <h3 className="mt-2">{gamification.level}</h3>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="text-lg font-semibold text-white">
                {weeklyChallenge?.name || "Weekly Challenge"}
              </h4>
              <div className="mt-4 grid gap-3">
                {(weeklyChallenge?.goals || []).map((goal) => {
                  const progress = gamification.weeklyProgress[goal.metric] || 0;
                  const percentage = Math.min(100, Math.round((progress / goal.target) * 100));

                  return (
                    <div key={goal.id} className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-light-100">{goal.label}</span>
                        <span className="text-white">
                          {progress}/{goal.target}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-primary-200"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="text-lg font-semibold text-white">Badges</h4>
              {gamification.badgesEarned.length === 0 ? (
                <p className="mt-3 text-sm text-light-400">
                  Complete interviews and arena rounds to unlock badges.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {gamification.badgesEarned.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-primary-200/30 px-3 py-1 text-sm text-primary-100"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl">Logic Arena</h3>
              <p className="mt-1 text-sm text-light-400">
                Track how often you practice coding and reasoning rounds.
              </p>
            </div>
            <Button asChild className="btn-secondary w-full sm:w-auto">
              <Link href="/logic-arena">Play Logic Arena</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Total Rounds</p>
              <h3 className="mt-2">{logicArenaStats.totalRounds}</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Best Score</p>
              <h3 className="mt-2">{logicArenaStats.bestScore}</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Average Accuracy</p>
              <h3 className="mt-2">{logicArenaStats.averageAccuracy}%</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Favorite Stack</p>
              <h3 className="mt-2 text-lg">{logicArenaStats.favoriteStack}</h3>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-semibold text-white">Recent Rounds</h4>
            {logicArenaSessions.length === 0 ? (
              <p className="mt-3 text-sm text-light-400">
                No Logic Arena rounds recorded yet. Play one round to see your stats here.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {logicArenaSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-light-400">
                          {session.stack}
                        </p>
                        <p className="mt-1 text-white">{session.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full border border-primary-200/30 px-3 py-1 text-primary-100">
                          {session.score} pts
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-light-100">
                          {session.accuracy}% accuracy
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-light-400">Mode</p>
                        <p className="mt-1 text-white">{session.mode}</p>
                      </div>
                      <div>
                        <p className="text-light-400">Difficulty</p>
                        <p className="mt-1 text-white">{session.difficulty}</p>
                      </div>
                      <div>
                        <p className="text-light-400">Correct</p>
                        <p className="mt-1 text-white">
                          {session.correctCount}/{session.questionCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-light-400">Best Streak</p>
                        <p className="mt-1 text-white">{session.bestStreak}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <h3 className="text-xl">Focus Area</h3>
          <p className="mt-3">
            Weakest category: <span className="font-semibold">{stats.weakestCategory}</span>
          </p>
          <p className="mt-1 text-sm text-light-400">
            Practice this area in your next interview to improve your average score.
          </p>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
