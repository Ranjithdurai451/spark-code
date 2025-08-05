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

const ENHANCED_PROMPTS = {
  java: `You are a Java code generator. Create a complete, runnable Java program that executes user code with test inputs.

CONTEXT: This is for algorithmic problem solving. The user has written a solution function that needs to be tested.

USER'S SOLUTION CODE (DO NOT MODIFY):
{userCode}

TEST INPUT: {input}
EXPECTED OUTPUT: {expectedOutput}

CRITICAL REQUIREMENTS:
1. PRESERVE user code exactly - no formatting, comments, or modifications
2. Create a Main class with main method
3. Parse input {input} into appropriate Java variables
4. Call the user's function with parsed variables
5. Print result using System.out.println()

INPUT PARSING RULES:
- Array input [1,2,3] → int[] arr = {1,2,3};
- Multiple params [arr, target] → separate variables
- String input "hello" → String str = "hello";
- Nested arrays [[1,2],[3,4]] → int[][] matrix = {{1,2},{3,4}};

OUTPUT FORMATTING:
- Arrays: Use Arrays.toString() for 1D, Arrays.deepToString() for 2D+
- Primitives: Direct System.out.println()
- Objects: Use .toString() or custom formatting

EXAMPLE TRANSFORMATION:
Input: [[1,2,3], 5]
Variables:
int[] nums = {1,2,3};
int target = 5;

Generate ONLY the complete Java code with proper imports:`,

  python: `You are a Python code generator. Create a complete, runnable Python program that executes user code with test inputs.

CONTEXT: This is for algorithmic problem solving. The user has written a solution function that needs to be tested.

USER'S SOLUTION CODE (DO NOT MODIFY):
{userCode}

TEST INPUT: {input}
EXPECTED OUTPUT: {expectedOutput}

CRITICAL REQUIREMENTS:
1. PRESERVE user code exactly - no formatting, comments, or modifications
2. Parse input {input} into appropriate Python variables
3. Call the user's function with parsed variables
4. Print result using print()

INPUT PARSING RULES:
- Array input [1,2,3] → nums = [1,2,3]
- Multiple params [arr, target] → separate variables
- String input "hello" → s = "hello"
- Nested structures preserved as-is

OUTPUT FORMATTING:
- Lists/arrays: Direct print() outputs correctly
- Other types: Direct print()

EXAMPLE TRANSFORMATION:
Input: [[1,2,3], 5]
Variables:
nums = [1,2,3]
target = 5

Generate ONLY the complete Python code:`,

  javascript: `You are a JavaScript code generator. Create a complete, runnable JavaScript program that executes user code with test inputs.

CONTEXT: This is for algorithmic problem solving. The user has written a solution function that needs to be tested.

USER'S SOLUTION CODE (DO NOT MODIFY):
{userCode}

TEST INPUT: {input}
EXPECTED OUTPUT: {expectedOutput}

CRITICAL REQUIREMENTS:
1. PRESERVE user code exactly - no formatting, comments, or modifications
2. Parse input {input} into appropriate JavaScript variables
3. Call the user's function with parsed variables
4. Print result using console.log()

INPUT PARSING RULES:
- Array input [1,2,3] → let nums = [1,2,3];
- Multiple params [arr, target] → separate variables
- String input "hello" → let s = "hello";
- Objects/arrays preserved as-is

OUTPUT FORMATTING:
- Arrays/Objects: console.log() handles formatting automatically
- Primitives: Direct console.log()

EXAMPLE TRANSFORMATION:
Input: [[1,2,3], 5]
Variables:
let nums = [1,2,3];
let target = 5;

Generate ONLY the complete JavaScript code:`,

  cpp: `You are a C++ code generator. Create a complete, runnable C++ program that executes user code with test inputs.

CONTEXT: This is for algorithmic problem solving. The user has written a solution function that needs to be tested.

USER'S SOLUTION CODE (DO NOT MODIFY):
{userCode}

TEST INPUT: {input}
EXPECTED OUTPUT: {expectedOutput}

CRITICAL REQUIREMENTS:
1. PRESERVE user code exactly - no formatting, comments, or modifications
2. Include necessary headers: #include <iostream>, <vector>, <string>, etc.
3. Parse input {input} into appropriate C++ variables
4. Call the user's function with parsed variables
5. Print result using cout

INPUT PARSING RULES:
- Array input [1,2,3] → vector<int> nums = {1,2,3};
- Multiple params [arr, target] → separate variables
- String input "hello" → string s = "hello";
- 2D arrays [[1,2],[3,4]] → vector<vector<int>> matrix = {{1,2},{3,4}};

OUTPUT FORMATTING:
- Vectors: Print elements with spaces or use custom loop
- Primitives: Direct cout <<
- Strings: Direct cout <<

EXAMPLE TRANSFORMATION:
Input: [[1,2,3], 5]
Variables:
vector<int> nums = {1,2,3};
int target = 5;

Required headers and using namespace std;

Generate ONLY the complete C++ code with proper includes:`
};


