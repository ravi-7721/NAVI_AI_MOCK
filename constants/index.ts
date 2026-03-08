import { z } from "zod";

export const mappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  ".net": "dotnetcore",
  dotnet: "dotnetcore",
  "asp.net": "dotnetcore",
  aspnet: "dotnetcore",
  csharp: "csharp",
  "c#": "csharp",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  java: "java",
  spring: "spring",
  springboot: "spring",
  python: "python",
  django: "django",
  flask: "flask",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

// export const interviewer: CreateAssistantDTO = {
//   name: "Interviewer",
//   firstMessage:
//     "Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience.",
//   transcriber: {
//     provider: "deepgram",
//     model: "nova-2",
//     language: "en",
//   },
//   voice: {
//     provider: "11labs",
//     voiceId: "sarah",
//     stability: 0.4,
//     similarityBoost: 0.8,
//     speed: 0.9,
//     style: 0.5,
//     useSpeakerBoost: true,
//   },
//   model: {
//     provider: "openai",
//     model: "gpt-4",
//     messages: [
//       {
//         role: "system",
//         content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

// Interview Guidelines:
// Follow the structured question flow:
// {{questions}}

// Engage naturally & react appropriately:
// Listen actively to responses and acknowledge them before moving forward.
// Ask brief follow-up questions if a response is vague or requires more detail.
// Keep the conversation flowing smoothly while maintaining control.
// Be professional, yet warm and welcoming:

// Use official yet friendly language.
// Keep responses concise and to the point (like in a real voice interview).
// Avoid robotic phrasing—sound natural and conversational.
// Answer the candidate’s questions professionally:

// If asked about the role, company, or expectations, provide a clear and relevant answer.
// If unsure, redirect the candidate to HR for more details.

// Conclude the interview properly:
// Thank the candidate for their time.
// Inform them that the company will reach out soon with feedback.
// End the conversation on a polite and positive note.

// - Be sure to be professional and polite.
// - Keep all your responses short and simple. Use official language, but be kind and welcoming.
// - This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.`,
//       },
//     ],
//   },
// };

export const feedbackSchema = z.object({
  totalScore: z.number().min(0).max(100),
  categoryScores: z
    .array(
      z.object({
        name: z.string().min(1),
        score: z.number().min(0).max(100),
        comment: z.string().min(1),
      }),
    )
    .min(5)
    .max(10),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

export const interviewCovers = [
  "/adobe.png",
  "/amazon.png",
  "/facebook.png",
  "/hostinger.png",
  "/pinterest.png",
  "/quora.png",
  "/reddit.png",
  "/skype.png",
  "/spotify.png",
  "/telegram.png",
  "/tiktok.png",
  "/yahoo.png",
];

export const dummyInterviews: Interview[] = [
  {
    id: "1",
    userId: "user1",
    role: "Frontend Developer",
    type: "Technical",
    techstack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    level: "Junior",
    questions: ["What is React?"],
    finalized: false,
    createdAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "2",
    userId: "user1",
    role: "Full Stack Developer",
    type: "Mixed",
    techstack: ["Node.js", "Express", "MongoDB", "React"],
    level: "Senior",
    questions: ["What is Node.js?"],
    finalized: false,
    createdAt: "2024-03-14T15:30:00Z",
  },
  {
    id: "3",
    userId: "user1",
    role: "Full Stack Java Developer",
    type: "Mixed",
    techstack: ["Java", "Spring Boot", "React", "PostgreSQL"],
    level: "Mid",
    questions: ["What is dependency injection in Spring?"],
    finalized: false,
    createdAt: "2024-03-13T12:00:00Z",
    coverImage: "/covers/amazon.png",
  },
  {
    id: "4",
    userId: "user1",
    role: "Full Stack .NET Developer",
    type: "Technical",
    techstack: ["C#", ".NET", "Angular", "SQL Server"],
    level: "Mid",
    questions: ["Explain middleware in ASP.NET Core."],
    finalized: false,
    createdAt: "2024-03-12T09:00:00Z",
    coverImage: "/covers/facebook.png",
  },
  {
    id: "5",
    userId: "user1",
    role: "Full Stack Python Developer",
    type: "Mixed",
    techstack: ["Python", "Django", "React", "PostgreSQL"],
    level: "Mid",
    questions: ["How does Django ORM help in development?"],
    finalized: false,
    createdAt: "2024-03-11T11:00:00Z",
    coverImage: "/covers/reddit.png",
  },
];

export const interviewTemplates = [
  {
    id: "frontend-react",
    role: "Frontend Developer",
    level: "Junior",
    type: "Technical",
    techstack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    questions: [
      "What are React hooks and why are they useful?",
      "Explain server-side rendering in Next.js.",
      "How do you optimize performance in a React app?",
      "How do you handle state in large frontend applications?",
      "What are the benefits of TypeScript in frontend development?",
    ],
  },
  {
    id: "fullstack-java",
    role: "Full Stack Java Developer",
    level: "Mid",
    type: "Mixed",
    techstack: ["Java", "Spring Boot", "React", "PostgreSQL"],
    questions: [
      "How does dependency injection work in Spring Boot?",
      "How would you secure REST APIs in a Java backend?",
      "How do you structure communication between React and Spring services?",
      "How do you optimize SQL queries in PostgreSQL?",
      "Describe an end-to-end full stack Java project you built.",
    ],
  },
  {
    id: "fullstack-dotnet",
    role: "Full Stack .NET Developer",
    level: "Mid",
    type: "Technical",
    techstack: ["C#", ".NET", "Angular", "SQL Server"],
    questions: [
      "What is middleware in ASP.NET Core?",
      "How do you implement authentication in a .NET API?",
      "How do you design layered architecture in a .NET app?",
      "How do you handle database migrations in SQL Server projects?",
      "How do you debug performance bottlenecks in .NET services?",
    ],
  },
  {
    id: "fullstack-python",
    role: "Full Stack Python Developer",
    level: "Mid",
    type: "Mixed",
    techstack: ["Python", "Django", "React", "PostgreSQL"],
    questions: [
      "How does Django ORM work and when would you use raw SQL?",
      "How do you build and secure APIs in Django?",
      "How do you connect React frontend with Python backend cleanly?",
      "How do you handle caching in Python web apps?",
      "Describe a production issue you solved in a Python project.",
    ],
  },
] as const;
