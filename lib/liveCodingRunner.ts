import "server-only";

import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";

import {
  getChallengeEntryPoint,
  getCodingLanguageLabel,
} from "@/constants/liveCoding";

type RunnerOutcome = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  missingRuntime?: boolean;
  timedOut?: boolean;
};

const RUNNER_TIMEOUT_MS: Record<CodingLanguage, number> = {
  javascript: 3000,
  python: 3500,
  java: 7000,
  go: 6000,
  ruby: 3500,
};

const toStringLiteral = (value: string) => JSON.stringify(value);

const serializeLiteral = (
  value: unknown,
  type: CodingValueType,
  language: CodingLanguage,
): string => {
  switch (type) {
    case "number":
      return String(value);
    case "boolean":
      return language === "python" ? (value ? "True" : "False") : value ? "true" : "false";
    case "string":
      return JSON.stringify(String(value));
    case "number[]":
      return serializeArrayLiteral(
        Array.isArray(value) ? value : [],
        "number",
        language,
      );
    case "string[]":
      return serializeArrayLiteral(
        Array.isArray(value) ? value : [],
        "string",
        language,
      );
    default:
      return "null";
  }
};

const serializeArrayLiteral = (
  values: unknown[],
  itemType: Exclude<CodingValueType, "number[]" | "string[]">,
  language: CodingLanguage,
) => {
  const serializedValues = values.map((value) =>
    serializeLiteral(value, itemType, language),
  );

  if (language === "java") {
    const javaType = itemType === "number" ? "int" : "String";
    return `new ${javaType}[] {${serializedValues.join(", ")}}`;
  }

  if (language === "go") {
    const goType = itemType === "number" ? "int" : "string";
    return `[]${goType}{${serializedValues.join(", ")}}`;
  }

  return `[${serializedValues.join(", ")}]`;
};

const getReturnSerializerExpression = (
  language: CodingLanguage,
  type: CodingValueType,
  expression: string,
) => {
  if (language === "javascript") return `JSON.stringify(${expression})`;
  if (language === "python") return `json.dumps(${expression}, separators=(",", ":"))`;
  if (language === "ruby") return `JSON.generate(${expression})`;
  if (language === "go") return `toJSON(${expression})`;

  switch (type) {
    case "number":
    case "boolean":
    case "string":
    case "number[]":
    case "string[]":
      return `serialize(${expression})`;
    default:
      return `String.valueOf(${expression})`;
  }
};

const buildFunctionCall = (challenge: CodingChallenge, language: CodingLanguage, args: unknown[]) => {
  const entryPoint = getChallengeEntryPoint(challenge, language);
  const serializedArgs = challenge.parameters.map((parameter, index) =>
    serializeLiteral(args[index], parameter.type, language),
  );

  if (language === "java") {
    return `Solution.${entryPoint}(${serializedArgs.join(", ")})`;
  }

  return `${entryPoint}(${serializedArgs.join(", ")})`;
};

const buildJavaScriptRunnerSource = (challenge: CodingChallenge, code: string) => {
  const testBlocks = challenge.testCases
    .map((testCase) => {
      const expectedSerialized = JSON.stringify(JSON.stringify(testCase.expected));
      const callExpression = buildFunctionCall(challenge, "javascript", testCase.args);

      return `
try {
  const actualSerialized = ${getReturnSerializerExpression(
    "javascript",
    challenge.returnType,
    callExpression,
  )};
  const expectedSerialized = ${expectedSerialized};
  const passed = actualSerialized === expectedSerialized;
  results.push({
    id: ${toStringLiteral(testCase.id)},
    title: ${toStringLiteral(testCase.title)},
    passed,
    details: passed ? "Passed" : "Expected " + expectedSerialized + " but received " + actualSerialized,
  });
} catch (error) {
  results.push({
    id: ${toStringLiteral(testCase.id)},
    title: ${toStringLiteral(testCase.title)},
    passed: false,
    details: error instanceof Error ? error.message : String(error),
  });
}`;
    })
    .join("\n");

  return `${code}

const results = [];
${testBlocks}
process.stdout.write(JSON.stringify(results));`;
};

