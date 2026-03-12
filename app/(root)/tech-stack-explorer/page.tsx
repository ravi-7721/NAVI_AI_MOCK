import Link from "next/link";

import DisplayTechIcons from "@/components/DisplayTechIcons";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewsByUserId } from "@/lib/actions/general.action";

const TechStackExplorerPage = async () => {
  const user = await getCurrentUser();
  const interviews = (user?.id ? await getInterviewsByUserId(user.id) : []) ?? [];

  const techMap = new Map<
    string,
    { count: number; roles: Set<string>; types: Set<string> }
  >();

  interviews.forEach((interview) => {
    interview.techstack?.forEach((tech) => {
      const existing = techMap.get(tech) || {
        count: 0,
        roles: new Set<string>(),
        types: new Set<string>(),
      };

      existing.count += 1;
      existing.roles.add(interview.role);
      existing.types.add(interview.type);
      techMap.set(tech, existing);
    });
  });

  const techEntries = [...techMap.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      roles: [...value.roles].slice(0, 3),
      types: [...value.types].join(", "),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Tech Stack Explorer</h2>
          <p className="text-base">
            Explore the technologies appearing across your interviews and identify
            which stacks you practice most often.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/resume-lab">Generate Resume-Based Stack</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <h3 className="text-xl">Core Technologies</h3>
          <div className="mt-4">
            <DisplayTechIcons
              techStack={[
                "HTML",
                "CSS",
                "JavaScript",
                "Java",
                "Python",
                "SQL",
                "MySQL",
                "NoSQL",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {techEntries.length > 0 ? (
          techEntries.map((item) => (
            <div key={item.name} className="card-border w-full">
              <div className="card flex h-full flex-col gap-4 p-6">
                <DisplayTechIcons techStack={[item.name]} />
                <div>
                  <p className="text-sm text-light-400">Seen In Interviews</p>
                  <h3 className="mt-2 text-xl">{item.count}</h3>
                </div>
                <div>
                  <p className="text-sm text-light-400">Common Roles</p>
                  <p className="mt-2 text-white">{item.roles.join(", ") || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-light-400">Interview Types</p>
                  <p className="mt-2 text-white">{item.types || "N/A"}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card-border w-full md:col-span-2 xl:col-span-3">
            <div className="card p-6">
              <p>
                No tech stack data yet. Complete interviews or generate one from your
                resume to populate this explorer.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default TechStackExplorerPage;
