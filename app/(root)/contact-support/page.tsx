import Link from "next/link";

import { Button } from "@/components/ui/button";

const ContactSupportPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Contact & Support</h2>
          <p className="text-base">
            Reach out for help with account access, interview flow issues, report
            generation, or project demo questions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="mailto:support@aimockinterview.local">Email Support</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/faq">Open FAQ</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Technical Support</h3>
            <p className="mt-3">Microphone access, browser compatibility, login, and session issues.</p>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Interview Support</h3>
            <p className="mt-3">Problems with question generation, resume interviews, or feedback reports.</p>
          </div>
        </div>
        <div className="card-border w-full">
          <div className="card p-6">
            <h3 className="text-xl">Project Demo</h3>
            <p className="mt-3">Use this section during college presentation to explain platform scope and help flow.</p>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card grid gap-4 p-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-light-400">Support Email</p>
            <p className="mt-2 text-white">support@aimockinterview.local</p>
          </div>
          <div>
            <p className="text-sm text-light-400">Response Window</p>
            <p className="mt-2 text-white">Within 24 hours for demo and project queries.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactSupportPage;