const buildPythonRunnerSource = (challenge: CodingChallenge, code: string) => {
  const testBlocks = challenge.testCases
    .map((testCase) => {
      const expectedSerialized = JSON.stringify(JSON.stringify(testCase.expected));
      const callExpression = buildFunctionCall(challenge, "python", testCase.args);

      return `
try:
    actual_serialized = ${getReturnSerializerExpression("python", challenge.returnType, callExpression)}
    expected_serialized = ${expectedSerialized}
    passed = actual_serialized == expected_serialized
    results.append({
        "id": ${toStringLiteral(testCase.id)},
        "title": ${toStringLiteral(testCase.title)},
        "passed": passed,
        "details": "Passed" if passed else f"Expected {expected_serialized} but received {actual_serialized}",
    })
except Exception as error:
    results.append({
        "id": ${toStringLiteral(testCase.id)},
        "title": ${toStringLiteral(testCase.title)},
        "passed": False,
        "details": str(error),
    })`;
    })
    .join("\n");

  return `${code}

import json

results = []
${testBlocks}
print(json.dumps(results, separators=(",", ":")))`;
};

const buildRubyRunnerSource = (challenge: CodingChallenge, code: string) => {
  const testBlocks = challenge.testCases
    .map((testCase) => {
      const expectedSerialized = JSON.stringify(JSON.stringify(testCase.expected));
      const callExpression = buildFunctionCall(challenge, "ruby", testCase.args);

      return `
begin
  actual_serialized = ${getReturnSerializerExpression("ruby", challenge.returnType, callExpression)}
  expected_serialized = ${expectedSerialized}
  passed = actual_serialized == expected_serialized
  results << {
    id: ${toStringLiteral(testCase.id)},
    title: ${toStringLiteral(testCase.title)},
    passed: passed,
    details: passed ? "Passed" : "Expected #{expected_serialized} but received #{actual_serialized}",
  }
rescue StandardError => error
  results << {
    id: ${toStringLiteral(testCase.id)},
    title: ${toStringLiteral(testCase.title)},
    passed: false,
    details: error.message,
  }
end`;
    })
    .join("\n");

  return `${code}

require "json"

results = []
${testBlocks}
STDOUT.write(JSON.generate(results))`;
};

const buildGoRunnerSource = (challenge: CodingChallenge) => {
  const testBlocks = challenge.testCases
    .map((testCase) => {
      const callExpression = buildFunctionCall(challenge, "go", testCase.args);
      const expectedSerialized = JSON.stringify(JSON.stringify(testCase.expected));

      return `
func() {
  defer func() {
    if err := recover(); err != nil {
      results = append(results, testResult{
        ID: ${toStringLiteral(testCase.id)},
        Title: ${toStringLiteral(testCase.title)},
        Passed: false,
        Details: fmt.Sprint(err),
      })
    }
  }()

  actualSerialized := ${getReturnSerializerExpression("go", challenge.returnType, callExpression)}
  expectedSerialized := ${expectedSerialized}
  passed := actualSerialized == expectedSerialized
  details := "Passed"
  if !passed {
    details = fmt.Sprintf("Expected %s but received %s", expectedSerialized, actualSerialized)
  }

  results = append(results, testResult{
    ID: ${toStringLiteral(testCase.id)},
    Title: ${toStringLiteral(testCase.title)},
    Passed: passed,
    Details: details,
  })
}()`;
    })
    .join("\n");

  return `package main

import (
  "encoding/json"
  "fmt"
)

type testResult struct {
  ID string \`json:"id"\`
  Title string \`json:"title"\`
  Passed bool \`json:"passed"\`
  Details string \`json:"details"\`
}

func toJSON(value interface{}) string {
  payload, err := json.Marshal(value)
  if err != nil {
    return fmt.Sprintf("%v", value)
  }
  return string(payload)
}

func main() {
  results := []testResult{}
${testBlocks}
  payload, _ := json.Marshal(results)
  fmt.Print(string(payload))
}`;
};

