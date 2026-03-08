import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getQuestionBankByUserId } from "@/lib/actions/general.action";
import { getDisplayInterviewRole } from "@/lib/utils";

const QuestionsPage = async () => {
  const user = await getCurrentUser();
  const questions = user?.id ? await getQuestionBankByUserId(user.id) : [];

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h2>Question Bank</h2>
          <p className="text-base">
            Revisit previously asked interview questions. Use this page as your
            revision sheet before real interviews.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview">Generate New Questions</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-border w-full sm:col-span-2 lg:col-span-1">
          <div className="card p-5">
            <p className="text-sm text-light-400">Total Questions</p>
            <h3 className="mt-2">{questions.length}</h3>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <h3 className="text-xl">All Questions</h3>

          {questions.length === 0 ? (
            <p className="mt-4">
              No saved questions yet. Start an interview to generate your first set.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {questions.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-white">
                    <span className="mr-2 text-light-400">Q{index + 1}.</span>
                    {item.question}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-light-400">
                    <span className="rounded-full border border-white/15 px-2 py-1">
                      {getDisplayInterviewRole(item.role, item.techstack, item.interviewId)}
                    </span>
                    <span className="rounded-full border border-white/15 px-2 py-1">
                      {item.type}
                    </span>
                    <span className="rounded-full border border-white/15 px-2 py-1">
                      {item.level}
                    </span>
                    <Link
                      href={`/interview/${item.interviewId}`}
                      className="rounded-full border border-primary-200/40 px-2 py-1 text-primary-200 hover:bg-primary-200/10"
                    >
                      Open Interview
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default QuestionsPage;