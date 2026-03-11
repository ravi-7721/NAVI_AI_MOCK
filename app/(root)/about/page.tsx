import Link from "next/link";

import { Button } from "@/components/ui/button";

const AboutPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>About</h2>
          <p className="text-base">
            This AI interview preparation platform helps candidates practice role-based
            interviews, generate feedback, and monitor improvement across sessions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview">Try an Interview</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/contact-support">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Practice</h3>
            <p className="mt-3">Generate interviews by role, stack, resume, or saved preferences.</p>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Analyze</h3>
            <p className="mt-3">Review feedback, category scores, and trends after every session.</p>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Improve</h3>
            <p className="mt-3">Use analytics, question history, and tech tracking to study smarter.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
