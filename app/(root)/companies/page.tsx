import Link from "next/link";

import DisplayTechIcons from "@/components/DisplayTechIcons";
import { Button } from "@/components/ui/button";

const companyTracks = [
  {
    name: "Amazon",
    role: "Full Stack Java Developer",
    focus: "DSA, scalable APIs, ownership stories, and SQL performance.",
    stack: ["HTML", "CSS", "JavaScript", "Java", "SQL", "MySQL"],
  },
  {
    name: "Adobe",
    role: "Frontend / Full Stack Engineer",
    focus: "UI quality, JavaScript depth, API integration, and product thinking.",
    stack: ["HTML", "CSS", "JavaScript", "SQL", "NoSQL"],
  },
  {
    name: "Infosys",
    role: "System Engineer",
    focus: "Core programming, OOP, DBMS, aptitude, and communication clarity.",
    stack: ["Java", "Python", "SQL", "MySQL"],
  },
  {
    name: "TCS",
    role: "Software Engineer",
    focus: "Foundations, coding basics, project explanation, and behavioral answers.",
    stack: ["HTML", "CSS", "JavaScript", "Java", "SQL"],
  },
  {
    name: "Google",
    role: "Software Engineer",
    focus: "Problem solving, system design, clean communication, and trade-offs.",
    stack: ["Java", "Python", "SQL", "NoSQL"],
  },
  {
    name: "Accenture",
    role: "Application Developer",
    focus: "Full stack fundamentals, service integration, and client-ready communication.",
    stack: ["HTML", "CSS", "JavaScript", "Java", "MySQL", "NoSQL"],
  },
] as const;

const CompaniesPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <section className="card-cta !py-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2>Companies</h2>
          <p className="text-base">
            Browse company-oriented preparation tracks and see the stacks and focus
            areas commonly associated with each one.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="btn-primary">
              <Link href="/interview">Start Company Prep</Link>
            </Button>
            <Button asChild className="btn-secondary">
              <Link href="/questions">Review Questions</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companyTracks.map((company) => (
          <div key={company.name} className="card-border w-full">
            <div className="card flex h-full flex-col gap-4 p-6">
              <div>
                <p className="text-sm text-light-400">Target Company</p>
                <h3 className="mt-2 text-xl">{company.name}</h3>
                <p className="mt-2 text-white">{company.role}</p>
              </div>
              <div>
                <p className="text-sm text-light-400">Preparation Focus</p>
                <p className="mt-2 text-white">{company.focus}</p>
              </div>
              <DisplayTechIcons techStack={[...company.stack]} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default CompaniesPage;
