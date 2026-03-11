import dayjs from "dayjs";
import Link from "next/link";

import DisplayTechIcons from "@/components/DisplayTechIcons";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getFeedbackByUserId,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";
import { getDisplayInterviewRole } from "@/lib/utils";

const InterviewHistoryPage = async () => {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [interviews, feedback] = userId
    ? await Promise.all([getInterviewsByUserId(userId), getFeedbackByUserId(userId)])
    : [[], []];

  const feedbackByInterviewId = new Map(
    feedback.map((item) => [item.interviewId, item.totalScore]),
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Interview History</h2>
          <p className="text-base">
            Browse every interview session, review the role and stack, and jump
            back into unfinished areas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview">Start Interview</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/questions">Question Bank</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {interviews?.length ? (
          interviews.map((interview) => (
            <div key={interview.id} className="card-border w-full">
              <div className="card flex flex-col gap-5 p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-light-400">
                      {dayjs(interview.createdAt).format("MMM D, YYYY h:mm A")}
                    </p>
                    <h3 className="mt-2 text-xl">
                      {getDisplayInterviewRole(
                        interview.role,
                        interview.techstack,
                        interview.id,
                      )}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-light-100">
                        {interview.type}
                      </span>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-light-100">
                        {interview.level}
                      </span>
                      <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-200">
                        Score: {feedbackByInterviewId.get(interview.id) ?? "--"}/100
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild className="btn-secondary">
                      <Link href={`/interview/${interview.id}`}>Resume</Link>
                    </Button>
                    <Button asChild className="btn-primary">
                      <Link href={`/interview/${interview.id}/feedback`}>Feedback</Link>
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-light-400">Questions Asked</p>
                  <p className="mt-2 text-white">{interview.questions?.length ?? 0}</p>
                </div>

                <DisplayTechIcons techStack={interview.techstack || []} />
              </div>
            </div>
          ))
        ) : (
          <div className="card-border w-full">
            <div className="card p-6">
              <p>No interview history yet. Start your first session to populate this page.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default InterviewHistoryPage;
