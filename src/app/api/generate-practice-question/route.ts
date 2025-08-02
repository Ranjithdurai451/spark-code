// app/api/generate-practice-question/route.ts
import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const enhancedQuestionPrompt = `
You are an expert LeetCode-style problem generator. Create exactly 3 high-quality coding problems.

Topic: {topic}
Difficulty: {level}

Generate problems that are:
- Realistic and commonly asked in interviews
- Well-structured with clear examples
- Have proper edge cases and constraints
- Include realistic company tags

Return ONLY this JSON structure:
{
  "problems": [
    {
      "id": 1,
      "title": "Descriptive Problem Title",
      "difficulty": "Easy/Medium/Hard",
      "description": "Clear problem description with context and requirements",
      "inputFormat": "Detailed input specification",
      "outputFormat": "Detailed output specification", 
      "constraints": ["realistic constraint 1", "realistic constraint 2"],
      "examples": [
        {
          "input": "concrete example input",
          "output": "expected output",
          "explanation": "step-by-step explanation"
        }
      ],
      "functionSignature": {
        "javascript": "function solutionName(param1, param2) {\\n    // Write your solution here\\n    return result;\\n}",
        "python": "def solution_name(param1, param2):\\n    # Write your solution here\\n    return result",
        "java": "public class Solution {\\n    public int solutionName(int[] param1, int param2) {\\n        // Write your solution here\\n        return result;\\n    }\\n}",
        "cpp": "class Solution {\\npublic:\\n    int solutionName(vector<int>& param1, int param2) {\\n        // Write your solution here\\n        return result;\\n    }\\n};"
      },
      "testCases": [
        {"input": "test1", "expectedOutput": "result1"},
        {"input": "test2", "expectedOutput": "result2"},
        {"input": "test3", "expectedOutput": "result3"}
      ],
      "hints": ["progressive hint 1", "progressive hint 2"],
      "tags": ["relevant-tag1", "relevant-tag2"],
      "companies": ["Google", "Meta", "Amazon"]
    }
  ]
}

Focus on {topic} problems at {level} difficulty. Make them interview-ready and realistic.
`;

export async function POST(req: NextRequest) {
  let topic: string = "";
  let level: string = "";
  try {
    const body = await req.json();
    topic = body.topic;
    level = body.level;

    if (!topic || !level) {
      return Response.json({ error: "Topic and level are required" }, { status: 400 });
    }

    const prompt = enhancedQuestionPrompt
      .replace('{topic}', topic)
      .replace('{level}', level);

    const result = await generateText({
      model: gemini("gemini-2.0-flash-exp"),
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    // Enhanced JSON extraction
    let jsonStr = result.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Fallback: try to find JSON-like content
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      } else {
        throw new Error("No valid JSON found in response");
      }
    } else {
      jsonStr = jsonMatch[0];
    }

    // Clean and parse JSON
    jsonStr = jsonStr
      .replace(/\\n/g, '\\n')
      .replace(/\\"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');

    const problems = JSON.parse(jsonStr);

    // Validate response structure
    if (!problems.problems || !Array.isArray(problems.problems)) {
      throw new Error("Invalid response structure");
    }

    return Response.json(problems);

  } catch (error: any) {
    console.error("Question Generation Error:", error);

    // Return fallback problems on error
    const fallbackProblems = {
      problems: [{
        id: 1,
        title: `${topic || "General"} Practice Problem`,
        difficulty: level || "Easy",
        description: `Practice problem for ${topic || "General"} at ${level || "Easy"} level.`,
        inputFormat: "Various inputs depending on the problem",
        outputFormat: "Expected result based on the algorithm",
        constraints: ["Standard constraints apply"],
        examples: [{ input: "example", output: "result", explanation: "Basic example" }],
        functionSignature: {
          javascript: "function solution(input) {\n    // Your code here\n    return result;\n}",
          python: "def solution(input):\n    # Your code here\n    return result",
          java: "public int solution(int input) {\n    // Your code here\n    return result;\n}",
          cpp: "int solution(int input) {\n    // Your code here\n    return result;\n}"
        },
        testCases: [
          { input: "1", expectedOutput: "1" },
          { input: "2", expectedOutput: "2" }
        ],
        hints: ["Think about the approach", "Consider edge cases"],
        tags: [(topic || "general").toLowerCase()],
        companies: ["Tech Company"]
      }]
    };

    return Response.json(fallbackProblems);
  }
}