// Enhanced function to detect function name and parameters from user code
function analyzeUserCode(code: string, language: string): { functionName?: string, paramTypes?: string[] } {
  const analysis: { functionName?: string, paramTypes?: string[] } = {};
  
  try {
    switch (language) {
      case 'java':
        // Look for public method patterns
        const javaMatch = code.match(/public\s+(?:static\s+)?(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\([^)]*\)/);
        if (javaMatch) {
          analysis.functionName = javaMatch[2];
        }
        break;
        
      case 'python':
        // Look for def function_name patterns
        const pythonMatch = code.match(/def\s+(\w+)\s*\([^)]*\)/);
        if (pythonMatch) {
          analysis.functionName = pythonMatch[1];
        }
        break;
        
      case 'javascript':
        // Look for function patterns (function name, const name =, etc.)
        const jsMatch = code.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|\s*(\w+)\s*[:=]\s*(?:function|\([^)]*\)\s*=>))/);
        if (jsMatch) {
          analysis.functionName = jsMatch[1] || jsMatch[2] || jsMatch[3];
        }
        break;
        
      case 'cpp':
        // Look for return_type function_name patterns
        const cppMatch = code.match(/(\w+(?:<[^>]+>)?(?:\s*\*)?)\s+(\w+)\s*\([^)]*\)/);
        if (cppMatch && !['if', 'for', 'while', 'switch'].includes(cppMatch[2])) {
          analysis.functionName = cppMatch[2];
        }
        break;
    }
  } catch (error) {
    console.warn('Failed to analyze user code:', error);
  }
  
  return analysis;
}

// Enhanced input parsing with better type inference
function generateInputVariables(input: any[], language: string): string {
  const variables: string[] = [];
  
  input.forEach((param, index) => {
    const varName = getVariableName(index, param);
    const varDeclaration = formatVariable(param, varName, language);
    if (varDeclaration) {
      variables.push(varDeclaration);
    }
  });
  
  return variables.join('\n');
}

function getVariableName(index: number, value: any): string {
  // Common parameter name patterns based on type
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return index === 0 ? 'matrix' : `matrix${index + 1}`;
    }
    return index === 0 ? 'nums' : `arr${index + 1}`;
  }
  if (typeof value === 'string') {
    return index === 0 ? 's' : `str${index + 1}`;
  }
  if (typeof value === 'number') {
    return index === 0 ? 'target' : `num${index + 1}`;
  }
  return `param${index + 1}`;
}

function formatVariable(value: any, name: string, language: string): string {
  switch (language) {
    case 'java':
      return formatJavaVariable(value, name);
    case 'python':
      return `${name} = ${JSON.stringify(value)}`;
    case 'javascript':
      return `let ${name} = ${JSON.stringify(value)};`;
    case 'cpp':
      return formatCppVariable(value, name);
    default:
      return '';
  }
}

function formatJavaVariable(value: any, name: string): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `int[] ${name} = {};`;
    }
    
    if (Array.isArray(value[0])) {
      // 2D array
      const formatted = value.map(row => `{${row.join(',')}}`).join(',');
      return `int[][] ${name} = {${formatted}};`;
    } else if (typeof value[0] === 'string') {
      const formatted = value.map(s => `"${s}"`).join(',');
      return `String[] ${name} = {${formatted}};`;
    } else {
      return `int[] ${name} = {${value.join(',')}};`;
    }
  } else if (typeof value === 'string') {
    return `String ${name} = "${value}";`;
  } else if (typeof value === 'boolean') {
    return `boolean ${name} = ${value};`;
  } else {
    return `int ${name} = ${value};`;
  }
}

