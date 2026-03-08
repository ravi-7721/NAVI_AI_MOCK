import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getCompetitiveLeaderboard } from "@/lib/actions/general.action";

const LeaderboardPage = async () => {
  const user = await getCurrentUser();
  const leaderboard = await getCompetitiveLeaderboard(25);

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h2>Competitive Leaderboard</h2>
          <p className="text-base">
            Rankings are based on average score, consistency, and improvement trend.
            Use it to benchmark your progress against other candidates.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview">Attempt New Interview</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl">Top Candidates</h3>
            <p className="text-sm text-light-400">Updated from live interview data</p>
          </div>

          {leaderboard.length === 0 ? (
            <p>No leaderboard data yet. Complete interviews to populate rankings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-light-400">
                    <th className="py-2 pr-3">Rank</th>
                    <th className="py-2 pr-3">Candidate</th>
                    <th className="py-2 pr-3">Competitive Score</th>
                    <th className="py-2 pr-3">Avg Score</th>
                    <th className="py-2 pr-3">Improvement</th>
                    <th className="py-2 pr-3">Consistency</th>
                    <th className="py-2 pr-3">Interviews</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    const isMe = user?.id === entry.userId;

                    return (
                      <tr
                        key={entry.userId}
                        className={[
                          "border-b border-white/5",
                          isMe ? "bg-primary-200/10" : "",
                        ].join(" ")}
                      >
                        <td className="py-3 pr-3 font-semibold">#{entry.rank}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span className="text-white">
                              {entry.name} {isMe ? "(You)" : ""}
                            </span>
                            {entry.email && (
                              <span className="text-xs text-light-400">{entry.email}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-semibold text-primary-200">
                          {entry.competitiveScore}
                        </td>
                        <td className="py-3 pr-3">{entry.averageScore}/100</td>
                        <td className="py-3 pr-3">+{entry.improvementScore}</td>
                        <td className="py-3 pr-3">{entry.consistencyScore}</td>
                        <td className="py-3 pr-3">{entry.interviews}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LeaderboardPage;
