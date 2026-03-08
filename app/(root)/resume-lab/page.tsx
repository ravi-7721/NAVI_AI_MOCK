import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { createInterviewFromResume } from "@/lib/actions/general.action";

interface ResumeLabPageProps {
  searchParams?: {
    error?: string;
  };
}

const isUploadFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value === "string") return false;

  const file = value as Partial<File>;
  return (
    typeof file.size === "number" &&
    typeof file.text === "function" &&
    typeof file.name === "string"
  );
};

const ResumeLabPage = async ({ searchParams }: ResumeLabPageProps) => {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const submitResume = async (formData: FormData) => {
    "use server";

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      redirect("/sign-in");
    }

    const resumeTextInput = String(formData.get("resumeText") || "").trim();
    const jobDescription = String(formData.get("jobDescription") || "").trim();
    const questionCount = Number(formData.get("questionCount") || 8);

    let resumeText = resumeTextInput;

    const resumeFile = formData.get("resumeFile");
    if (!resumeText && isUploadFileLike(resumeFile) && resumeFile.size > 0) {
      const contentType = resumeFile.type?.toLowerCase() || "";
      const isPlainText =
        contentType.includes("text/plain") ||
        contentType.includes("text/markdown") ||
        resumeFile.name?.toLowerCase().endsWith(".txt") ||
        resumeFile.name?.toLowerCase().endsWith(".md");

      if (!isPlainText) {
        redirect("/resume-lab?error=Please%20upload%20a%20TXT%20or%20MD%20file.");
      }

      resumeText = (await resumeFile.text()).trim();
    }

    if (!resumeText) {
      redirect("/resume-lab?error=Resume%20content%20is%20required.");
    }

    const result = await createInterviewFromResume({
      userId: currentUser.id,
      resumeText,
      jobDescription,
      questionCount,
    });

    if (!result.success || !result.interviewId) {
      redirect(
        `/resume-lab?error=${encodeURIComponent(
          result.message || "Failed to create interview.",
        )}`,
      );
    }

    redirect(`/interview/${result.interviewId}?autostart=1`);
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h2>Resume To Interview</h2>
          <p className="text-base">
            Paste your resume and optional job description to generate a custom AI
            interview session targeted to your profile.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-secondary">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/leaderboard">Open Leaderboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {searchParams?.error && (
        <div className="rounded-xl border border-destructive-100/40 bg-destructive-100/10 p-4 text-destructive-100">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <section className="card-border w-full">
        <div className="card p-6">
          <form action={submitResume} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="resumeText" className="text-sm text-light-100">
                Resume Content
              </label>
              <textarea
                id="resumeText"
                name="resumeText"
                rows={10}
                className="!bg-dark-200 rounded-xl p-4 border border-white/10 text-white"
                placeholder="Paste resume summary, projects, skills, and experience here..."
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="resumeFile" className="text-sm text-light-100">
                Or Upload Resume (.txt/.md)
              </label>
              <input
                id="resumeFile"
                name="resumeFile"
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="rounded-xl border border-white/10 bg-dark-200 px-4 py-3 text-sm text-light-100"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="jobDescription" className="text-sm text-light-100">
                Job Description (Optional)
              </label>
              <textarea
                id="jobDescription"
                name="jobDescription"
                rows={6}
                className="!bg-dark-200 rounded-xl p-4 border border-white/10 text-white"
                placeholder="Paste the target job description to make questions more relevant..."
              />
            </div>

            <div className="grid gap-2 sm:max-w-xs">
              <label htmlFor="questionCount" className="text-sm text-light-100">
                Number of Questions
              </label>
              <input
                id="questionCount"
                name="questionCount"
                type="number"
                min={5}
                max={15}
                defaultValue={8}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="btn-primary">
                Generate Interview
              </Button>
              <Button asChild className="btn-secondary">
                <Link href="/interview">Standard Interview</Link>
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ResumeLabPage;
