import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewById } from "@/lib/actions/general.action";
import Agent from "@/components/Agent";
import { getDisplayInterviewRole } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: {
    interviewId: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const user = await getCurrentUser();
  const interviewId = params.interviewId;
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
  const displayRole = getDisplayInterviewRole(
    interview.role,
    interview.techstack,
    interview.id,
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">{displayRole} Interview</h1>
        <Button asChild className="btn-secondary">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>

      <Agent
        userName={user?.name ?? "Candidate"}
        userId={user?.id}
        profileImage={user?.profileURL}
        interviewId={interview.id}
        type="interview"
        questions={interview.questions}
      />
    </div>
  );
};

export default Page;
