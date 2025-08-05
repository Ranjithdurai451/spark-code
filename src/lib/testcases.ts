import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
const gemini =  createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! });

const testcasePrompt = `
Given the following code, generate 5-7 diverse test cases (including edge cases) with expected outputs.

**Code:**
{user_code}

**Programming Language:** {language}

Format:
Test Case 1:
Input: ...
Expected Output: ...

Test Case 2:
...
`;

export async function generateTestCases({ code, language }: { code: string, language: string }) {
  const prompt = testcasePrompt
    .replace("{user_code}", code)
    .replace("{language}", language);

  const response = await generateText({
    model: gemini("gemini-2.0-flash"),
    prompt,
  });
  return { testcases: response.text };
}