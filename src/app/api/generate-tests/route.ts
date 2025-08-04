import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const LEETCODE_TEST_CASE_PROMPT = `
You are an expert LeetCode test case generator. Analyze the provided code and generate exactly 3 test cases in the specified JSON format.

CRITICAL: You MUST identify a clear, callable function in the code. If no function is found, respond with: {"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}

FUNCTION ANALYSIS:
1. Identify the function signature: name, parameters, return type.
2. Validate the function is complete and callable.
3. Analyze the algorithm logic to understand its purpose.
4. Detect the problem pattern (e.g., Two Sum, Binary Search, etc).

CODE TO ANALYZE:
\`\`\`{language}
{user_code}
\`\`\`

FUNCTION DETECTION RULES:

Java:
- Must have: access modifier (public/private/protected), return type, function name, parameters.
- Pattern: (public|private|protected)?\\s*(static)?\\s*\\w+\\s+(\\w+)\\s*\\([^)]*\\)
- Example: public int twoSum(int[] nums, int target)

Python:
- Must have: def keyword, function name, parameters, colon.
- Pattern: def\\s+(\\w+)\\s*\\([^)]*\\):
- Example: def twoSum(self, nums: List[int], target: int) -> List[int]:

JavaScript:
- Must have: function keyword OR arrow function OR method definition.
- Patterns: function\\s+(\\w+), (\\w+)\\s*=.*=>, (\\w+)\\s*\\([^)]*\\)\\s*\\{
- Example: function twoSum(nums, target) {

C/C++:
- Must have: return type, function name, parameters.
- Pattern: \\w+\\s+(\\w+)\\s*\\([^)]*\\)\\s*\\{
- Example: vector<int> twoSum(vector<int>& nums, int target) {

ALGORITHM PATTERN DETECTION:

Two Sum:
- Signature: (array, target) → array of indices
- Indicators: HashMap/dict, target-nums[i], nested loops
- Test format: {"input": [[array], target], "output": [index1, index2]}

Three Sum:
- Signature: (array) → array of triplets
- Indicators: sort(), two pointers, sum == 0
- Test format: {"input": [[array]], "output": [[triplet1], [triplet2]]}

Binary Search:
- Signature: (array, target) → index
- Indicators: left/right/mid, while loop, divide and conquer
- Test format: {"input": [[array], target], "output": index}

Palindrome:
- Signature: (string) → boolean
- Indicators: two pointers from ends, string reversal
- Test format: {"input": ["string"], "output": boolean}

Linked List:
- Signature: (ListNode) → ListNode/boolean/int
- Indicators: .next, prev/curr pointers, fast/slow
- Test format: {"input": [[values]], "output": result}

Tree Traversal:
- Signature: (TreeNode) → array/int/boolean
- Indicators: recursion, queue/stack, left/right
- Test format: {"input": [[tree_array]], "output": result}

Dynamic Programming:
- Signature: (int/array) → int
- Indicators: dp array, memoization, recursive subproblems
- Test format: {"input": [param], "output": result}

STRICT REQUIREMENTS:
1. Code MUST contain a complete, identifiable function.
2. Do NOT generate generic or fallback test cases.
3. Test cases must match the detected algorithm.
4. Use realistic, meaningful inputs.
5. Follow exact LeetCode input/output conventions.

TEST CASES:
- Test 1: Normal case (typical input)
- Test 2: Edge case (empty input, boundary, minimal)
- Test 3: Complex case (large input, multiple solutions, stress)

INPUT FORMAT:
- Wrap ALL function parameters in arrays: func(a, b) → {"input": [a, b], ...}
- Single parameter: func(arr) → {"input": [arr], ...}
- Multiple parameters: func(nums, target) → {"input": [nums, target], ...}

OUTPUT FORMAT:
Return ONLY valid JSON. Either:
1. Success: [{"input": [...], "output": ...}, {"input": [...], "output": ...}, {"input": [...], "output": ...}]
2. Error: {"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}

If you cannot identify a clear, complete function with proper signature, return the error JSON immediately.

Generate test cases now:
`;

