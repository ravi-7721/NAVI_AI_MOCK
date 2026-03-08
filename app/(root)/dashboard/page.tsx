import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getDashboardStatsByUserId,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";
import { getDisplayInterviewRole } from "@/lib/utils";

const DashboardPage = async () => {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [stats, interviews] = userId
    ? await Promise.all([
        getDashboardStatsByUserId(userId),
        getInterviewsByUserId(userId),
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl">Recent Interviews</h3>
            <Button asChild className="btn-secondary">
              <Link href="/interview">Create Interview</Link>
            </Button>
          </div>

          {recentInterviews.length === 0 ? (
            <p>No interviews yet. Create your first one to start tracking progress.</p>
          ) : (
            <div className="overflow-x-auto">
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
          )}
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