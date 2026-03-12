import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getDashboardStatsByUserId,
  getFeedbackByUserId,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";

const AnalyticsPage = async () => {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [stats, interviews, feedback] = userId
    ? await Promise.all([
        getDashboardStatsByUserId(userId),
        getInterviewsByUserId(userId),
        getFeedbackByUserId(userId),
      ])
    : [null, [], []];
  const safeInterviews = interviews ?? [];

  const recentScores = feedback.slice(0, 6).reverse();
  const categoryMap = new Map<string, { total: number; count: number }>();

  feedback.forEach((item) => {
    item.categoryScores?.forEach((category) => {
      const existing = categoryMap.get(category.name) || { total: 0, count: 0 };
      categoryMap.set(category.name, {
        total: existing.total + category.score,
        count: existing.count + 1,
      });
    });
  });

  const categoryAverages = [...categoryMap.entries()]
    .map(([name, value]) => ({
      name,
      score: Math.round(value.total / value.count),
    }))
    .sort((a, b) => b.score - a.score);

  const completionRate =
    safeInterviews.length > 0
      ? Math.round((feedback.length / Math.max(safeInterviews.length, 1)) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Analytics</h2>
          <p className="text-base">
            Track score movement, interview completion, and category-wise progress
            through simple graphs.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview-history">View History</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Average Score</p>
            <h3 className="mt-2">{stats?.averageScore ?? 0}/100</h3>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Completion Rate</p>
            <h3 className="mt-2">{completionRate}%</h3>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Strongest Area</p>
            <h3 className="mt-2 text-lg">{stats?.strongestCategory ?? "N/A"}</h3>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-5">
            <p className="text-sm text-light-400">Weakest Area</p>
            <h3 className="mt-2 text-lg">{stats?.weakestCategory ?? "N/A"}</h3>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Recent Score Trend</h3>
            <div className="mt-5 grid gap-4">
              {recentScores.length > 0 ? (
                recentScores.map((item, index) => (
                  <div key={item.id} className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-light-400">Attempt {index + 1}</span>
                      <span className="text-white">{item.totalScore}/100</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10">
                      <div
                        className="h-3 rounded-full bg-primary-200"
                        style={{ width: `${item.totalScore}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p>No report data yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Category Graph</h3>
            <div className="mt-5 grid gap-4">
              {categoryAverages.length > 0 ? (
                categoryAverages.map((item) => (
                  <div key={item.name} className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-light-400">{item.name}</span>
                      <span className="text-white">{item.score}</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10">
                      <div
                        className="h-3 rounded-full bg-success-100"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p>No category data available yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;
