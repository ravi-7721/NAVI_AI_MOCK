import dayjs from "dayjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser, getUserSettings } from "@/lib/actions/auth.action";
import {
  getDashboardStatsByUserId,
  getFeedbackByUserId,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";

const NotificationsPage = async () => {
  const user = await getCurrentUser();
  const userId = user?.id;

  const [settings, stats, interviews, feedback] = userId
    ? await Promise.all([
        getUserSettings(userId),
        getDashboardStatsByUserId(userId),
        getInterviewsByUserId(userId),
        getFeedbackByUserId(userId),
      ])
    : [null, null, [], []];

  const latestInterview = interviews[0];
  const latestFeedback = feedback[0];
  const previousFeedback = feedback[1];

  const notifications = [
    settings && {
      title: "Preparation preferences saved",
      message: `Your current setup targets ${settings.preferredRole} (${settings.preferredLevel}, ${settings.preferredType}).`,
      tag: "Selection",
    },
    settings?.preferredTechStack?.length && {
      title: "Tech stack selection active",
      message: `You selected ${settings.preferredTechStack.join(", ")} for your prep profile.`,
      tag: "Tech Stack",
    },
    latestInterview && {
      title: "Latest interview created",
      message: `${latestInterview.role} interview added on ${dayjs(latestInterview.createdAt).format("MMM D, YYYY h:mm A")}.`,
      tag: "Interview",
    },
    latestFeedback && {
      title: "New feedback available",
      message: `Your latest interview report scored ${latestFeedback.totalScore}/100.`,
      tag: "Feedback",
    },
    latestFeedback &&
      previousFeedback && {
        title: "Progress update",
        message: `Your score changed by ${latestFeedback.totalScore - previousFeedback.totalScore} points between the last two reports.`,
        tag: "Progress",
      },
    stats?.weakestCategory &&
      stats.weakestCategory !== "N/A" && {
        title: "Recommended next focus",
        message: `Spend extra time on ${stats.weakestCategory} before the next mock interview.`,
        tag: "Recommendation",
      },
  ].filter(Boolean) as Array<{ title: string; message: string; tag: string }>;

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Notifications</h2>
          <p className="text-base">
            Review app activity, saved selections, and personalized preparation
            reminders based on your latest work.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/settings">Update Preferences</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/analytics">View Progress</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div key={`${item.tag}-${item.title}`} className="card-border w-full">
              <div className="card flex flex-col gap-3 p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-primary-200/30 px-3 py-1 text-xs text-primary-200">
                    {item.tag}
                  </span>
                  <h3 className="text-xl">{item.title}</h3>
                </div>
                <p className="text-white">{item.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="card-border w-full">
            <div className="card p-6">
              <p>No notifications yet.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationsPage;
