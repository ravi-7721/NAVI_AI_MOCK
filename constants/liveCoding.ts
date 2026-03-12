type LanguageOption = {
  id: CodingLanguage;
  label: string;
  shortLabel: string;
  description: string;
};

type StarterTemplateConfig = {
  defaultEntryPoint: string;
  entryPointByLanguage?: Partial<Record<CodingLanguage, string>>;
  parameters: CodingChallengeParameter[];
  returnType: CodingValueType;
  commentLines: string[];
};

type ChallengeConfig = Omit<
  CodingChallenge,
  "starterCodeByLanguage" | "supportedLanguages"
> & {
  commentLines: string[];
};

const INDENT = "  ";

const CODING_LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  go: "Go",
  ruby: "Ruby",
};

export const CODING_LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: "javascript",
    label: "JavaScript",
    shortLabel: "JS",
    description: "Fast local checks with the Node runtime.",
  },
  {
    id: "python",
    label: "Python",
    shortLabel: "Py",
    description: "Great for concise algorithmic problem solving.",
  },
  {
    id: "java",
    label: "Java",
    shortLabel: "Java",
    description: "Structured class-based solutions with static typing.",
  },
  {
    id: "go",
    label: "Go",
    shortLabel: "Go",
    description: "Simple, explicit implementations with slices and maps.",
  },
  {
    id: "ruby",
    label: "Ruby",
    shortLabel: "Rb",
    description: "Expressive solutions with clean collection helpers.",
  },
];

const SUPPORTED_CODING_LANGUAGES = CODING_LANGUAGE_OPTIONS.map((option) => option.id);

const buildCommentBlock = (
  lines: string[],
  prefix: string,
  indent = INDENT,
  fallback = "Implement your solution here.",
) =>
  (lines.length > 0 ? lines : [fallback])
    .map((line) => `${indent}${prefix} ${line}`)
    .join("\n");

const getJavaType = (type: CodingValueType) => {
  switch (type) {
    case "number":
      return "int";
    case "boolean":
      return "boolean";
    case "string":
      return "String";
    case "number[]":
      return "int[]";
    case "string[]":
      return "String[]";
    default:
      return "Object";
  }
};

const getGoType = (type: CodingValueType) => {
  switch (type) {
    case "number":
      return "int";
    case "boolean":
      return "bool";
    case "string":
      return "string";
    case "number[]":
      return "[]int";
    case "string[]":
      return "[]string";
    default:
      return "interface{}";
  }
};

const getLanguageDefaultReturn = (type: CodingValueType, language: CodingLanguage) => {
  switch (type) {
    case "number":
      return "0";
    case "boolean":
      return language === "python" ? "False" : "false";
    case "string":
      return '""';
    case "number[]":
      if (language === "java") return "new int[] {}";
      if (language === "go") return "[]int{}";
      return "[]";
    case "string[]":
      if (language === "java") return "new String[] {}";
      if (language === "go") return "[]string{}";
      return "[]";
    default:
      return language === "python" ? "None" : "null";
  }
};

const getEntryPoint = (
  defaultEntryPoint: string,
  language: CodingLanguage,
  entryPointByLanguage?: Partial<Record<CodingLanguage, string>>,
) => entryPointByLanguage?.[language] ?? defaultEntryPoint;

const buildJavaScriptStarter = ({
  defaultEntryPoint,
  parameters,
  returnType,
  commentLines,
}: StarterTemplateConfig) => {
  const args = parameters.map((parameter) => parameter.name).join(", ");
  const fallbackReturn =
    returnType === "number[]" || returnType === "string[]" ? "\n\n  return [];" : "";

  return `function ${defaultEntryPoint}(${args}) {
${buildCommentBlock(commentLines, "//")}
${fallbackReturn}
}`;
};

const buildPythonStarter = ({
  defaultEntryPoint,
  entryPointByLanguage,
  parameters,
  returnType,
  commentLines,
}: StarterTemplateConfig) => {
  const entryPoint = getEntryPoint(defaultEntryPoint, "python", entryPointByLanguage);
  const args = parameters.map((parameter) => parameter.name).join(", ");

  return `def ${entryPoint}(${args}):
${buildCommentBlock(commentLines, "#", INDENT)}
  return ${getLanguageDefaultReturn(returnType, "python")}`;
};