const buildJavaRunnerSource = (challenge: CodingChallenge) => {
  const testBlocks = challenge.testCases
    .map((testCase) => {
      const callExpression = buildFunctionCall(challenge, "java", testCase.args);
      const expectedSerialized = JSON.stringify(JSON.stringify(testCase.expected));

      return `
    try {
      String actualSerialized = ${getReturnSerializerExpression(
        "java",
        challenge.returnType,
        callExpression,
      )};
      String expectedSerialized = ${expectedSerialized};
      boolean passed = actualSerialized.equals(expectedSerialized);
      results.add(new TestResult(
        ${toStringLiteral(testCase.id)},
        ${toStringLiteral(testCase.title)},
        passed,
        passed ? "Passed" : "Expected " + expectedSerialized + " but received " + actualSerialized
      ));
    } catch (Throwable error) {
      results.add(new TestResult(
        ${toStringLiteral(testCase.id)},
        ${toStringLiteral(testCase.title)},
        false,
        error.getMessage() == null ? error.toString() : error.getMessage()
      ));
    }`;
    })
    .join("\n");

  return `import java.util.*;

public class Main {
  private static class TestResult {
    final String id;
    final String title;
    final boolean passed;
    final String details;

    TestResult(String id, String title, boolean passed, String details) {
      this.id = id;
      this.title = title;
      this.passed = passed;
      this.details = details;
    }
  }

  private static String escapeJson(String value) {
    return value
      .replace("\\\\", "\\\\\\\\")
      .replace("\\"", "\\\\\\"")
      .replace("\\n", "\\\\n")
      .replace("\\r", "\\\\r")
      .replace("\\t", "\\\\t");
  }

  private static String serialize(int value) {
    return String.valueOf(value);
  }

  private static String serialize(boolean value) {
    return value ? "true" : "false";
  }

  private static String serialize(String value) {
    return "\\"" + escapeJson(value) + "\\"";
  }

  private static String serialize(int[] values) {
    StringBuilder builder = new StringBuilder("[");
    for (int index = 0; index < values.length; index += 1) {
      if (index > 0) builder.append(",");
      builder.append(values[index]);
    }
    builder.append("]");
    return builder.toString();
  }

  private static String serialize(String[] values) {
    StringBuilder builder = new StringBuilder("[");
    for (int index = 0; index < values.length; index += 1) {
      if (index > 0) builder.append(",");
      builder.append("\\"").append(escapeJson(values[index])).append("\\"");
    }
    builder.append("]");
    return builder.toString();
  }

  private static String toJson(List<TestResult> results) {
    StringBuilder builder = new StringBuilder("[");
    for (int index = 0; index < results.size(); index += 1) {
      TestResult result = results.get(index);
      if (index > 0) builder.append(",");
      builder.append("{")
        .append("\\"id\\":\\"").append(escapeJson(result.id)).append("\\",")
        .append("\\"title\\":\\"").append(escapeJson(result.title)).append("\\",")
        .append("\\"passed\\":").append(result.passed)
        .append(",\\"details\\":\\"").append(escapeJson(result.details)).append("\\"")
        .append("}");
    }
    builder.append("]");
    return builder.toString();
  }

  public static void main(String[] args) {
    List<TestResult> results = new ArrayList<>();
${testBlocks}
    System.out.print(toJson(results));
  }
}`;
};

const truncateOutput = (value: string) =>
  value.trim().slice(0, 1400) || "The runner did not return any output.";

const runCommand = async (
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<RunnerOutcome> =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();
      resolve({
        success: false,
        stdout,
        stderr,
        exitCode: null,
        timedOut: true,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({
        success: false,
        stdout,
        stderr: error.message,
        exitCode: null,
        missingRuntime: "code" in error && error.code === "ENOENT",
      });
    });

    child.on("close", (exitCode) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({
        success: exitCode === 0,
        stdout,
        stderr,
        exitCode,
      });
    });
  });

const buildFallbackSummary = (
  challenge: CodingChallenge,
  language: CodingLanguage,
  code: string,
  explanation: string,
  details: string,
): CodingExecutionSummary => ({
  language,
  code,
  explanation,
  passedChecks: 0,
  totalChecks: challenge.testCases.length,
  checkResults: challenge.testCases.map((testCase) => ({
    id: testCase.id,
    title: testCase.title,
    passed: false,
    details,
  })),
});

