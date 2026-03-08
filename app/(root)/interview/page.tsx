import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h3>Interview generation</h3>
        <Button asChild className="btn-secondary">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>

      <Agent
        userName={user?.name ?? "Candidate"}
        userId={user?.id}
        profileImage={user?.profileURL}
        type="generate"
      />
    </>
  );
};

export default Page;