function formatCppVariable(value: any, name: string): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `vector<int> ${name} = {};`;
    }
    
    if (Array.isArray(value[0])) {
      const formatted = value.map(row => `{${row.join(',')}}`).join(',');
      return `vector<vector<int>> ${name} = {${formatted}};`;
    } else if (typeof value[0] === 'string') {
      const formatted = value.map(s => `"${s}"`).join(',');
      return `vector<string> ${name} = {${formatted}};`;
    } else {
      return `vector<int> ${name} = {${value.join(',')}};`;
    }
  } else if (typeof value === 'string') {
    return `string ${name} = "${value}";`;
  } else if (typeof value === 'boolean') {
    return `bool ${name} = ${value ? 'true' : 'false'};`;
  } else {
    return `int ${name} = ${value};`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, language: providedLanguage, input, expectedOutput } = await req.json();
    
    console.log("🚀 Enhanced AI Execute:", {
      language: providedLanguage,
      codeLength: code?.length || 0,
      inputCount: Array.isArray(input) ? input.length : 0,
      expectedOutput: JSON.stringify(expectedOutput)
    });

    // Enhanced validation
    if (!code?.trim()) {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: "No code provided",
        explanation: "Please provide the solution code to execute",
      });
    }

    if (!Array.isArray(input)) {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: "Invalid input format",
        explanation: "Input must be an array of function parameters",
      });
    }

    const language = providedLanguage?.toLowerCase() || "java";
    const languageId = LANGUAGE_MAP[language];
    
    if (!languageId) {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: `Unsupported language: ${language}`,
        explanation: `${language} is not supported for execution`,
      });
    }

    const promptTemplate = ENHANCED_PROMPTS[language as keyof typeof ENHANCED_PROMPTS];
    if (!promptTemplate) {
      return NextResponse.json({
        actualOutput: "",
        passed: false,
        error: `No template for language: ${language}`,
        explanation: `Language ${language} not supported`,
      });
    }

    // Analyze user code for better context
    const codeAnalysis = analyzeUserCode(code, language);
    console.log("🔍 Code analysis:", codeAnalysis);

    // Enhanced prompt with better context
    const prompt = promptTemplate
      .replace(/{input}/g, JSON.stringify(input))
      .replace(/{expectedOutput}/g, JSON.stringify(expectedOutput))
      .replace(/{userCode}/g, code);

    console.log("🤖 Generating enhanced wrapper...");

    const aiResult = await generateText({
      model: gemini("gemini-2.0-flash"),
      prompt,
    });

    let executableCode = aiResult.text.trim();
    
    // Enhanced code cleaning
    const codeBlockMatch = executableCode.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      executableCode = codeBlockMatch[1].trim();
    }

    // Remove any AI commentary that might have slipped through
    const codeLines = executableCode.split('\n');
    const cleanLines = codeLines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') || 
             !trimmed.includes('This') || 
             !trimmed.includes('AI') ||
             !trimmed.includes('generated');
    });
    executableCode = cleanLines.join('\n');

    console.log("📝 Generated code preview:", executableCode);

    // Execute with Judge0
    const executionResult = await executeCode({
      code: executableCode,
      language: language.toLowerCase(),
      input: "",
    });

    console.log("📊 Judge0 result:", {
      stdout: executionResult.stdout?.substring(0, 200),
      stderr: executionResult.stderr?.substring(0, 200),
      compile_output: executionResult.compile_output?.substring(0, 200),
      status: executionResult.status?.description
    });

    let actualOutput = "";
    let executionError: string | null = null;
    let passed = false;

    // Enhanced error handling
    if (executionResult.compile_output?.trim()) {
      executionError = executionResult.compile_output.trim();
      actualOutput = "Compilation failed";
    } else if (executionResult.stderr?.trim()) {
      executionError = executionResult.stderr.trim();
      actualOutput = "Runtime error";
    } else if (executionResult.stdout?.trim()) {
      actualOutput = executionResult.stdout.trim();
      passed = compareOutputs(actualOutput, expectedOutput);
    } else {
      actualOutput = "No output";
      executionError = "No output produced";
    }

    return NextResponse.json({
      actualOutput,
      passed,
      error: executionError,
      explanation: passed 
        ? "✅ Test passed!" 
        : `❌ Expected: ${JSON.stringify(expectedOutput)}, Got: ${actualOutput}`,
      executionDetails: {
        time: executionResult.time || 0,
        memory: executionResult.memory || 0,
        language: language,
        status: executionResult.status?.description || "Unknown",
        codeAnalysis,
      },
    });

  } catch (error: any) {
    console.error("💥 Enhanced execution error:", error);
    return NextResponse.json({
      actualOutput: "",
      passed: false,
      error: `System error: ${error.message}`,
      explanation: "An unexpected error occurred during code execution.",
    });
  }
}

