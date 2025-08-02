// app/api/execute-practice/route.ts
import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const enhancedExecutionPrompt = `
You are a professional code executor and judge. Execute the provided code with test cases and provide detailed feedback.

Code:
{code}

Language: {language}
Test Cases: {testCases}

Rules:
1. Execute each test case carefully
2. Provide exact output matching
3. Calculate realistic execution times (1-100ms range)
4. Give helpful error messages for failures
5. Be precise with output formatting

Return ONLY this JSON:
{
  "results": [
    {
      "input": "test input",
      "expectedOutput": "expected result",
      "actualOutput": "actual execution result",
      "passed": true/false,
      "executionTime": "realistic_time_in_ms",
      "error": null or "helpful error message"
    }
  ],
  "summary": {
    "totalTests": number,
    "passedTests": number,
    "failedTests": number,
    "allPassed": boolean,
    "averageTime": "average_execution_time"
  }
}

Execute each test case and provide accurate results.
`;

export async function POST(req: NextRequest) {
  let testCases: any[] = [];
  try {
    const body = await req.json();
    const { code, language } = body;
    testCases = body.testCases;

    if (!code || !testCases) {
      return Response.json({ error: "Code and test cases are required" }, { status: 400 });
    }

    const prompt = enhancedExecutionPrompt
      .replace('{code}', code)
      .replace('{language}', language || 'javascript')
      .replace('{testCases}', JSON.stringify(testCases));

    const result = await generateText({
      model: gemini("gemini-2.0-flash-exp"),
      prompt,
      maxTokens: 3000,
      temperature: 0.1,
    });

    // Enhanced JSON extraction
    let jsonStr = result.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No valid JSON in response");
    }

    jsonStr = jsonMatch[0];
    const executionResult = JSON.parse(jsonStr);

    // Validate and enhance response
    if (!executionResult.results) {
      throw new Error("Invalid execution result structure");
    }

    // Add summary if missing
    if (!executionResult.summary) {
      const results = executionResult.results;
      const passedTests = results.filter((r: any) => r.passed).length;
      const totalTests = results.length;

      executionResult.summary = {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        allPassed: passedTests === totalTests,
        averageTime: results.length > 0 ?
          Math.round(results.reduce((sum: number, r: any) =>
            sum + parseInt(r.executionTime?.replace('ms', '') || '10'), 0) / results.length) + 'ms' : '0ms'
      };
    }

    return Response.json(executionResult);

  } catch (error: any) {
    console.error("Code Execution Error:", error);

    // Return meaningful error response
    const errorResponse = {
      results: Array.isArray(testCases) ? testCases.map((testCase: any) => ({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: "Execution failed",
        passed: false,
        executionTime: "0ms",
        error: `Execution error: ${error.message || 'Unknown error'}`
      })) : [],
      summary: {
        totalTests: Array.isArray(testCases) ? testCases.length : 0,
        passedTests: 0,
        failedTests: Array.isArray(testCases) ? testCases.length : 0,
        allPassed: false,
        averageTime: "0ms"
      }
    };

    return Response.json(errorResponse);
  }
}
