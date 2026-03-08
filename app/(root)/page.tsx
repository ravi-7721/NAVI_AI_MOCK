// dashboard is a server component so we can fetch current user + their interviews
import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Github,
  Instagram,
  MessageCircle,
  Twitter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId } from "@/lib/actions/general.action";
import { dummyInterviews } from "@/constants";

const Page = async () => {
  const user = await getCurrentUser();
  const interviews = user?.id && (await getInterviewsByUserId(user.id));
  const showDemo = !interviews || interviews.length === 0;

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {showDemo && (
        <section className="flex flex-col gap-6 mt-8">
          <h2>Your Interviews</h2>
          <div className="interviews-section">
            {dummyInterviews.map((interview, idx) => (
              <InterviewCard
                interviewId={`demo-${idx}`}
                {...interview}
                key={interview.id}
              />
            ))}
          </div>
        </section>
      )}
      {interviews && interviews.length > 0 && (
        <section className="flex flex-col gap-6 mt-8">
          <h2>Your Interviews</h2>

          <div className="interviews-section">
            {interviews.map((interview) => (
              <InterviewCard
                interviewId={interview.id}
                {...interview}
                key={interview.id}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-white/10 pt-6 pb-2">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-light-100">Connect with us</p>
          <div className="flex items-center justify-center gap-5">
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="rounded-full border border-white/20 p-2 text-white/90 hover:bg-white/10 transition-colors"
            >
              <Github className="size-5" />
            </Link>
            <Link
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-white/20 p-2 text-white/90 hover:bg-white/10 transition-colors"
            >
              <Instagram className="size-5" />
            </Link>
            <Link
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="rounded-full border border-white/20 p-2 text-white/90 hover:bg-white/10 transition-colors"
            >
              <Facebook className="size-5" />
            </Link>
            <Link
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="rounded-full border border-white/20 p-2 text-white/90 hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="size-5" />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="rounded-full border border-white/20 p-2 text-white/90 hover:bg-white/10 transition-colors"
            >
              <Twitter className="size-5" />
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Page;