const parseRunnerPayload = (
  challenge: CodingChallenge,
  language: CodingLanguage,
  code: string,
  explanation: string,
  payload: string,
) => {
  const parsed = JSON.parse(payload) as CodingCheckResult[];
  const checkResults = Array.isArray(parsed) ? parsed : [];
  const passedChecks = checkResults.filter((result) => result.passed).length;

  return {
    language,
    code,
    explanation,
    passedChecks,
    totalChecks: checkResults.length,
    checkResults,
  } satisfies CodingExecutionSummary;
};

export async function runCodingChallengeChecks(params: {
  challenge: CodingChallenge;
  language: CodingLanguage;
  code: string;
  explanation: string;
}): Promise<CodingExecutionSummary> {
  const { challenge, language, code, explanation } = params;
  const tempDir = path.join(process.cwd(), ".tmp", "live-coding", randomUUID());

  try {
    await mkdir(tempDir, { recursive: true });

    let outcome: RunnerOutcome;

    if (language === "javascript") {
      const scriptPath = path.join(tempDir, "runner.js");
      await writeFile(scriptPath, buildJavaScriptRunnerSource(challenge, code), "utf8");
      outcome = await runCommand("node", [scriptPath], tempDir, RUNNER_TIMEOUT_MS.javascript);
    } else if (language === "python") {
      const scriptPath = path.join(tempDir, "runner.py");
      await writeFile(scriptPath, buildPythonRunnerSource(challenge, code), "utf8");
      outcome = await runCommand("python", [scriptPath], tempDir, RUNNER_TIMEOUT_MS.python);
    } else if (language === "ruby") {
      const scriptPath = path.join(tempDir, "runner.rb");
      await writeFile(scriptPath, buildRubyRunnerSource(challenge, code), "utf8");
      outcome = await runCommand("ruby", [scriptPath], tempDir, RUNNER_TIMEOUT_MS.ruby);
    } else if (language === "go") {
      const solutionPath = path.join(tempDir, "solution.go");
      const harnessPath = path.join(tempDir, "harness.go");
      await writeFile(solutionPath, code, "utf8");
      await writeFile(harnessPath, buildGoRunnerSource(challenge), "utf8");
      outcome = await runCommand(
        "go",
        ["run", solutionPath, harnessPath],
        tempDir,
        RUNNER_TIMEOUT_MS.go,
      );
    } else {
      const solutionPath = path.join(tempDir, "Solution.java");
      const mainPath = path.join(tempDir, "Main.java");
      await writeFile(solutionPath, code, "utf8");
      await writeFile(mainPath, buildJavaRunnerSource(challenge), "utf8");

      const compileResult = await runCommand(
        "javac",
        [solutionPath, mainPath],
        tempDir,
        RUNNER_TIMEOUT_MS.java,
      );

      if (!compileResult.success) {
        outcome = compileResult;
      } else {
        outcome = await runCommand(
          "java",
          ["-cp", tempDir, "Main"],
          tempDir,
          RUNNER_TIMEOUT_MS.java,
        );
      }
    }

    if (!outcome.success) {
      const languageLabel = getCodingLanguageLabel(language);

      if (outcome.missingRuntime) {
        return buildFallbackSummary(
          challenge,
          language,
          code,
          explanation,
          `${languageLabel} runtime is not available on this machine.`,
        );
      }

      if (outcome.timedOut) {
        return buildFallbackSummary(
          challenge,
          language,
          code,
          explanation,
          `${languageLabel} execution timed out. Check for infinite loops or blocking work.`,
        );
      }

      return buildFallbackSummary(
        challenge,
        language,
        code,
        explanation,
        truncateOutput(outcome.stderr || outcome.stdout),
      );
    }

    return parseRunnerPayload(challenge, language, code, explanation, outcome.stdout.trim());
  } catch (error) {
    return buildFallbackSummary(
      challenge,
      language,
      code,
      explanation,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => null);
  }
}