const buildJavaStarter = ({
  defaultEntryPoint,
  parameters,
  returnType,
  commentLines,
}: StarterTemplateConfig) => {
  const args = parameters
    .map((parameter) => `${getJavaType(parameter.type)} ${parameter.name}`)
    .join(", ");

  return `import java.util.*;

class Solution {
  static ${getJavaType(returnType)} ${defaultEntryPoint}(${args}) {
${buildCommentBlock(commentLines, "//", INDENT.repeat(2))}
    return ${getLanguageDefaultReturn(returnType, "java")};
  }
}`;
};

const buildGoStarter = ({
  defaultEntryPoint,
  parameters,
  returnType,
  commentLines,
}: StarterTemplateConfig) => {
  const args = parameters
    .map((parameter) => `${parameter.name} ${getGoType(parameter.type)}`)
    .join(", ");

  return `package main

func ${defaultEntryPoint}(${args}) ${getGoType(returnType)} {
${buildCommentBlock(commentLines, "//", INDENT)}
  return ${getLanguageDefaultReturn(returnType, "go")}
}`;
};

const buildRubyStarter = ({
  defaultEntryPoint,
  entryPointByLanguage,
  parameters,
  returnType,
  commentLines,
}: StarterTemplateConfig) => {
  const entryPoint = getEntryPoint(defaultEntryPoint, "ruby", entryPointByLanguage);
  const args = parameters.map((parameter) => parameter.name).join(", ");

  return `def ${entryPoint}(${args})
${buildCommentBlock(commentLines, "#", INDENT)}
  ${getLanguageDefaultReturn(returnType, "ruby")}
end`;
};

const buildStarterCodeByLanguage = (config: StarterTemplateConfig) => ({
  javascript: buildJavaScriptStarter(config),
  python: buildPythonStarter(config),
  java: buildJavaStarter(config),
  go: buildGoStarter(config),
  ruby: buildRubyStarter(config),
});

const createChallenge = ({
  commentLines,
  entryPointByLanguage,
  ...challenge
}: ChallengeConfig): CodingChallenge => ({
  ...challenge,
  starterCodeByLanguage: buildStarterCodeByLanguage({
    defaultEntryPoint: challenge.functionName,
    entryPointByLanguage,
    parameters: challenge.parameters,
    returnType: challenge.returnType,
    commentLines,
  }),
  entryPointByLanguage,
  supportedLanguages: SUPPORTED_CODING_LANGUAGES,
});

export const getCodingLanguageLabel = (language: CodingLanguage) =>
  CODING_LANGUAGE_LABELS[language];

export const getCodingTechstack = (language: CodingLanguage) => [
  CODING_LANGUAGE_LABELS[language],
  "Algorithms",
  "Data Structures",
];

export const getChallengeEntryPoint = (
  challenge: CodingChallenge,
  language: CodingLanguage,
) => challenge.entryPointByLanguage?.[language] ?? challenge.functionName;

export const getStarterCode = (
  challenge: CodingChallenge,
  language: CodingLanguage,
) => challenge.starterCodeByLanguage[language] || challenge.starterCodeByLanguage.javascript;

export const isLanguageSupportedForChallenge = (
  challenge: CodingChallenge,
  language: CodingLanguage,
) => (challenge.supportedLanguages || SUPPORTED_CODING_LANGUAGES).includes(language);

export const buildCodingChallengeSignature = (challenges: readonly CodingChallenge[]) =>
  challenges.map((challenge) => challenge.id).join("|");

const shuffle = <T,>(items: readonly T[]) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const countCombinations = (poolSize: number, selectionSize: number) => {
  if (selectionSize > poolSize || selectionSize < 0) return 0;
  if (selectionSize === 0 || selectionSize === poolSize) return 1;

  let numerator = 1;
  let denominator = 1;
  const normalizedSelection = Math.min(selectionSize, poolSize - selectionSize);

  for (let index = 1; index <= normalizedSelection; index += 1) {
    numerator *= poolSize - normalizedSelection + index;
    denominator *= index;
  }

  return numerator / denominator;
};

