import { redirect } from "next/navigation";
import Link from "next/link";

import DisplayTechIcons from "@/components/DisplayTechIcons";
import { Button } from "@/components/ui/button";
import {
  getCurrentUser,
  getUserSettings,
  updateUserProfile,
} from "@/lib/actions/auth.action";
import {
  getDashboardStatsByUserId,
  getFeedbackByUserId,
  getInterviewsByUserId,
} from "@/lib/actions/general.action";

interface ProfilePageProps {
  searchParams?: Promise<{
    updated?: string;
  }>;
}

const ProfilePage = async ({ searchParams }: ProfilePageProps) => {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const userId = user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  const [settings, stats, interviews, feedback] = await Promise.all([
    getUserSettings(userId),
    getDashboardStatsByUserId(userId),
    getInterviewsByUserId(userId),
    getFeedbackByUserId(userId),
  ]);

  const recentRoles =
    interviews
      ?.slice(0, 3)
      .map((item) => item.role)
      .filter(Boolean) ?? [];

  const saveProfile = async (formData: FormData) => {
    "use server";

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      redirect("/sign-in");
    }

    const ageValue = String(formData.get("age") || "").trim();
    const parsedAge = ageValue ? Number(ageValue) : undefined;
    const dobValue = String(formData.get("dateOfBirth") || "").trim();
    const inferredAge =
      dobValue && (parsedAge === undefined || !Number.isFinite(parsedAge))
        ? Math.max(
            0,
            new Date().getFullYear() - new Date(dobValue).getFullYear(),
          )
        : parsedAge;

    await updateUserProfile(currentUser.id, {
      name: String(formData.get("name") || "").trim() || currentUser.name,
      profileURL: currentUser.profileURL || "",
      profileImage: formData.get("profileImage"),
      dateOfBirth: dobValue,
      age:
        inferredAge !== undefined && Number.isFinite(inferredAge)
          ? inferredAge
          : undefined,
      education: String(formData.get("education") || "").trim(),
      hobbies: String(formData.get("hobbies") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      personalDetails: String(formData.get("personalDetails") || "").trim(),
    });

    redirect("/profile?updated=1");
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Profile</h2>
          <p className="text-base">
            Review your preparation focus, saved defaults, and personal details in
            one place. Changes on this page are stored permanently in Firebase
            Firestore.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/settings">Edit Settings</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/analytics">Open Analytics</Link>
            </Button>
          </div>
        </div>
      </section>

      {resolvedSearchParams?.updated === "1" && (
        <div className="rounded-xl border border-success-100/40 bg-success-100/10 p-4 text-success-100">
          Personal profile updated successfully.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card-border w-full">
          <div className="card flex h-full flex-col gap-5 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-dark-300">
                {user?.profileURL ? (
                  <img
                    src={user.profileURL}
                    alt={`${user.name || "User"} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary-200">
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-light-400">Candidate</p>
                <h3 className="mt-2">{user?.name || "User"}</h3>
                <p className="mt-2 text-sm">{user?.email || "No email available"}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-light-400">Preferred Role</p>
                <p className="mt-2 text-white">{settings?.preferredRole || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-light-400">Preferred Level</p>
                <p className="mt-2 text-white">{settings?.preferredLevel || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-light-400">Interview Type</p>
                <p className="mt-2 text-white">{settings?.preferredType || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-light-400">Recent Roles</p>
                <p className="mt-2 text-white">
                  {recentRoles.length > 0 ? recentRoles.join(", ") : "No interviews yet"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-light-400">Interview Goal</p>
              <p className="mt-2 text-white">{settings?.interviewGoal || "N/A"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-light-400">Date of Birth</p>
                <p className="mt-2 text-white">{user?.dateOfBirth || "Not added"}</p>
              </div>
              <div>
                <p className="text-sm text-light-400">Age</p>
                <p className="mt-2 text-white">
                  {typeof user?.age === "number" ? user.age : "Not added"}
                </p>
              </div>
              <div>
                <p className="text-sm text-light-400">Education</p>
                <p className="mt-2 text-white">{user?.education || "Not added"}</p>
              </div>
              <div>
                <p className="text-sm text-light-400">Hobbies</p>
                <p className="mt-2 text-white">
                  {user?.hobbies?.length ? user.hobbies.join(", ") : "Not added"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-light-400">Personal Details</p>
              <p className="mt-2 text-white">{user?.personalDetails || "Not added"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="card-border w-full">
            <div className="card p-5">
              <p className="text-sm text-light-400">Total Interviews</p>
              <h3 className="mt-2">{stats?.totalInterviews ?? 0}</h3>
            </div>
          </div>
          <div className="card-border w-full">
            <div className="card p-5">
              <p className="text-sm text-light-400">Average Score</p>
              <h3 className="mt-2">{stats?.averageScore ?? 0}/100</h3>
            </div>
          </div>
          <div className="card-border w-full">
            <div className="card p-5">
              <p className="text-sm text-light-400">Reports Generated</p>
              <h3 className="mt-2">{feedback.length}</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl">Preferred Tech Stack</h3>
            <Button asChild className="btn-secondary w-full sm:w-auto">
              <Link href="/tech-stack-explorer">Explore Tech Tracks</Link>
            </Button>
          </div>
          <DisplayTechIcons techStack={settings?.preferredTechStack || []} />
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <h3 className="text-xl">Current Focus</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Strongest Category</p>
              <p className="mt-2 text-white">{stats?.strongestCategory || "N/A"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-light-400">Weakest Category</p>
              <p className="mt-2 text-white">{stats?.weakestCategory || "N/A"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl">Update Personal Info</h3>
            <p className="text-sm text-light-400">
              Add your profile photo URL and personal details after login.
            </p>
          </div>

          <form action={saveProfile} className="mt-6 grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm text-light-100">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={user?.name || ""}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm text-light-100">
                Email
              </label>
              <input
                id="email"
                name="email"
                defaultValue={user?.email || ""}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4 opacity-70"
                readOnly
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="profileImage" className="text-sm text-light-100">
                Choose Profile Photo
              </label>
              <input
                id="profileImage"
                name="profileImage"
                type="file"
                accept="image/*"
                className="rounded-xl border border-white/10 bg-dark-200 px-4 py-3 text-sm text-light-100"
              />
              <p className="text-xs text-light-400">
                Upload a JPG, PNG, or other image file. If you skip this, the current
                photo stays unchanged.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="dateOfBirth" className="text-sm text-light-100">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={user?.dateOfBirth || ""}
                  className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="age" className="text-sm text-light-100">
                  Age
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min={0}
                  max={120}
                  defaultValue={
                    typeof user?.age === "number" ? String(user.age) : ""
                  }
                  className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                  placeholder="Enter your age"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="education" className="text-sm text-light-100">
                Education
              </label>
              <input
                id="education"
                name="education"
                defaultValue={user?.education || ""}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                placeholder="B.Tech CSE, MCA, BSc IT, etc."
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="hobbies" className="text-sm text-light-100">
                Hobbies
              </label>
              <input
                id="hobbies"
                name="hobbies"
                defaultValue={user?.hobbies?.join(", ") || ""}
                className="input !bg-dark-200 !rounded-xl !min-h-11 !px-4"
                placeholder="Reading, coding, music, chess"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="personalDetails" className="text-sm text-light-100">
                Personal Details
              </label>
              <textarea
                id="personalDetails"
                name="personalDetails"
                defaultValue={user?.personalDetails || ""}
                className="min-h-32 rounded-xl border border-white/10 bg-dark-200 p-4 text-white"
                placeholder="Write a short personal summary about yourself"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="btn-primary">
                Save Personal Info
              </Button>
              <Button asChild className="btn-secondary">
                <Link href="/settings">Edit Interview Settings</Link>
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
