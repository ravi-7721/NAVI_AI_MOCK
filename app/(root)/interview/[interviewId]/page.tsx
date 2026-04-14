import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewById } from "@/lib/actions/general.action";
import Agent from "@/components/Agent";
import InterviewModePlaceholder from "@/components/InterviewModePlaceholder";

interface PageProps {
  params: Promise<{
    interviewId: string;
  }>;
  searchParams: Promise<{
    autostart?: string;
  }>;
}

const Page = async ({ params, searchParams }: PageProps) => {
  const user = await getCurrentUser();
  const { interviewId } = await params;
  const { autostart } = await searchParams;
  let interview = null;

  if (interviewId) {
    interview = await getInterviewById(interviewId);
  }

  if (!interview) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Interview not found</h1>
        <p className="mb-4">
          This interview either does not exist or has been deleted.
        </p>
        <a href="/interview" className="text-blue-500 hover:underline">
          &larr; Back to interviews
        </a>
      </div>
    );
  }

  const isDisabledRound =
    interview.roundType === "full-loop" ||
    interview.roundType === "video" ||
    interview.roundType === "live-coding";
  const disabledMode = isDisabledRound
    ? (interview.roundType as "full-loop" | "video" | "live-coding")
    : null;

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h3>Interview generation</h3>
      </div>

      {disabledMode ? (
        <InterviewModePlaceholder
          mode={disabledMode}
          primaryHref={`/interview/${interview.id}/feedback`}
          primaryLabel="Open Feedback"
          secondaryHref="/interview-history"
          secondaryLabel="Interview History"
        />
      ) : (
        <Agent
          userName={user?.name ?? "Candidate"}
          userId={user?.id}
          profileImage={user?.profileURL}
          interviewId={interview.id}
          type="interview"
          questions={interview.questions}
          autoStart={autostart === "1"}
          roundType={interview.roundType || "technical"}
        />
      )}
    </>
  );
};

export default Page;
