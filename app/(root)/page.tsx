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

import InterviewCard from "@/components/InterviewCard";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  ensureDefaultInterviewsForUser,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";

const Page = async () => {
  const user = await getCurrentUser();
  let interviews: Interview[] | null = null;

  if (user?.id) {
    await ensureDefaultInterviewsForUser(user.id);
    interviews = await getInterviewsByUserId(user.id);
  }

  const videoInterviews = (interviews ?? []).filter(
    (interview) => interview.roundType === "video",
  );
  const standardInterviews = (interviews ?? []).filter(
    (interview) => interview.roundType !== "video",
  );

  const renderInterviewSection = (
    title: string,
    description: string,
    items: Interview[],
  ) => {
    if (items.length === 0) return null;

    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2>{title}</h2>
          <p className="text-sm text-light-400">{description}</p>
        </div>

        <div className="interviews-section">
          {items.map((interview) => (
            <InterviewCard
              interviewId={interview.id}
              {...interview}
              key={interview.id}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary max-sm:w-full">
              <Link href="/interview">Start an Interview</Link>
            </Button>
          </div>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="mx-auto h-auto w-full max-w-[240px] sm:max-w-[300px] lg:max-w-[400px]"
        />
      </section>

      {interviews && interviews.length > 0 && (
        <div className="mt-8 flex flex-col gap-8">
          {renderInterviewSection(
            "Video Interviews",
            "Camera-on interview sessions with dedicated video screening practice.",
            videoInterviews,
          )}

          {renderInterviewSection(
            "Your Interviews",
            "All of your saved practice sessions across HR, technical, and mixed rounds.",
            standardInterviews,
          )}
        </div>
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