// Enhanced output comparison with better type handling
// ... existing code ...

// Enhanced output comparison with robust type handling
function compareOutputs(actual: string, expected: any): boolean {
  const actualTrimmed = actual.trim();
  const expectedStr = String(expected).trim();

  // Direct string match (most common case)
  if (actualTrimmed === expectedStr) return true;

  // Handle array outputs
  if (Array.isArray(expected)) {
    try {
      // Try JSON parsing first
      const actualArray = JSON.parse(actualTrimmed);
      return deepCompare(actualArray, expected);
    } catch {
      // Handle non-JSON array strings
      if (actualTrimmed.startsWith('[') && actualTrimmed.endsWith(']')) {
        const items = parseNonJsonArray(actualTrimmed);
        return compareArrayItems(items, expected);
      }
    }
  }

  // Numeric comparison with tolerance
  const actualNum = parseFloat(actualTrimmed);
  const expectedNum = parseFloat(expectedStr);
  if (!isNaN(actualNum) && !isNaN(expectedNum)) {
    return Math.abs(actualNum - expectedNum) < 1e-9;
  }

  // Boolean comparison
  const boolMap: Record<string, boolean> = {
    'true': true, 'false': false, '1': true, '0': false
  };
  if (actualTrimmed.toLowerCase() in boolMap) {
    const expectedBool = typeof expected === 'boolean' 
      ? expected 
      : boolMap[expectedStr.toLowerCase()];
    return boolMap[actualTrimmed.toLowerCase()] === expectedBool;
  }

  // Case-insensitive string comparison
  return actualTrimmed.toLowerCase() === expectedStr.toLowerCase();
}

// Helper for deep array comparison
function deepCompare(actual: any, expected: any): boolean {
  if (actual === expected) return true;

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (!deepCompare(actual[i], expected[i])) return false;
    }
    return true;
  }

  // Handle mixed types with coercion
  if (typeof actual === 'string' && typeof expected === 'number') {
    const num = Number(actual);
    return !isNaN(num) && Math.abs(num - expected) < 1e-9;
  }
  
  if (typeof actual === 'number' && typeof expected === 'string') {
    const num = Number(expected);
    return !isNaN(num) && Math.abs(actual - num) < 1e-9;
  }
  
  return actual == expected;
}

// Parse non-JSON array strings (e.g., [JFK, MUC])
function parseNonJsonArray(actual: string): string[] {
  const inner = actual.slice(1, -1).trim();
  if (!inner) return [];
  
  return inner.split(',').map(item => {
    let cleaned = item.trim();
    // Remove surrounding quotes if present
    if (/^["'](.*)["']$/.test(cleaned)) {
      return cleaned.slice(1, -1);
    }
    return cleaned;
  });
}

// Compare parsed array items with expected values
function compareArrayItems(items: string[], expected: any[]): boolean {
  if (items.length !== expected.length) return false;
  
  for (let i = 0; i < expected.length; i++) {
    const expectedItem = expected[i];
    const actualItem = items[i];
    
    if (typeof expectedItem === 'number') {
      const num = Number(actualItem);
      if (isNaN(num) || Math.abs(num - expectedItem) > 1e-9) {
        return false;
      }
    } else if (expectedItem !== actualItem) {
      return false;
    }
  }
  
  return true;
}

// ... existing code ...