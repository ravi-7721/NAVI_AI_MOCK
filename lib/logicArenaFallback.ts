type FallbackQuestion = {
  id: string;
  stack: string;
  difficulty: string;
  mode: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  tags: string[];
};

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
const MODES = ["concept-sprint", "output-challenge", "debug-duel"] as const;
const TARGET_COUNT = 1000;

const STACK_TOPICS: Record<string, string[]> = {
  JavaScript: ["closures", "event loop", "promises", "lexical scope", "arrays", "objects"],
  TypeScript: ["union types", "type narrowing", "interfaces", "generics", "enums", "type guards"],
  Python: ["list comprehensions", "dictionaries", "generators", "functions", "tuples", "exceptions"],
  Java: ["inheritance", "interfaces", "encapsulation", "exceptions", "collections", "polymorphism"],
  C: ["pointers", "arrays", "structs", "headers", "memory", "strings"],
  "C++": ["RAII", "STL", "polymorphism", "smart pointers", "templates", "references"],
  "C#": ["async await", "LINQ", "interfaces", "nullable references", "collections", "delegates"],
  Go: ["goroutines", "channels", "interfaces", "slices", "maps", "concurrency"],
  Rust: ["ownership", "borrowing", "pattern matching", "Result", "Option", "traits"],
  PHP: ["associative arrays", "functions", "classes", "include require", "strings", "forms"],
  Ruby: ["blocks", "modules", "iterators", "symbols", "arrays", "methods"],
  Swift: ["optionals", "protocols", "structs", "guard", "collections", "functions"],
  Kotlin: ["null safety", "data classes", "higher-order functions", "sealed classes", "collections", "coroutines"],
  React: ["state", "effects", "props", "composition", "lists", "hooks"],
  "Next.js": ["App Router", "server components", "layouts", "route handlers", "navigation", "data fetching"],
  "Node.js": ["event loop", "streams", "modules", "middleware", "async flow", "request handling"],
  SQL: ["INNER JOIN", "GROUP BY", "WHERE clause", "indexes", "aggregates", "filters"],
  MongoDB: ["documents", "collections", "indexes", "aggregation pipeline", "queries", "schema flexibility"],
  HTML: ["semantic elements", "forms", "headings", "alt text", "labels", "document structure"],
  CSS: ["Flexbox", "Grid", "specificity", "media queries", "selectors", "responsive layout"],
  Git: ["commits", "branches", "rebase", "merge", "history", "workflow"],
  DevOps: ["CI pipelines", "containers", "infrastructure as code", "observability", "deployments", "automation"],
  "Data Structures": ["stacks", "queues", "hash tables", "trees", "graphs", "linked lists"],
  Algorithms: ["binary search", "two pointers", "dynamic programming", "greedy choice", "sorting", "recursion"],
  Aptitude: ["ratio", "speed distance time", "simple interest", "percentage", "averages", "profit and loss"],
  "Logical Reasoning": ["number sequence", "letter analogy", "counting puzzle", "pattern finding", "deduction", "arrangement"],
};

const topicTag = (topic: string) =>
  topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const rotateOptions = (options: string[], seed: number) => {
  const step = seed % options.length;
  return options.slice(step).concat(options.slice(0, step));
};

