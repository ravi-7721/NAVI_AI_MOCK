import Link from "next/link";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getAnswerCoachingForInterview,
  getInterviewReplayByInterviewId,
} from "@/lib/actions/general.action";

interface PageProps {
  params: Promise<{
    interviewId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const user = await getCurrentUser();
  const { interviewId } = await params;

  if (!user?.id) {
    return null;
  }

  const [replay, coaching] = await Promise.all([
    getInterviewReplayByInterviewId({ interviewId, userId: user.id }),
    getAnswerCoachingForInterview({ interviewId, userId: user.id }),
  ]);

  const coachingByQuestionId = new Map(coaching.map((item) => [item.questionId, item]));

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Interview Replay</h2>
          <p className="text-base">
            Review each question, your answer, and the coaching that shaped the next step.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/interview/${interviewId}/feedback`} className="btn-primary">
              Back to Feedback
            </Link>
            <Link href="/interview-history" className="btn-secondary">
              Interview History
            </Link>
          </div>
        </div>
      </section>

      {!replay ? (
        <section className="card-border w-full">
          <div className="card p-6">
            <p>No replay data is available for this interview yet.</p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          {replay.qaLog.map((item, index) => {
            const itemCoaching = coachingByQuestionId.get(item.id);

            return (
              <div key={item.id} className="card-border w-full">
                <div className="card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-100">
                      Q{index + 1}
                    </span>
                    {item.wasFollowUp ? (
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-light-100">
                        Follow-up
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-lg text-white">{item.question}</h3>
                  {item.codingSummary ? (
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-light-400">Attempts</p>
                          <p className="mt-1 text-white">
                            {item.codingSummary.attemptCount ?? "--"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-light-400">Hints Used</p>
                          <p className="mt-1 text-white">
                            {item.codingSummary.hintCount ?? "--"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-light-400">Sample Checks</p>
                          <p className="mt-1 text-white">
                            {item.codingSummary.visiblePassedChecks ?? item.codingSummary.passedChecks}/
                            {item.codingSummary.visibleTotalChecks ?? item.codingSummary.totalChecks}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-light-400">Hidden Checks</p>
                          <p className="mt-1 text-white">
                            {item.codingSummary.hiddenPassedChecks ?? 0}/
                            {item.codingSummary.hiddenTotalChecks ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-light-400">Code submission</p>
                          <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-100">
                            {item.codingSummary.passedChecks}/{item.codingSummary.totalChecks} checks
                          </span>
                        </div>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-primary-100">
                          <code>{item.codingSummary.code}</code>
                        </pre>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-light-400">Approach</p>
                        <p className="mt-2 text-light-100">
                          {item.codingSummary.explanation || "(No explanation provided)"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-light-400">Check results</p>
                        <div className="mt-3 grid gap-2">
                          {item.codingSummary.checkResults.map((check) => (
                            <div
                              key={check.id}
                              className="rounded-xl border border-white/10 bg-black/20 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-white">{check.title}</p>
                                <span
                                  className={[
                                    "rounded-full border px-3 py-1 text-xs",
                                    check.passed
                                      ? "border-emerald-400/30 text-emerald-300"
                                      : "border-red-400/30 text-red-300",
                                  ].join(" ")}
                                >
                                  {check.passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-light-100">{check.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 text-light-100">{item.answer || "(No answer)"}</p>
                      {item.deliveryMetrics ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-light-400">Confidence</p>
                            <p className="mt-1 text-white">
                              {item.deliveryMetrics.confidenceScore}/100
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-light-400">Pace</p>
                            <p className="mt-1 text-white">
                              {item.deliveryMetrics.wordsPerMinute} wpm
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-light-400">Fillers</p>
                            <p className="mt-1 text-white">{item.deliveryMetrics.fillerCount}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-light-400">Pauses</p>
                            <p className="mt-1 text-white">{item.deliveryMetrics.pauseCount}</p>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}

                  {itemCoaching ? (
                    <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-sm text-light-400">Overall</p>
                          <p className="mt-1 text-white">{itemCoaching.overallScore}/100</p>
                        </div>
                        <div>
                          <p className="text-sm text-light-400">Clarity</p>
                          <p className="mt-1 text-white">{itemCoaching.clarityScore}</p>
                        </div>
                        <div>
                          <p className="text-sm text-light-400">Relevance</p>
                          <p className="mt-1 text-white">{itemCoaching.relevanceScore}</p>
                        </div>
                        <div>
                          <p className="text-sm text-light-400">Depth</p>
                          <p className="mt-1 text-white">{itemCoaching.depthScore}</p>
                        </div>
                      </div>

                      <p className="text-sm text-white">{itemCoaching.quickTip}</p>

                      {itemCoaching.deliveryNote ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-sm text-light-400">Delivery note</p>
                          <p className="mt-2 text-light-100">{itemCoaching.deliveryNote}</p>
                        </div>
                      ) : null}

                      {itemCoaching.improvedAnswer ? (
                        <div className="rounded-2xl border border-primary-200/20 bg-primary-200/8 p-4">
                          <p className="text-sm text-light-400">Stronger answer</p>
                          <p className="mt-2 text-light-100">{itemCoaching.improvedAnswer}</p>
                        </div>
                      ) : null}

                      {itemCoaching.suggestedFollowUpQuestion ? (
                        <p className="text-sm text-light-100">
                          Suggested follow-up: {itemCoaching.suggestedFollowUpQuestion}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default Page;
