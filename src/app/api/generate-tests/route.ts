import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Fixed: Intelligent algorithm detection prompt (no TypeScript/JS errors)
const intelligentAlgorithmPrompt = `
You are an expert LeetCode algorithm detective. Your job is to identify the INTENDED algorithm from code, even if the implementation is wrong or function names are unclear.

CODE TO ANALYZE:
\`\`\`{language}
{user_code}
\`\`\`

ALGORITHM DETECTION STRATEGY:
1. **Function Signature Analysis**: Look at parameters and return types
2. **Variable Name Clues**: Check for meaningful variable names
3. **Code Structure Hints**: Identify loops, conditions, data structures used
4. **Comment Analysis**: Look for any comments that hint at purpose
5. **Pattern Recognition**: Match to common LeetCode problem patterns

INTELLIGENT DETECTION RULES:

**TWO SUM DETECTION**:
- Signature: (int[] arr, int target) OR (int[] nums, int val) OR similar
- Variables: Contains "target", "sum", "complement", "map", "hash"
- Structure: Nested loops OR HashMap usage
- Return: int[] with length 2
- **Standard Tests**: [[2,7,11,15], 9] → [0,1], [[3,3], 6] → [0,1], [[3,2,4], 6] → [1,2]

**STRING REVERSAL DETECTION**:
- Signature: (String s) OR (char[] chars)
- Variables: "left", "right", "start", "end", "reverse"
- Structure: Two-pointer approach OR StringBuilder
- Return: String OR void
- **Standard Tests**: "hello" → "olleh", "a" → "a", "racecar" → "racecar"

**PALINDROME DETECTION**:
- Function name: Contains "palindrome" OR "isPalindrome" (even misspelled)
- Signature: (String s) returning boolean
- Variables: "left", "right", "clean", "alpha"
- Structure: Two-pointer comparison
- **Standard Tests**: "racecar" → true, "hello" → false, "A man a plan a canal Panama" → true

**ARRAY SORTING DETECTION**:
- Signature: (int[] arr) returning int[] OR void
- Variables: "temp", "min", "max", "pivot", "left", "right"
- Structure: Nested loops OR divide-and-conquer
- **Standard Tests**: [3,1,2] → [1,2,3], [1] → [1], [5,2,3,1] → [1,2,3,5]

**BINARY SEARCH DETECTION**:
- Function name: Contains "search" OR "find"
- Signature: (int[] arr, int target) returning int
- Variables: "left", "right", "mid", "target"
- Structure: While loop with mid calculation
- **Standard Tests**: [[1,2,3,4,5], 3] → 2, [[1], 1] → 0, [[-1,0,3,5,9,12], 9] → 4

**LINKED LIST OPERATIONS**:
- Parameters: Contains "ListNode" OR "Node"
- Variables: "head", "tail", "current", "next", "prev"
- Structure: While loop with node.next
- **Standard Tests**: [1,2,3] → [3,2,1] (for reverse), [1,2,3,4,5] → [5,4,3,2,1]

**TREE OPERATIONS**:
- Parameters: Contains "TreeNode"
- Variables: "root", "left", "right", "queue", "stack"
- Structure: Recursion OR queue/stack usage
- **Standard Tests**: [1,2,3] → [1,2,3] (traversal), [1,null,2,3] → [1,3,2]

**VALID PARENTHESES DETECTION**:
- Function name: Contains "valid" OR "balanced" OR "parentheses"
- Signature: (String s) returning boolean
- Variables: "stack", "open", "close", "count"
- Structure: Stack operations OR counter
- **Standard Tests**: "()" → true, "()[]{}" → true, "(]" → false

**FIBONACCI/DP DETECTION**:
- Function name: Contains "fib" OR numbers in name
- Signature: (int n) returning int OR long
- Variables: "dp", "prev", "current", "memo"
- Structure: Recursion OR dynamic programming
- **Standard Tests**: 5 → 5, 10 → 55, 0 → 0

FUZZY MATCHING LOGIC:
- **Misspelled Names**: "twosum" → Two Sum, "reversestring" → String Reverse
- **Wrong Names**: "solve()" → Detect from signature and structure
- **Incomplete Code**: Use partial clues to infer algorithm type
- **Multiple Clues**: Combine function name + signature + variables for best match

DETECTION PRIORITY:
1. Function signature pattern (highest priority)
2. Variable name patterns
3. Code structure patterns
4. Function name hints (lowest priority due to user errors)

FALLBACK DETECTION:
If unclear, choose the most likely algorithm based on:
- Parameter types (int[] + int = likely Two Sum)
- Return type (boolean = likely validation problem)
- Single string parameter = likely string manipulation

OUTPUT FORMAT:
**Input:** input_value
**Expected Output:** correct_result_for_detected_algorithm

**Input:** input_value
**Expected Output:** correct_result_for_detected_algorithm

**Input:** input_value
**Expected Output:** correct_result_for_detected_algorithm

IMPORTANT: Generate test cases for the INTENDED algorithm, not the buggy implementation!

Analyze and detect the intended algorithm:
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, code, language } = await req.json();

    let codeToAnalyze = code;
    let detectedLanguage = language || "java";

    // Extract code from messages if not directly provided
    if (!codeToAnalyze && Array.isArray(messages) && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      // Try to extract code from triple backtick code blocks (with or without language)
      const codeBlockPattern = /```(\w+)?\s*([\s\S]*?)```/;
      const inlineCodePattern = /`([^`\n]+)`/g;

      let match = userMessage.content.match(codeBlockPattern);
      if (match && match[2]) {
        detectedLanguage = match[1] || language || "java";
        codeToAnalyze = match[2].trim();
      } else {
        // Try inline code
        const inlineMatches = [...userMessage.content.matchAll(inlineCodePattern)];
        if (inlineMatches.length > 0) {
          codeToAnalyze = inlineMatches[0][1].trim();
        }
      }
    }

    // Enhanced validation - more lenient
    if (!codeToAnalyze) {
      return new Response(
        JSON.stringify({
          error: "No code found to analyze",
          suggestion: "Please provide some code, even if incomplete"
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (codeToAnalyze.length < 10) {
      return new Response(
        JSON.stringify({
          error: "Code too short for analysis",
          suggestion: "Provide at least a function signature or some code structure"
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Very basic validation - accept almost anything
    const hasCodeStructure = /\w+.*[\(\{\[]/i.test(codeToAnalyze);
    if (!hasCodeStructure) {
      return new Response(
        JSON.stringify({
          error: "No recognizable code structure found",
          suggestion: "Provide some code with basic structure (functions, variables, etc.)"
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🕵️ Using intelligent algorithm detection for ${detectedLanguage}`);
    console.log(`📝 Code sample: ${codeToAnalyze.substring(0, 100)}...`);

    const prompt = intelligentAlgorithmPrompt
      .replace(/\{user_code\}/g, codeToAnalyze)
      .replace(/\{language\}/g, detectedLanguage);

    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt,
      maxTokens: 1000,
      temperature: 0.2, // Slightly higher for better pattern recognition
    });

    const response = result.toDataStreamResponse();
    response.headers.set('Cache-Control', 'no-cache');
    response.headers.set('Connection', 'keep-alive');

    return response;

  } catch (error: any) {
    console.error("❌ Intelligent Algorithm Detection Error:", error);

    return new Response(
      JSON.stringify({
        error: "Service temporarily unavailable",
        message: "Please try again in a moment"
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
