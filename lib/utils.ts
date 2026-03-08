import { interviewCovers, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const normalizeTechName = (tech: string) => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return mappings[key as keyof typeof mappings];
};

const checkIconExists = async (url: string) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok; // Returns true if the icon exists
  } catch {
    return false;
  }
};

export const getTechLogos = async (techArray: string[]) => {
  const logoURLs = techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    return {
      tech,
      url: `${techIconBaseURL}/${normalized}/${normalized}-original.svg`,
    };
  });

  const results = await Promise.all(
    logoURLs.map(async ({ tech, url }) => ({
      tech,
      url: (await checkIconExists(url)) ? url : "/tech.svg",
    }))
  );

  return results;
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};

const hashString = (value: string) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

const FALLBACK_INTERVIEW_ROLES = [
  "Software Engineer",
  "Marketing Manager",
  "Accountant",
  "HR Specialist",
  "Sales Representative",
] as const;

export const getInterviewCoverBySeed = (seed?: string) => {
  if (!seed) return getRandomInterviewCover();

  const idx = hashString(seed) % interviewCovers.length;
  return `/covers${interviewCovers[idx]}`;
};

export const getFallbackInterviewRoleBySeed = (seed?: string) => {
  if (!seed) return FALLBACK_INTERVIEW_ROLES[0];

  const idx = hashString(seed) % FALLBACK_INTERVIEW_ROLES.length;
  return FALLBACK_INTERVIEW_ROLES[idx];
};

export const getDisplayInterviewRole = (
  role?: string,
  techstack: string[] = [],
  seed?: string,
) => {
  const rawRole = (role || "").trim();
  if (rawRole && !/general interview/i.test(rawRole)) return rawRole;

  const text = techstack.join(" ").toLowerCase();
  const hasJava = /\bjava\b|spring/.test(text);
  const hasPython = /\bpython\b|django|flask|fastapi/.test(text);
  const hasDotnet = /\.net|c#|asp\.net/.test(text);
  const hasFrontend = /react|next|angular|vue|frontend|ui/.test(text);
  const hasBackend = /node|api|sql|database|backend|server/.test(text);

  if (hasJava && (hasFrontend || hasBackend)) return "Full Stack Java Developer";
  if (hasPython && (hasFrontend || hasBackend))
    return "Full Stack Python Developer";
  if (hasDotnet && (hasFrontend || hasBackend)) return "Full Stack .NET Developer";
  if (hasJava) return "Java Developer";
  if (hasPython) return "Python Developer";
  if (hasDotnet) return ".NET Developer";
  if (hasFrontend && hasBackend) return "Full Stack Developer";

  return getFallbackInterviewRoleBySeed(seed || `${rawRole}-${text}`);
};
