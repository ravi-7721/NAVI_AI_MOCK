import Agent from "@/components/Agent";
import LiveCodingRound from "@/components/LiveCodingRound";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewModes } from "@/lib/actions/general.action";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    round?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const user = await getCurrentUser();
  const modes = await getInterviewModes();
  const { round } = await searchParams;
  const activeRound =
    round === "hr" ||
    round === "managerial" ||
    round === "full-loop" ||
    round === "technical" ||
    round === "live-coding"
      ? round
      : "technical";

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h3>Interview generation</h3>
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          {modes.map((mode) => (
            <Link
              key={mode.id}
              href={`/interview?round=${mode.id}`}
              className={[
                "rounded-2xl border p-4 transition-colors",
                activeRound === mode.id
                  ? "border-primary-200/40 bg-primary-200/10"
                  : "border-white/10 bg-white/5 hover:border-white/20",
              ].join(" ")}
            >
              <p className="text-sm uppercase tracking-[0.2em] text-light-400">{mode.name}</p>
              <p className="mt-2 text-sm text-white">{mode.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {activeRound === "live-coding" ? (
        <LiveCodingRound
          key={activeRound}
          userName={user?.name ?? "Candidate"}
          userId={user?.id}
        />
      ) : (
        <Agent
          key={activeRound}
          userName={user?.name ?? "Candidate"}
          userId={user?.id}
          profileImage={user?.profileURL}
          type="generate"
          roundType={activeRound}
        />
      )}
    </>
  );
};

export default Page;
