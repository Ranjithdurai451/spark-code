import { NextRequest, NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { executeCode } from "../../../lib/code-execution";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
};

const AI_PROMPT_TEMPLATE = `
You are a {language} code execution wrapper generator for LeetCode solutions. Your task is to create an executable wrapper for user code.

ABSOLUTE RULES:
1. PRESERVE the user's code EXACTLY as written - no changes allowed
2. Add ONLY the necessary wrapper code for execution
3. Parse input from: {input}
4. Format output to match: {expectedOutput}
5. Use the EXACT input from the request, not examples in the code
6. DO NOT use any external libraries

CONVERSION REQUIREMENTS:
- Implement conversion functions for parameter types
- Implement serialization functions for return types
- Handle common LeetCode data structures:
  • Array: Convert JSON array to language-native array
  • Linked List: Convert JSON array to ListNode structure
  • Tree: Convert JSON array to TreeNode structure
  • Primitive types: Direct conversion

OUTPUT FORMAT:
- Return primitive values directly
- Serialize arrays as [1,2,3]
- Serialize linked lists as [1,2,3]
- Serialize trees as [1,2,3]

EXAMPLE STRUCTURE (Java):
public class Main {{
    // User's solution (preserved exactly)
    {user_code}
    
    // Conversion methods
    public static ListNode arrayToListNode(int[] arr) {{
        // Implementation
    }}
    
    public static String listNodeToString(ListNode head) {{
        // Implementation
    }}
    
    public static void main(String[] args) {{
        // Parse input directly
        Object[] parsedInput = parseInput("{input}");
        
        // Convert to required types
        Object converted1 = convertToType(parsedInput[0], "Type1");
        Object converted2 = convertToType(parsedInput[1], "Type2");
        
        // Execute solution
        Solution sol = new Solution();
        Object result = sol.methodName(converted1, converted2);
        
        // Serialize output
        System.out.println(serializeOutput(result));
    }}
}}

USER'S CODE (DO NOT MODIFY):
{user_code}

Generate the wrapped executable code:
`;

export async function POST(req: NextRequest) {
  try {
    const { code, language: providedLanguage, input, expectedOutput } = await req.json();
    console.log(input,expectedOutput)

    // Input validation
    if (!code?.trim()) {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: "No code provided",
        explanation: "Please provide the solution code to execute",
      });
    }

    if (typeof input === "undefined") {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: "No test input provided",
        explanation: "Test input is required to execute the code",
      });
    }

    const language = providedLanguage?.toLowerCase() || detectLanguage(code);
    const languageId = LANGUAGE_MAP[language];
    
    if (!languageId) {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: `Unsupported language: ${language}`,
        explanation: `${language} is not supported for execution`,
      });
    }

    // Generate executable code using AI
    const prompt = AI_PROMPT_TEMPLATE
      .replace(/{language}/g, language)
      .replace(/{user_code}/g, code)
      .replace(/{input}/g, JSON.stringify(input))
      .replace(/{expectedOutput}/g, JSON.stringify(expectedOutput));

    const aiResult = await generateText({
      model: gemini("gemini-1.5-flash"),
      prompt,
      maxTokens: 4000,
      temperature: 0,
    });

    let executableCode = aiResult.text.trim();
    
    // Extract from markdown code blocks if present
    const codeBlockPattern = new RegExp(`\\\`\\\`\\\`(?:${language})?\\s*([\\s\\S]+?)\\\`\\\`\\\``);
    const match = executableCode.match(codeBlockPattern);
    if (match && match[1]) {
      executableCode = match[1].trim();
    }

    // Execute the wrapped code
    const executionResult = await executeCode({
      code: executableCode,
      language: language.toLowerCase(),
      input: JSON.stringify(input),
    });

    // Process results
    let actualOutput = "";
    let executionError: string | null = null;
    let passed = false;

    if (executionResult.compile_output?.trim()) {
      executionError = cleanErrorMessage(executionResult.compile_output);
      actualOutput = "Compilation failed";
    } else if (executionResult.stderr?.trim()) {
      executionError = cleanErrorMessage(executionResult.stderr);
      actualOutput = "Runtime error";
    } else if (executionResult.stdout?.trim()) {
      actualOutput = executionResult.stdout.trim();
      passed = enhancedOutputComparison(actualOutput, expectedOutput);
    } else {
      actualOutput = "No output produced";
      executionError = "Program executed but produced no output";
    }

    return NextResponse.json({
      actualOutput,
      passed,
      error: executionError,
      explanation: generateEnhancedExplanation(
        passed,
        actualOutput,
        expectedOutput,
        executionError
      ),
      executionDetails: {
        time: executionResult.time || 0,
        memory: executionResult.memory || 0,
        language: language,
        status: executionResult.status?.description || "Unknown",
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      actualOutput: "",
      passed: false,
      error: `System error: ${error.message}`,
      explanation: "An unexpected error occurred during code execution. Please try again.",
    });
  }
}

