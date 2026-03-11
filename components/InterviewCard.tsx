import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";

import { Button } from "./ui/button";
import DisplayTechIcons from "./DisplayTechIcons";
import StarRating from "./StarRating";

import { cn, getDisplayInterviewRole, getInterviewCoverBySeed } from "@/lib/utils";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";

const InterviewCard = async ({
  interviewId,
  userId,
  role,
  type,
  techstack,
  createdAt,
  coverImage,
}: InterviewCardProps) => {
  const feedback =
    userId && interviewId
      ? await getFeedbackByInterviewId({
          interviewId,
          userId,
        })
      : null;

  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const badgeColor =
    {
      Behavioral: "bg-light-400",
      Mixed: "bg-light-600",
      Technical: "bg-light-800",
    }[normalizedType] || "bg-light-600";

  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now(),
  ).format("MMM D, YYYY");
  const displayRole = getDisplayInterviewRole(
    role,
    techstack,
    `${interviewId || role}-${createdAt || ""}`,
  );

  const stableCover =
    coverImage ||
    getInterviewCoverBySeed(`${interviewId || displayRole}-${createdAt || ""}`);

  return (
    <div className="card-border min-h-96 w-full max-w-[360px]">
      <div className="card-interview">
        <div>
          {/* Type Badge */}
          <div
            className={cn(
              "absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg",
              badgeColor,
            )}
          >
            <p className="badge-text ">{normalizedType}</p>
          </div>

          {/* Cover Image */}
          <Image
            src={stableCover}
            alt="cover-image"
            width={90}
            height={90}
            className="rounded-full object-fit size-[90px]"
          />

          {/* Interview Role */}
          <h3 className="mt-5 capitalize">{displayRole} Interview</h3>

          {/* Date & Score */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-5">
            <div className="flex flex-row items-center gap-2">
              <Image
                src="/calendar.svg"
                width={22}
                height={22}
                alt="calendar"
              />
              <p>{formattedDate}</p>
            </div>

            <div className="flex flex-row items-center gap-2">
              {/* visual star rating plus numeric score */}
              {feedback ? (
                <>
                  <StarRating score={feedback.totalScore} />
                  <p className="ml-1">{feedback.totalScore}/100</p>
                </>
              ) : (
                <>
                  <Image src="/star.svg" width={22} height={22} alt="star" />
                  <p>---/100</p>
                </>
              )}
            </div>
          </div>

          {/* Feedback or Placeholder Text */}
          <p className="line-clamp-2 mt-5">
            {feedback?.finalAssessment ||
              "You haven't taken this interview yet. Take it now to improve your skills."}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <DisplayTechIcons techStack={techstack} />

          <div className="flex gap-2">
            <Button asChild className="btn-primary w-full sm:w-auto">
              <Link href={`/interview/${interviewId}/feedback`}>View Report</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
