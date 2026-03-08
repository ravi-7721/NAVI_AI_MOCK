import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  getCurrentUser,
  getUserSettings,
  updateUserSettings,
} from "@/lib/actions/auth.action";

interface SettingsPageProps {
  searchParams?: {
    saved?: string;
  };
}

const SettingsPage = async ({ searchParams }: SettingsPageProps) => {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const settings = await getUserSettings(user.id);

  const saveSettings = async (formData: FormData) => {
    "use server";

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      redirect("/sign-in");
    }

    const preferredRole = String(formData.get("preferredRole") || "").trim();
    const preferredLevel = String(formData.get("preferredLevel") || "Mid");
    const preferredType = String(formData.get("preferredType") || "Mixed");
    const interviewGoal = String(formData.get("interviewGoal") || "").trim();
    const preferredTechStack = String(formData.get("preferredTechStack") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);

    await updateUserSettings(currentUser.id, {
      preferredRole: preferredRole || "Software Engineer",
      preferredLevel:
        preferredLevel === "Junior" ||
        preferredLevel === "Mid" ||
        preferredLevel === "Senior"
          ? preferredLevel
          : "Mid",
      preferredType:
        preferredType === "Technical" ||
        preferredType === "Behavioral" ||
        preferredType === "Mixed"
          ? preferredType
          : "Mixed",
      interviewGoal:
        interviewGoal || "Improve confidence and answer clarity.",
      preferredTechStack:
        preferredTechStack.length > 0
          ? preferredTechStack
          : ["JavaScript", "React", "Node.js"],
    });

    redirect("/settings?saved=1");
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h2>Interview Settings</h2>
          <p className="text-base">
            Set your default role, level, and tech stack so future interview
            sessions are aligned with your preparation goals.
          </p>
        </div>
      </section>

      {searchParams?.saved === "1" && (
        <div className="rounded-xl border border-success-100/40 bg-success-100/10 p-4 text-success-100">
          Settings updated successfully.
        </div>
      )}

      <section className="card-border w-full">
        <div className="card p-6">
          <form action={saveSettings} className="grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="preferredRole" className="text-sm text-light-100">
                Preferred Role
              </label>
              <input
                id="preferredRole"
                name="preferredRole"
                defaultValue={settings.preferredRole}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                placeholder="e.g., Full Stack Developer"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="preferredLevel" className="text-sm text-light-100">
                  Preferred Level
                </label>
                <select
                  id="preferredLevel"
                  name="preferredLevel"
                  defaultValue={settings.preferredLevel}
                  className="!bg-dark-200 rounded-xl min-h-11 px-4 border border-white/10 text-white"
                >
                  <option value="Junior">Junior</option>
                  <option value="Mid">Mid</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="preferredType" className="text-sm text-light-100">
                  Interview Type
                </label>
                <select
                  id="preferredType"
                  name="preferredType"
                  defaultValue={settings.preferredType}
                  className="!bg-dark-200 rounded-xl min-h-11 px-4 border border-white/10 text-white"
                >
                  <option value="Mixed">Mixed</option>
                  <option value="Technical">Technical</option>
                  <option value="Behavioral">Behavioral</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="preferredTechStack" className="text-sm text-light-100">
                Preferred Tech Stack (comma separated)
              </label>
              <input
                id="preferredTechStack"
                name="preferredTechStack"
                defaultValue={settings.preferredTechStack.join(", ")}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                placeholder="React, TypeScript, Node.js"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="interviewGoal" className="text-sm text-light-100">
                Interview Goal
              </label>
              <textarea
                id="interviewGoal"
                name="interviewGoal"
                defaultValue={settings.interviewGoal}
                className="!bg-dark-200 rounded-xl min-h-28 p-4 border border-white/10 text-white"
                placeholder="What do you want to improve?"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="btn-primary">
                Save Settings
              </Button>
              <Button asChild className="btn-secondary">
                <Link href="/interview">Start Interview</Link>
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