function detectLanguage(code: string): string {
  if (code.includes("#include") && code.includes("printf")) return "c";
  if (code.includes("#include") || code.includes("using namespace")) return "cpp";
  if (code.includes("public class") || code.includes("import java")) return "java";
  if (code.includes("def ") && !code.includes("import java")) return "python";
  if (code.includes("function") || code.includes("console.log")) return "javascript";
  return "java";
}

function cleanErrorMessage(error: string): string {
  return error
    .replace(/\/tmp\/[^\s]*\.(java|cpp|py|js|c):/g, "Line ")
    .replace(/^\s*at\s+.*$/gm, "")
    .replace(/^\s*\.\.\.\s*\d+\s*more\s*$/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 500);
}

function enhancedOutputComparison(actual: string, expected: any): boolean {
  const actualStr = actual.trim();
  const expectedStr = String(expected ?? "").trim();

  // Direct exact match
  if (actualStr === expectedStr) return true;

  // Null/empty handling
  const nullValues = ['null', '', 'None', 'nil', 'undefined'];
  const actualIsNull = nullValues.includes(actualStr.toLowerCase()) || expected === null;
  const expectedIsNull = nullValues.includes(expectedStr.toLowerCase()) || expected === null;
  if (actualIsNull && expectedIsNull) return true;

  // Array/list comparison
  if (actualStr.includes("[") || expectedStr.includes("[")) {
    const normalizeArray = (str: string) => {
      return str
        .replace(/\s+/g, "")
        .replace(/'/g, '"')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/None/g, 'null')
        .toLowerCase();
    };

    const normalizedActual = normalizeArray(actualStr);
    const normalizedExpected = normalizeArray(expectedStr);
    
    if (normalizedActual === normalizedExpected) return true;

    try {
      const actualJson = JSON.parse(normalizedActual);
      const expectedJson = JSON.parse(normalizedExpected);
      return JSON.stringify(actualJson) === JSON.stringify(expectedJson);
    } catch {}
  }

  // Numeric comparison
  if (!actualStr.includes("[") && !expectedStr.includes("[")) {
    const actualNum = parseFloat(actualStr);
    const expectedNum = parseFloat(expectedStr);
    
    if (!isNaN(actualNum) && !isNaN(expectedNum)) {
      const tolerance = Math.max(1e-9, Math.abs(expectedNum) * 1e-9);
      return Math.abs(actualNum - expectedNum) <= tolerance;
    }
  }

  // Boolean comparison
  const boolMap: Record<string, boolean> = {
    'true': true, 'false': false, '1': true, '0': false,
    'yes': true, 'no': false, 'True': true, 'False': false
  };

  if (actualStr in boolMap && expectedStr in boolMap) {
    return boolMap[actualStr] === boolMap[expectedStr];
  }

  // Case-insensitive comparison
  return actualStr.toLowerCase() === expectedStr.toLowerCase();
}

function generateEnhancedExplanation(
  passed: boolean,
  actualOutput: string,
  expectedOutput: any,
  error: string | null
): string {
  if (passed) return "✅ Test passed! Your code produced the correct output.";
  
  if (error) {
    if (error.toLowerCase().includes("compilation")) {
      return `❌ Compilation Error: ${error}`;
    }
    if (error.toLowerCase().includes("runtime")) {
      return `❌ Runtime Error: ${error}`;
    }
    return `❌ Execution Error: ${error}`;
  }

  return `❌ Wrong Answer:\nExpected: ${String(expectedOutput).substring(0, 200)}\nGot: ${actualOutput.substring(0, 200)}`;
}