const buildProgrammingQuestions = (stack: string) => {
  const topics = STACK_TOPICS[stack] ?? [];
  const questions: FallbackQuestion[] = [];

  for (let i = 0; i < TARGET_COUNT; i += 1) {
    const topic = topics[i % topics.length] ?? stack;
    const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
    const mode = MODES[i % MODES.length];

    let question = "";
    let correct = "";
    let wrong: string[] = [];
    let explanation = "";

    if (mode === "concept-sprint") {
      question = `In ${stack}, which option best describes ${topic}?`;
      correct = `${topic} is a core ${stack} concept used in real problem solving.`;
      wrong = [
        `${topic} is mainly a deployment server unrelated to ${stack}.`,
        `${topic} removes the need to understand ${stack} basics.`,
        `${topic} is only a browser setting and not part of ${stack}.`,
      ];
      explanation = `${topic} is an actual ${stack} topic and should be understood in normal coding and interview work.`;
    } else if (mode === "output-challenge") {
      question = `In ${stack}, what is the best expected outcome when a developer correctly applies ${topic} in a standard scenario?`;
      correct = `The code behaves as intended according to ${stack} rules for ${topic}.`;
      wrong = [
        `The compiler always converts the result into SQL automatically.`,
        `The application must stop before evaluating ${topic}.`,
        `The result is unrelated to ${stack} semantics.`,
      ];
      explanation = `Correct use of ${topic} should follow standard ${stack} behavior rather than unrelated technology rules.`;
    } else {
      question = `A ${stack} project has a bug related to ${topic}. What is the best first fix?`;
      correct = `Inspect and correct the ${stack} logic around ${topic}.`;
      wrong = [
        `Replace the entire ${stack} codebase with another language immediately.`,
        `Ignore ${topic} because bugs in ${stack} never come from that area.`,
        `Delete all related files without checking the ${stack} logic.`,
      ];
      explanation = `The strongest first step is to debug the ${stack} logic around ${topic} directly.`;
    }

    const options = rotateOptions([correct, ...wrong], i);

    questions.push({
      id: `${stack.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${mode}-${i + 1}`,
      stack,
      difficulty,
      mode,
      question,
      options,
      answerIndex: options.indexOf(correct),
      explanation,
      tags: [topicTag(topic), stack.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
    });
  }

  return questions;
};

const buildAptitudeQuestions = () => {
  const questions: FallbackQuestion[] = [];

  for (let i = 0; i < TARGET_COUNT; i += 1) {
    const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
    const mode = MODES[i % MODES.length];
    const variant = i % 4;

    if (variant === 0) {
      const boys = 2 + (i % 6);
      const girls = 3 + (i % 5);
      const totalParts = boys + girls;
      const unit = 4 + (i % 7);
      const total = totalParts * unit;
      const answer = girls * unit;
      const options = rotateOptions(
        [`${answer}`, `${answer + unit}`, `${answer - unit}`, `${answer + boys}`],
        i,
      );

      questions.push({
        id: `aptitude-ratio-${i + 1}`,
        stack: "Aptitude",
        difficulty,
        mode,
        question: `If boys:girls = ${boys}:${girls} in a class of ${total}, how many girls are there?`,
        options,
        answerIndex: options.indexOf(`${answer}`),
        explanation: `Total parts = ${totalParts}. One part = ${unit}. Girls = ${girls} x ${unit} = ${answer}.`,
        tags: ["ratio", "math"],
      });
      continue;
    }

    if (variant === 1) {
      const speed = 25 + (i % 45);
      const time = 2 + (i % 5);
      const answer = speed * time;
      const options = rotateOptions(
        [`${answer} km`, `${answer + speed} km`, `${answer - speed} km`, `${time * 10} km`],
        i,
      );

      questions.push({
        id: `aptitude-sdt-${i + 1}`,
        stack: "Aptitude",
        difficulty,
        mode,
        question: `A vehicle moves at ${speed} km/h for ${time} hours. What distance does it cover?`,
        options,
        answerIndex: options.indexOf(`${answer} km`),
        explanation: `Distance = speed x time = ${speed} x ${time} = ${answer} km.`,
        tags: ["speed-distance-time", "math"],
      });
      continue;
    }

    if (variant === 2) {
      const principal = 800 + i * 5;
      const rate = 4 + (i % 7);
      const years = 2 + (i % 4);
      const answer = (principal * rate * years) / 100;
      const answerText = `${answer}`;
      const options = rotateOptions(
        [answerText, `${answer + rate}`, `${answer - years}`, `${principal / 10}`],
        i,
      );

      questions.push({
        id: `aptitude-interest-${i + 1}`,
        stack: "Aptitude",
        difficulty,
        mode,
        question: `Find the simple interest on ${principal} at ${rate}% for ${years} years.`,
        options,
        answerIndex: options.indexOf(answerText),
        explanation: `Simple interest = P x R x T / 100 = ${answer}.`,
        tags: ["simple-interest", "math"],
      });
      continue;
    }

    const base = 40 + (i % 40);
    const percent = 10 + (i % 25);
    const answer = (base * percent) / 100;
    const answerText = `${answer}`;
    const options = rotateOptions(
      [answerText, `${answer + 2}`, `${answer - 2}`, `${percent}`],
      i,
    );

    questions.push({
      id: `aptitude-percent-${i + 1}`,
      stack: "Aptitude",
      difficulty,
      mode,
      question: `What is ${percent}% of ${base}?`,
      options,
      answerIndex: options.indexOf(answerText),
      explanation: `${percent}% of ${base} = ${base} x ${percent} / 100 = ${answer}.`,
      tags: ["percentage", "math"],
    });
  }

  return questions;
};

const buildLogicalReasoningQuestions = () => {
  const questions: FallbackQuestion[] = [];

  for (let i = 0; i < TARGET_COUNT; i += 1) {
    const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
    const mode = MODES[i % MODES.length];
    const variant = i % 3;

    if (variant === 0) {
      const start = 2 + (i % 7);
      const d1 = 2 + (i % 4);
      const n2 = start + d1;
      const n3 = n2 + d1 + 2;
      const n4 = n3 + d1 + 4;
      const n5 = n4 + d1 + 6;
      const answer = n5 + d1 + 8;
      const answerText = `${answer}`;
      const options = rotateOptions(
        [answerText, `${answer + 2}`, `${answer - 2}`, `${answer + d1}`],
        i,
      );

      questions.push({
        id: `logic-sequence-${i + 1}`,
        stack: "Logical Reasoning",
        difficulty,
        mode,
        question: `Find the next number in the sequence: ${start}, ${n2}, ${n3}, ${n4}, ${n5}, ?`,
        options,
        answerIndex: options.indexOf(answerText),
        explanation: `The differences increase steadily, so the next term is ${answer}.`,
        tags: ["sequence", "patterns"],
      });
      continue;
    }

    if (variant === 1) {
      const a = String.fromCharCode(65 + (i % 20));
      const b = String.fromCharCode(66 + (i % 20));
      const c = String.fromCharCode(67 + (i % 20));
      const d = String.fromCharCode(68 + (i % 20));
      const answer = `${d}${String.fromCharCode(d.charCodeAt(0) + 1)}`;
      const options = rotateOptions([answer, `${c}${d}`, `${a}${b}`, `${b}${d}`], i);

      questions.push({
        id: `logic-analogy-${i + 1}`,
        stack: "Logical Reasoning",
        difficulty,
        mode,
        question: `Letter analogy: ${a}${b} is to ${b}${c} as ${c}${d} is to ?`,
        options,
        answerIndex: options.indexOf(answer),
        explanation: `Each pair shifts forward by one letter, so the answer is ${answer}.`,
        tags: ["analogy", "letters"],
      });
      continue;
    }

    const total = 18 + (i % 15);
    const knownA = 4 + (i % 5);
    const knownB = 5 + (i % 4);
    const answer = total - knownA - knownB;
    const answerText = `${answer}`;
    const options = rotateOptions(
      [answerText, `${answer + 1}`, `${answer - 1}`, `${total - knownA}`],
      i,
    );

    questions.push({
      id: `logic-count-${i + 1}`,
      stack: "Logical Reasoning",
      difficulty,
      mode,
      question: `A box has ${total} balls. ${knownA} are red and ${knownB} are blue. How many are green?`,
      options,
      answerIndex: options.indexOf(answerText),
      explanation: `Green = total - red - blue = ${total} - ${knownA} - ${knownB} = ${answer}.`,
      tags: ["deduction", "counting"],
    });
  }

  return questions;
};

export const getLargeFallbackPoolForStack = (stack: string) => {
  if (stack === "Aptitude") return buildAptitudeQuestions();
  if (stack === "Logical Reasoning") return buildLogicalReasoningQuestions();
  if (!STACK_TOPICS[stack]) return [];

  return buildProgrammingQuestions(stack);
};