interface FunctionSignature {
  name: string;
  parameters: string[];
  returnType?: string;
  language: string;
  isValid: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, code, language } = await req.json();

    let codeToAnalyze = code;
    let detectedLanguage = language || "java";

    // Enhanced code extraction from messages
    if (!codeToAnalyze && Array.isArray(messages) && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      
      const extractionPatterns: RegExp[] = [
        /```(\w+)?\s*([\s\S]*?)```/,
        /`([^`\n]+)`/,
        /(?:function|def|class|public|private)\s+[\w\s\(\)]+\s*[\{\:]/i,
      ];

      for (const pattern of extractionPatterns) {
        const match = userMessage.content.match(pattern);
        if (match) {
          if (pattern === extractionPatterns[0]) {
            detectedLanguage = match[1] || language || "java";
            codeToAnalyze = match[2]?.trim() || "";
          } else {
            codeToAnalyze = match[1] || match[0];
          }
          break;
        }
      }
    }

    // Strict validation - reject if no code
    if (!codeToAnalyze || codeToAnalyze.trim().length === 0) {
      return Response.json({
        error: "NO_CODE_PROVIDED",
        message: "No code found in the request",
        details: "Please provide code either directly or within triple backticks",
        retryable: true
      }, { status: 400 });
    }

    // Minimum length validation
    if (codeToAnalyze.length < 30) {
      return Response.json({
        error: "INSUFFICIENT_CODE",
        message: "Code is too short for analysis",
        details: `Code length: ${codeToAnalyze.length} characters (minimum 30 required)`,
        retryable: true
      }, { status: 400 });
    }

    // Language detection
    if (!language) {
      detectedLanguage = detectLanguageFromCode(codeToAnalyze);
    }

    // CRITICAL: Function signature validation
    const functionSignature = extractFunctionSignature(codeToAnalyze, detectedLanguage);
    
    if (!functionSignature.isValid) {
      return Response.json({
        error: "NO_FUNCTION_FOUND",
        message: "No callable function detected in the provided code",
        details: `Expected a complete function definition in ${detectedLanguage}`,
        suggestions: [
          "Ensure your code contains a complete function with signature",
          "Include function name, parameters, and function body",
          "Check syntax for the specified programming language"
        ],
        retryable: true
      }, { status: 400 });
    }

    console.log(`📊 Function Analysis Result:`, {
      name: functionSignature.name,
      parameters: functionSignature.parameters.length,
      language: detectedLanguage,
      codeLength: codeToAnalyze.length
    });

    const prompt = LEETCODE_TEST_CASE_PROMPT
      .replace(/\{user_code\}/g, codeToAnalyze)
      .replace(/\{language\}/g, detectedLanguage);

    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt,
      maxTokens: 2000,
      temperature: 0.1,
    });

    const response = result.toDataStreamResponse();
    
    // Enhanced headers with function info
    response.headers.set('Content-Type', 'text/plain; charset=utf-8');
    response.headers.set('Cache-Control', 'no-cache');
    response.headers.set('X-Function-Name', functionSignature.name);
    response.headers.set('X-Function-Language', detectedLanguage);
    response.headers.set('X-Function-Parameters', functionSignature.parameters.length.toString());

    return response;

  } catch (error: any) {
    console.error("💥 Test Case Generation Error:", error);

    return Response.json({
      error: "GENERATION_FAILED",
      message: "Failed to generate test cases",
      details: process.env.NODE_ENV === 'development' ? error.message : "Internal processing error",
      timestamp: new Date().toISOString(),
      retryable: true
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// Enhanced function signature extraction
function extractFunctionSignature(code: string, language: string): FunctionSignature {
  const result: FunctionSignature = {
    name: "",
    parameters: [],
    language,
    isValid: false
  };

  try {
    switch (language.toLowerCase()) {
      case 'java':
        return extractJavaFunction(code);
      case 'python':
        return extractPythonFunction(code);
      case 'javascript':
        return extractJavaScriptFunction(code);
      case 'cpp':
      case 'c':
        return extractCppFunction(code);
      default:
        return result;
    }
  } catch (error) {
    console.warn(`Function extraction failed for ${language}:`, error);
    return result;
  }
}

function extractJavaFunction(code: string): FunctionSignature {
  // Match Java method signature: [modifiers] returnType methodName(parameters)
  const javaPattern = /(public|private|protected)?\s*(static)?\s*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/g;
  
  const matches = Array.from(code.matchAll(javaPattern));
  
  for (const match of matches) {
    const [, , , returnType, functionName, paramString] = match;
    
    // Skip common keywords that aren't function names
    if (['class', 'if', 'for', 'while', 'switch'].includes(functionName)) {
      continue;
    }
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => p.trim().split(/\s+/).pop() || '') : [];
    
    // Validate it's actually in a function body (has opening brace)
    const functionStart = match.index || 0;
    const afterMatch = code.substring(functionStart + match[0].length).trim();
    
    if (afterMatch.startsWith('{')) {
      return {
        name: functionName,
        parameters,
        returnType,
        language: 'java',
        isValid: true
      };
    }
  }
  
  return { name: "", parameters: [], language: 'java', isValid: false };
}

function extractPythonFunction(code: string): FunctionSignature {
  // Match Python function: def function_name(parameters):
  const pythonPattern = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/g;
  
  const matches = Array.from(code.matchAll(pythonPattern));
  
  for (const match of matches) {
    const [, functionName, paramString] = match;
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => {
        const param = p.trim().split(':')[0].trim();
        return param === 'self' ? param : param;
      }).filter(p => p) : [];
    
    // Check if there's actual function body (indentation after colon)
    const functionStart = (match.index || 0) + match[0].length;
    const afterColon = code.substring(functionStart);
    const nextLines = afterColon.split('\n').slice(1, 3);
    
    const hasBody = nextLines.some(line => line.trim() && line.startsWith('    '));
    
    if (hasBody) {
      return {
        name: functionName,
        parameters,
        language: 'python',
        isValid: true
      };
    }
  }
  
  return { name: "", parameters: [], language: 'python', isValid: false };
}

function extractJavaScriptFunction(code: string): FunctionSignature {
  // Multiple JS function patterns
  const patterns = [
    /function\s+(\w+)\s*\(([^)]*)\)\s*{/g,                    // function name() {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,     // const name = () =>
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/g, // const name = function()
    /(\w+)\s*:\s*function\s*\(([^)]*)\)/g,                   // name: function()
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, paramString] = match;
      
      if (['if', 'for', 'while', 'switch', 'const', 'let', 'var'].includes(functionName)) {
        continue;
      }
      
      const parameters = paramString.trim() ? 
        paramString.split(',').map(p => p.trim().split('=')[0].trim()) : [];
      
      return {
        name: functionName,
        parameters,
        language: 'javascript',
        isValid: true
      };
    }
  }
  
  return { name: "", parameters: [], language: 'javascript', isValid: false };
}

function extractCppFunction(code: string): FunctionSignature {
  // Match C++ function: returnType functionName(parameters) {
  const cppPattern = /(\w+(?:<[^>]+>)?(?:\s*\*)?)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
  
  const matches = Array.from(code.matchAll(cppPattern));
  
  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;
    
    // Skip control structures and common keywords
    if (['if', 'for', 'while', 'switch', 'int', 'main'].includes(functionName)) {
      continue;
    }
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        return parts[parts.length - 1] || '';
      }) : [];
    
    return {
      name: functionName,
      parameters,
      returnType,
      language: 'cpp',
      isValid: true
    };
  }
  
  return { name: "", parameters: [], language: 'cpp', isValid: false };
}

// Enhanced language detection
function detectLanguageFromCode(code: string): string {
  const languagePatterns = [
    { pattern: /public\s+(?:static\s+)?\w+\s+\w+\s*\(|import\s+java\.|System\.out/i, language: 'java' },
    { pattern: /#include\s*<.*>.*int\s+main|printf\s*\(/i, language: 'c' },
    { pattern: /#include\s*<.*>.*using\s+namespace|std::|vector<|cout\s*<</i, language: 'cpp' },
    { pattern: /def\s+\w+.*:|import\s+\w+|print\s*\(|:\s*$/m, language: 'python' },
    { pattern: /function\s+\w+|console\.log|let\s+\w+\s*=|const\s+\w+\s*=/i, language: 'javascript' },
  ];

  for (const { pattern, language } of languagePatterns) {
    if (pattern.test(code)) {
      return language;
    }
  }

  // Fallback detection based on syntax
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('public ') && code.includes('System.')) return 'java';
  if (code.includes('function ') || code.includes('console.')) return 'javascript';
  if (code.includes('#include') && code.includes('cout')) return 'cpp';
  if (code.includes('#include') && code.includes('printf')) return 'c';
  
  return 'java'; // Default fallback
}

// Strict test case validation - NO fallbacks allowed
export function validateTestCaseFormat(testCases: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for error response first
  if (testCases && typeof testCases === 'object' && 'error' in testCases) {
    if (testCases.error === 'NO_FUNCTION_FOUND') {
      errors.push("AI detected no function in the code");
      return { isValid: false, errors };
    }
  }
  
  if (!Array.isArray(testCases)) {
    errors.push("Test cases must be an array");
    return { isValid: false, errors };
  }

  if (testCases.length !== 3) {
    errors.push(`Expected exactly 3 test cases, got ${testCases.length}`);
  }

  testCases.forEach((testCase, index) => {
    if (!testCase || typeof testCase !== 'object') {
      errors.push(`Test case ${index + 1}: Must be an object`);
      return;
    }

    if (!('input' in testCase)) {
      errors.push(`Test case ${index + 1}: Missing 'input' field`);
    } else if (!Array.isArray(testCase.input)) {
      errors.push(`Test case ${index + 1}: 'input' must be an array`);
    }

    if (!('output' in testCase)) {
      errors.push(`Test case ${index + 1}: Missing 'output' field`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Enhanced test case sanitization - STRICT, no fallbacks
export function sanitizeTestCases(rawOutput: string): {
  testCases: any[] | null;
  errors: string[];
} {
  const errors: string[] = [];
  
  try {
    // Clean AI response
    let cleanedOutput = rawOutput
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Check for error response from AI
    if (cleanedOutput.includes('"error"') && cleanedOutput.includes('NO_FUNCTION_FOUND')) {
      const errorMatch = cleanedOutput.match(/\{[^}]*"error"[^}]*\}/);
      if (errorMatch) {
        const errorObj = JSON.parse(errorMatch[0]);
        errors.push(errorObj.message || "No function found in code");
        return { testCases: null, errors };
      }
    }

    // Extract JSON array
    const jsonMatch = cleanedOutput.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      errors.push("No valid JSON array found in AI response");
      return { testCases: null, errors };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validation = validateTestCaseFormat(parsed);
    
    if (!validation.isValid) {
      errors.push(...validation.errors);
      return { testCases: null, errors };
    }
    
    return {
      testCases: parsed,
      errors: []
    };
    
  } catch (error) {
    console.error("Test case sanitization failed:", error);
    errors.push("Failed to parse AI response");
    return { testCases: null, errors };
  }
}