export const pickCodingChallenges = ({
  count,
  pool,
  previousSignature,
}: {
  count: number;
  pool?: CodingChallenge[];
  previousSignature?: string | null;
}) => {
  const source = Array.isArray(pool) && pool.length > 0 ? pool : LIVE_CODING_CHALLENGES;
  const normalizedCount = Math.max(1, Math.min(count, source.length));
  const shouldAvoidRepeat = countCombinations(source.length, normalizedCount) > 1;

  let picked = shuffle(source).slice(0, normalizedCount);
  let attempts = 0;

  while (
    shouldAvoidRepeat &&
    previousSignature &&
    buildCodingChallengeSignature(picked) === previousSignature &&
    attempts < 6
  ) {
    picked = shuffle(source).slice(0, normalizedCount);
    attempts += 1;
  }

  return picked;
};

export const LIVE_CODING_CHALLENGES: CodingChallenge[] = [
  createChallenge({
    id: "contains-duplicate",
    title: "Contains Duplicate",
    prompt:
      "Return `true` if any value appears at least twice in the array, otherwise return `false`. Aim for better than O(n log n) if possible.",
    category: "Hashing",
    difficulty: "Easy",
    estimatedMinutes: 12,
    functionName: "containsDuplicate",
    entryPointByLanguage: {
      python: "contains_duplicate",
      ruby: "contains_duplicate",
    },
    parameters: [{ name: "nums", type: "number[]" }],
    returnType: "boolean",
    commentLines: [
      "Return true when the array contains any duplicate value.",
      "Example: [1, 2, 3, 1] -> true",
      "Example: [1, 2, 3, 4] -> false",
    ],
    tags: ["Array", "Hashing", "Set"],
    hints: [
      "A Set can help you track whether a number has been seen before.",
      "Think about a one-pass solution instead of sorting first.",
    ],
    evaluationFocus: [
      "Correct duplicate detection",
      "Use of an efficient lookup structure",
      "Handling empty arrays and negative numbers",
    ],
    testCases: [
      {
        id: "cd-1",
        title: "Array with duplicate",
        args: [[1, 2, 3, 1]],
        expected: true,
        explanation: "The value 1 appears twice.",
      },
      {
        id: "cd-2",
        title: "Array without duplicate",
        args: [[1, 2, 3, 4]],
        expected: false,
        explanation: "All values are unique.",
      },
      {
        id: "cd-3",
        title: "Negative duplicate values",
        args: [[-1, 5, 9, -1]],
        expected: true,
        explanation: "Negative values should be handled normally.",
      },
    ],
  }),
  createChallenge({
    id: "two-sum",
    title: "Two Sum",
    prompt:
      "Return the indices of the two numbers that add up to `target`. You may assume exactly one valid answer exists. Return the pair in the order you discover it.",
    category: "Arrays",
    difficulty: "Easy",
    estimatedMinutes: 15,
    functionName: "twoSum",
    entryPointByLanguage: {
      python: "two_sum",
      ruby: "two_sum",
    },
    parameters: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    returnType: "number[]",
    commentLines: [
      "Return the two indices whose values sum to the target.",
      "Example: [2, 7, 11, 15], 9 -> [0, 1]",
    ],
    tags: ["Array", "Hash Map"],
    hints: [
      "Store numbers you have already seen along with their index.",
      "For each value, ask what complement is needed to reach the target.",
    ],
    evaluationFocus: [
      "Correct pair lookup",
      "Index handling",
      "Linear-time approach using a map",
    ],
    testCases: [
      {
        id: "ts-1",
        title: "Basic pair",
        args: [[2, 7, 11, 15], 9],
        expected: [0, 1],
      },
      {
        id: "ts-2",
        title: "Later pair in array",
        args: [[3, 2, 4], 6],
        expected: [1, 2],
      },
      {
        id: "ts-3",
        title: "Repeated values",
        args: [[3, 3], 6],
        expected: [0, 1],
      },
    ],
  }),
  createChallenge({
    id: "valid-parentheses",
    title: "Valid Parentheses",
    prompt:
      "Return `true` if every opening bracket has the correct closing bracket in the right order. The string contains only `()[]{}`.",
    category: "Stacks",
    difficulty: "Medium",
    estimatedMinutes: 18,
    functionName: "isValidParentheses",
    entryPointByLanguage: {
      python: "is_valid_parentheses",
      ruby: "is_valid_parentheses",
    },
    parameters: [{ name: "input", type: "string" }],
    returnType: "boolean",
    commentLines: [
      "Return true when the brackets are balanced and correctly nested.",
      'Example: "()[]{}" -> true',
      'Example: "(]" -> false',
    ],
    tags: ["Stack", "String"],
    hints: [
      "A stack is a natural way to track the most recent opening bracket.",
      "When you read a closing bracket, it must match the current stack top.",
    ],
    evaluationFocus: [
      "Balanced bracket matching",
      "Nested order correctness",
      "Handling unmatched closing or leftover opening brackets",
    ],
    testCases: [
      {
        id: "vp-1",
        title: "Balanced mix",
        args: ["()[]{}"],
        expected: true,
      },
      {
        id: "vp-2",
        title: "Incorrect pair",
        args: ["(]"],
        expected: false,
      },
      {
        id: "vp-3",
        title: "Nested valid sequence",
        args: ["({[]})"],
        expected: true,
      },
    ],
  }),
  createChallenge({
    id: "max-profit",
    title: "Best Time to Buy and Sell Stock",
    prompt:
      "Return the maximum profit you can achieve from one buy and one sell. If no profit is possible, return `0`.",
    category: "Greedy",
    difficulty: "Medium",
    estimatedMinutes: 20,
    functionName: "maxProfit",
    entryPointByLanguage: {
      python: "max_profit",
      ruby: "max_profit",
    },
    parameters: [{ name: "prices", type: "number[]" }],
    returnType: "number",
    commentLines: [
      "Return the maximum possible profit from a single buy and sell.",
      "Example: [7, 1, 5, 3, 6, 4] -> 5",
    ],
    tags: ["Array", "Greedy"],
    hints: [
      "Track the minimum price seen so far as you scan from left to right.",
      "At each step, compute the profit if you sold today.",
    ],
    evaluationFocus: [
      "Single-pass greedy logic",
      "Correct handling of descending prices",
      "Profit computation against the lowest prior value",
    ],
    testCases: [
      {
        id: "mp-1",
        title: "Standard profit",
        args: [[7, 1, 5, 3, 6, 4]],
        expected: 5,
      },
      {
        id: "mp-2",
        title: "No profit possible",
        args: [[7, 6, 4, 3, 1]],
        expected: 0,
      },
      {
        id: "mp-3",
        title: "Single best sell after valley",
        args: [[2, 1, 2, 1, 0, 1, 2]],
        expected: 2,
      },
    ],
  }),
  createChallenge({
    id: "valid-anagram",
    title: "Valid Anagram",
    prompt:
      "Return `true` if `second` is an anagram of `first`, otherwise return `false`. Treat all characters as case-sensitive.",
    category: "Strings",
    difficulty: "Easy",
    estimatedMinutes: 14,
    functionName: "isAnagram",
    entryPointByLanguage: {
      python: "is_anagram",
      ruby: "is_anagram",
    },
    parameters: [
      { name: "first", type: "string" },
      { name: "second", type: "string" },
    ],
    returnType: "boolean",
    commentLines: [
      "Return true when both strings contain the same characters with the same counts.",
      'Example: "anagram", "nagaram" -> true',
    ],
    tags: ["String", "Hashing"],
    hints: [
      "Compare lengths before doing any extra work.",
      "A frequency map or sorted comparison both work here.",
    ],
    evaluationFocus: [
      "Character frequency tracking",
      "Correct handling of repeated letters",
      "Early exits for impossible matches",
    ],
    testCases: [
      {
        id: "va-1",
        title: "Typical anagram",
        args: ["anagram", "nagaram"],
        expected: true,
      },
      {
        id: "va-2",
        title: "Different characters",
        args: ["rat", "car"],
        expected: false,
      },
      {
        id: "va-3",
        title: "Repeated letters",
        args: ["aacc", "ccac"],
        expected: false,
      },
    ],
  }),
  createChallenge({
    id: "binary-search",
    title: "Binary Search",
    prompt:
      "Return the index of `target` in the sorted array `nums`. If the target does not exist, return `-1`.",
    category: "Searching",
    difficulty: "Easy",
    estimatedMinutes: 16,
    functionName: "binarySearch",
    entryPointByLanguage: {
      python: "binary_search",
      ruby: "binary_search",
    },
    parameters: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    returnType: "number",
    commentLines: [
      "Return the index of target in the sorted array.",
      "Return -1 when the target is not present.",
    ],
    tags: ["Binary Search", "Array"],
    hints: [
      "Keep two pointers for the current search window.",
      "Recompute the midpoint each loop and narrow the range.",
    ],
    evaluationFocus: [
      "Correct midpoint updates",
      "Handling missing targets",
      "Avoiding infinite loops",
    ],
    testCases: [
      {
        id: "bs-1",
        title: "Target in middle",
        args: [[-1, 0, 3, 5, 9, 12], 9],
        expected: 4,
      },
      {
        id: "bs-2",
        title: "Target missing",
        args: [[-1, 0, 3, 5, 9, 12], 2],
        expected: -1,
      },
      {
        id: "bs-3",
        title: "Single value array",
        args: [[5], 5],
        expected: 0,
      },
    ],
  }),
  createChallenge({
    id: "product-except-self",
    title: "Product of Array Except Self",
    prompt:
      "Return an array where each position contains the product of every other value in `nums`. Do not use division.",
    category: "Arrays",
    difficulty: "Medium",
    estimatedMinutes: 22,
    functionName: "productExceptSelf",
    entryPointByLanguage: {
      python: "product_except_self",
      ruby: "product_except_self",
    },
    parameters: [{ name: "nums", type: "number[]" }],
    returnType: "number[]",
    commentLines: [
      "Return an array where each value is the product of all other values.",
      "Avoid using division in the final solution.",
    ],
    tags: ["Array", "Prefix", "Suffix"],
    hints: [
      "Build prefix products from the left and suffix products from the right.",
      "You can reuse the output array to save extra space.",
    ],
    evaluationFocus: [
      "Correct prefix and suffix combination",
      "No division-based shortcut",
      "Stable handling of zeros",
    ],
    testCases: [
      {
        id: "pe-1",
        title: "Standard input",
        args: [[1, 2, 3, 4]],
        expected: [24, 12, 8, 6],
      },
      {
        id: "pe-2",
        title: "Single zero in array",
        args: [[-1, 1, 0, -3, 3]],
        expected: [0, 0, 9, 0, 0],
      },
      {
        id: "pe-3",
        title: "Two values",
        args: [[2, 5]],
        expected: [5, 2],
      },
    ],
  }),
  createChallenge({
    id: "palindrome-string",
    title: "Palindrome Check",
    prompt:
      "Return `true` if the input string reads the same forward and backward after lowercasing and removing non-alphanumeric characters.",
    category: "Strings",
    difficulty: "Easy",
    estimatedMinutes: 15,
    functionName: "isPalindrome",
    entryPointByLanguage: {
      python: "is_palindrome",
      ruby: "is_palindrome",
    },
    parameters: [{ name: "input", type: "string" }],
    returnType: "boolean",
    commentLines: [
      "Normalize the string before checking whether it reads the same both ways.",
      'Example: "A man, a plan, a canal: Panama" -> true',
    ],
    tags: ["String", "Two Pointers"],
    hints: [
      "Either filter characters first or move two pointers while skipping invalid characters.",
      "Compare lowercase characters only.",
    ],
    evaluationFocus: [
      "Input normalization",
      "Two-pointer or equivalent scan",
      "Correct handling of punctuation and spaces",
    ],
    testCases: [
      {
        id: "ps-1",
        title: "Canonical palindrome",
        args: ["A man, a plan, a canal: Panama"],
        expected: true,
      },
      {
        id: "ps-2",
        title: "Not a palindrome",
        args: ["race a car"],
        expected: false,
      },
      {
        id: "ps-3",
        title: "Digits and punctuation",
        args: ["1@11"],
        expected: true,
      },
    ],
  }),
];
