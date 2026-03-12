import { getCurrentUser } from "@/lib/actions/auth.action";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";
import StarRating from "@/components/StarRating";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    interviewId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const user = await getCurrentUser();
  const { interviewId } = await params;
  let feedback = null;

  if (user && interviewId) {
    feedback = await getFeedbackByInterviewId({
      interviewId,
      userId: user.id,
    });
  }

  // if there's no feedback we can show a demo placeholder
  const demoFeedback = {
    totalScore: 78,
    categoryScores: [
      {
        name: "Communication",
        score: 80,
        comment: "Clear and structured answers.",
      },
      { name: "Behavioral", score: 75, comment: "Good examples of past work." },
      {
        name: "Technical",
        score: 70,
        comment: "Solid knowledge but could dive deeper.",
      },
      { name: "Aptitude", score: 85, comment: "Quick thinker and adaptive." },
      {
        name: "Problem-Solving",
        score: 72,
        comment: "Approaches problems methodically.",
      },
      {
        name: "Cultural & Role Fit",
        score: 82,
        comment: "Values align with company culture.",
      },
      {
        name: "Confidence & Clarity",
        score: 77,
        comment: "Generally confident but a bit terse at times.",
      },
    ],
    strengths: ["Active listening", "Problem solving"],
    areasForImprovement: ["Explain technical details more thoroughly"],
    finalAssessment:
      "Overall a strong candidate with room to grow in technical depth.",
    fallbackUsed: false,
  };

  const data = feedback || demoFeedback;
  const candidateName = user?.name || "Candidate";

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/15 bg-black/40 p-4 shadow-[0_0_30px_rgba(255,255,255,0.06)] backdrop-blur-sm sm:p-6">
      <div className="mb-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">Interview Report</h1>
        {data.fallbackUsed && (
          <span className="rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
            Fallback Report
          </span>
        )}
      </div>
      <p className="mb-4 text-gray-300">
        Candidate: <span className="font-bold text-white">{candidateName}</span>
      </p>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <StarRating score={data.totalScore} />
        <span className="text-lg font-medium">{data.totalScore}/100</span>
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Category Scores</h2>
        <ul className="mt-2 space-y-2">
          {data.categoryScores.map((c, idx) => (
            <li key={idx} className="space-y-1">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <span className="capitalize font-medium">{c.name}</span>
                <div className="flex items-center gap-2">
                  <StarRating score={c.score} maxStars={5} />
                  <span>{c.score}/100</span>
                </div>
              </div>
              {c.comment && (
                <p className="text-sm text-gray-600">{c.comment}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Strengths</h2>
        <p>{data.strengths.join(", ")}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Areas for Improvement</h2>
        <p>{data.areasForImprovement.join(", ")}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Final Assessment</h2>
        <p>{data.finalAssessment}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/interview/${interviewId}/replay`}
          className="inline-block rounded-lg border border-primary-200/30 px-4 py-2 text-sm font-medium text-primary-100 hover:bg-primary-200/10 transition-colors"
        >
          View Replay
        </Link>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Page;
