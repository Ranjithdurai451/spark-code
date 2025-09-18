import { createGeminiClient } from "@/lib/model";
import { executeOnJudge0 } from "@/lib/judge0";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { requireCredits } from "@/lib/credits";

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
};

// BYOK removed: use env via helpers

interface CodeAnalysis {
  functionName: string;
  parameters: string[];
  returnType: string;
  language: string;
  dataStructures: Set<string>;
  algorithmPattern: string;
  isAsync: boolean;
  isStatic: boolean;
}

// Enhanced comprehensive prompt for all languages
const LEETCODE_WRAPPER_PROMPT = `
You are an expert LeetCode wrapper code generator for multiple programming languages.

**CRITICAL RULES:**
1. NEVER modify the user's function code - include it EXACTLY as provided
2. Generate wrapper based on function signature and algorithm pattern
3. Handle all input/output conversions for LeetCode format
4. Return complete, executable code with proper main execution
5. IGNORE any code comments completely

**DETECTED ANALYSIS:**
- Function: {function_name}
- Parameters: {function_params}
- Return Type: {return_type}
- Language: {language}
- Algorithm Pattern: {algorithm_pattern}
- Data Structures: {data_structures}
- Test Input: {test_input}
- Expected Output: {expected_output}

**LANGUAGE-SPECIFIC REQUIREMENTS:**

**JAVA:**
- Embed ListNode/TreeNode classes INSIDE the Main class
- Use public static void main(String[] args)
- Force class name to be "Main" 
- Include necessary imports (java.util.*)
- Handle static/non-static method calls properly

**PYTHON:**
- Use if __name__ == "__main__": block
- Define ListNode/TreeNode classes at top level
- Handle list/array conversions properly
- Use proper indentation

**C++:**
- Include necessary headers (#include <iostream>, <vector>, etc.)
- Use using namespace std;
- Define structs for ListNode/TreeNode
- Use proper main() function

**C:**
- Include stdio.h and stdlib.h
- Define structs for data structures
- Use proper printf formatting
- Handle memory allocation if needed

**GO:**
- Use package main and func main()
- Define structs for data structures
- Use proper Go syntax and formatting
- Handle slices and arrays correctly

**JAVASCRIPT:**
- Define classes for ListNode/TreeNode
- Use console.log for output
- Handle arrays and objects properly
- Use proper function syntax

**TYPESCRIPT:**
- Include proper type annotations
- Define interfaces/classes for data structures
- Use console.log for output
- Handle type conversions properly

**DATA STRUCTURE CONVERSION PATTERNS:**

**ListNode Problems:**
- Input: [1,2,3,4,5] → Convert to linked list
- Output: ListNode → Convert back to [1,2,3,4,5]
- Include: ListNode class with val and next properties

**TreeNode Problems:**
- Input: [3,9,20,null,null,15,7] → Convert to binary tree
- Output: TreeNode/array → Convert appropriately
- Include: TreeNode class with val, left, right properties

**Matrix Problems:**
- Input: [[1,2],[3,4]] → Use as 2D array directly
- Output: Matrix/boolean/number → Return appropriately

**Array Problems:**
- Input: [nums, target] → Pass parameters directly
- Output: indices/value → Return as-is

**String Problems:**
- Input: ["string"] or ["str1", "str2"] → Pass as strings
- Output: boolean/string/number → Return as-is

**EXECUTION REQUIREMENTS:**
1. Include user code EXACTLY as written
2. Add necessary data structure classes/structs
3. Convert test input to function parameters
4. Call user function with proper parameters
5. Convert output to expected format
6. Print ONLY the final result (no extra text)

**CRITICAL FOR {language}:**
Generate complete, working {language} code that:
- Compiles without errors
- Includes all necessary imports/headers
- Handles the specific test case: {test_input} → {expected_output}
- Embeds user code exactly as provided
- Outputs ONLY the result value

USER CODE TO INCLUDE (NEVER MODIFY):
\`\`\`{language}
{user_code}
\`\`\`

TEST CASE TO HANDLE:
Input: {test_input}
Expected Output: {expected_output}

Generate the complete executable {language} code now:
`;

// Enhanced code analysis with comprehensive pattern matching
function analyzeCode(code: string, language: string): CodeAnalysis {
  const analysis: CodeAnalysis = {
    functionName: "",
    parameters: [],
    returnType: "",
    language: language.toLowerCase(),
    dataStructures: new Set<string>(),
    algorithmPattern: "standard",
    isAsync: false,
    isStatic: false,
  };

  console.log(`Analyzing ${language} code for function detection...`);

  switch (language.toLowerCase()) {
    case "java":
      return analyzeJavaCode(code, analysis);
    case "python":
      return analyzePythonCode(code, analysis);
    case "cpp":
      return analyzeCppCode(code, analysis);
    case "c":
      return analyzeCCode(code, analysis);
    case "go":
      return analyzeGoCode(code, analysis);
    case "javascript":
      return analyzeJavaScriptCode(code, analysis);
    case "typescript":
      return analyzeTypeScriptCode(code, analysis);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

// Enhanced Java analysis with comprehensive patterns
function analyzeJavaCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  // Remove comments and strings to avoid false matches
  const cleanCode = removeCommentsAndStrings(code, "java");

  const methodPatterns = [
    // Full method signature with access modifiers
    /(public|private|protected)?\s*(static)?\s*([\w<>\[\]\s,?]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Simple method signature
    /([\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Generic type methods
    /<[^>]+>\s*([\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
  ];

  for (const pattern of methodPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      let returnType, methodName, params, staticKeyword;

      if (match.length === 6) {
        [, , staticKeyword, returnType, methodName, params] = match;
      } else if (match.length === 4) {
        [, returnType, methodName, params] = match;
      } else {
        continue;
      }

      if (methodName && !isExcludedMethod(methodName, "java")) {
        analysis.functionName = methodName;
        analysis.returnType = returnType?.trim() || "";
        analysis.isStatic = !!staticKeyword;
        analysis.parameters = parseParameters(params || "", "java");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `Java function detected: ${methodName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  console.log(`No valid Java function found in code`);
  return analysis;
}

// Enhanced Python analysis
function analyzePythonCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const cleanCode = removeCommentsAndStrings(code, "python");

  const functionPatterns = [
    // Function with type hints
    /def\s+(\w+)\s*\(([^)]*)\)\s*->\s*([^:]+):/g,
    // Function without type hints
    /def\s+(\w+)\s*\(([^)]*)\):/g,
    // Async functions
    /async\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/g,
  ];

  for (const pattern of functionPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      const [, functionName, params, returnType] = match;

      if (!isExcludedMethod(functionName, "python")) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.isAsync = match[0].includes("async");
        analysis.parameters = parseParameters(params || "", "python");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `Python function detected: ${functionName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  console.log(`No valid Python function found in code`);
  return analysis;
}

// Enhanced C++ analysis
function analyzeCppCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const cleanCode = removeCommentsAndStrings(code, "cpp");

  const functionPatterns = [
    // Template functions
    /template\s*<[^>]*>\s*([\w<>\*&:\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
    // Regular functions
    /([\w<>\*&:\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
    // Namespace functions
    /(\w+)::\s*(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
    // Auto return type
    /auto\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
  ];

  for (const pattern of functionPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      let returnType, functionName, params;

      if (match.length === 4 && match[0].includes("::")) {
        [, , functionName, params] = match;
        returnType = "auto";
      } else if (match[0].startsWith("auto")) {
        [, functionName, params] = match;
        returnType = "auto";
      } else {
        [, returnType, functionName, params] = match;
      }

      if (!isExcludedMethod(functionName, "cpp")) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = parseParameters(params || "", "cpp");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `C++ function detected: ${functionName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  console.log(`No valid C++ function found in code`);
  return analysis;
}

// Enhanced C analysis
function analyzeCCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const cleanCode = removeCommentsAndStrings(code, "c");

  const functionPatterns = [
    // Standard C function
    /([\w\*\s]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Function pointer
    /([\w\*\s]+)\s*\(\*(\w+)\)\s*\(([^)]*)\)/g,
  ];

  for (const pattern of functionPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      const [, returnType, functionName, params] = match;

      if (!isExcludedMethod(functionName, "c")) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = parseParameters(params || "", "c");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `C function detected: ${functionName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  return analysis;
}

// Enhanced Go analysis
function analyzeGoCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const cleanCode = removeCommentsAndStrings(code, "go");

  const functionPatterns = [
    // Regular function
    /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g,
    // Method with receiver
    /func\s+\([^)]+\)\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g,
    // Function with multiple return values
    /func\s+(\w+)\s*\(([^)]*)\)\s*\(([^)]+)\)\s*\{/g,
  ];

  for (const pattern of functionPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      const [, functionName, params, returnType] = match;

      if (!isExcludedMethod(functionName, "go")) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = parseParameters(params || "", "go");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `Go function detected: ${functionName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  return analysis;
}

// Enhanced JavaScript analysis
function analyzeJavaScriptCode(
  code: string,
  analysis: CodeAnalysis,
): CodeAnalysis {
  const cleanCode = removeCommentsAndStrings(code, "javascript");

  const functionPatterns = [
    // Function declarations
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Const/let/var function expressions
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{/g,
    // Arrow functions with parentheses
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    // Arrow functions single parameter
    /(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>/g,
    // Method definitions in classes
    /(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Async functions
    /async\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*async\s*\(([^)]*)\)\s*=>/g,
  ];

  for (const pattern of functionPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      let functionName, params;

      if (match.length === 3 && !match[0].includes("=")) {
        // Single parameter arrow function
        [, functionName, params] = match;
        params = params || "";
      } else {
        [, functionName, params] = match;
      }

      if (!isExcludedMethod(functionName, "javascript")) {
        analysis.functionName = functionName;
        analysis.returnType = "";
        analysis.isAsync = match[0].includes("async");
        analysis.parameters = parseParameters(params || "", "javascript");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `JavaScript function detected: ${functionName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  return analysis;
}

// Enhanced TypeScript analysis
function analyzeTypeScriptCode(
  code: string,
  analysis: CodeAnalysis,
): CodeAnalysis {
  const cleanCode = removeCommentsAndStrings(code, "typescript");

  const functionPatterns = [
    // Function with return type
    /function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Arrow function with return type
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*:\s*([^=]+)\s*=>/g,
    // Function without return type
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Arrow function without return type
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    // Class methods with types
    /(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Async functions
    /async\s+function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g,
  ];

  for (const pattern of functionPatterns) {
    const matches = Array.from(cleanCode.matchAll(pattern));
    for (const match of matches) {
      const [, functionName, params, returnType] = match;

      if (!isExcludedMethod(functionName, "typescript")) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.isAsync = match[0].includes("async");
        analysis.parameters = parseParameters(params || "", "typescript");

        detectDataStructuresAndPattern(code, analysis);
        console.log(
          `TypeScript function detected: ${functionName} with ${analysis.parameters.length} parameters`,
        );
        return analysis;
      }
    }
  }

  return analysis;
}

// Remove comments and strings to avoid false pattern matches
function removeCommentsAndStrings(code: string, language: string): string {
  let cleaned = code;

  switch (language) {
    case "java":
    case "cpp":
    case "c":
    case "javascript":
    case "typescript":
    case "go":
      // Remove single-line comments
      cleaned = cleaned.replace(/\/\/.*$/gm, "");
      // Remove multi-line comments
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
      // Remove string literals
      cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');
      cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''");
      break;
    case "python":
      // Remove single-line comments
      cleaned = cleaned.replace(/#.*$/gm, "");
      // Remove multi-line strings/comments
      cleaned = cleaned.replace(/"""[\s\S]*?"""/g, "");
      cleaned = cleaned.replace(/'''[\s\S]*?'''/g, "");
      // Remove string literals
      cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');
      cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''");
      break;
  }

  return cleaned;
}

// Enhanced parameter parsing for all languages
function parseParameters(params: string, language = "java"): string[] {
  if (!params.trim()) return [];

  const paramList = params
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p);

  switch (language) {
    case "python":
      return paramList
        .map((p) => p.split(":")[0].trim().split("=")[0].trim())
        .filter((p) => p && p !== "self");

    case "javascript":
      return paramList.map((p) => p.split("=")[0].trim()).filter((p) => p);

    case "typescript":
      return paramList
        .map((p) => p.split(":")[0].trim().split("=")[0].trim())
        .filter((p) => p);

    case "java":
    case "cpp":
    case "c":
    case "go":
    default:
      return paramList;
  }
}

// Comprehensive exclusion lists
function isExcludedMethod(name: string, language: string): boolean {
  const excludedByLanguage = {
    java: [
      "main",
      "toString",
      "equals",
      "hashCode",
      "compareTo",
      "clone",
      "class",
      "public",
      "private",
      "protected",
      "static",
      "void",
      "int",
      "String",
      "Object",
    ],
    python: [
      "main",
      "__init__",
      "__str__",
      "__repr__",
      "__eq__",
      "__hash__",
      "__len__",
      "__main__",
      "if",
      "for",
      "while",
      "def",
      "class",
      "import",
      "from",
    ],
    cpp: [
      "main",
      "operator",
      "if",
      "for",
      "while",
      "class",
      "struct",
      "template",
      "namespace",
      "using",
      "include",
      "std",
    ],
    c: [
      "main",
      "printf",
      "scanf",
      "malloc",
      "free",
      "if",
      "for",
      "while",
      "struct",
      "union",
      "typedef",
      "include",
    ],
    go: [
      "main",
      "init",
      "if",
      "for",
      "switch",
      "func",
      "var",
      "const",
      "type",
      "package",
      "import",
      "fmt",
    ],
    javascript: [
      "main",
      "console",
      "if",
      "for",
      "while",
      "require",
      "module",
      "exports",
      "function",
      "var",
      "let",
      "const",
      "import",
      "export",
    ],
    typescript: [
      "main",
      "console",
      "if",
      "for",
      "while",
      "require",
      "module",
      "exports",
      "import",
      "export",
      "function",
      "var",
      "let",
      "const",
      "type",
      "interface",
      "class",
    ],
  };

  const excluded =
    excludedByLanguage[language as keyof typeof excludedByLanguage] || [];
  const nameLower = name.toLowerCase();

  return (
    excluded.includes(nameLower) ||
    (name.startsWith("__") && name.endsWith("__")) ||
    name.startsWith("~") ||
    name.includes("operator") ||
    name.length < 2
  );
}

// Enhanced data structure and algorithm pattern detection
function detectDataStructuresAndPattern(
  code: string,
  analysis: CodeAnalysis,
): void {
  const combined = code.toLowerCase();

  // Enhanced data structure detection with more patterns
  const dataStructurePatterns = [
    {
      keywords: [
        "listnode",
        "linkedlist",
        "singly",
        "list<int>",
        "node*",
        "->next",
        ".next",
      ],
      type: "ListNode",
    },
    {
      keywords: [
        "treenode",
        "binarytree",
        "tree",
        "node*",
        "->left",
        "->right",
        ".left",
        ".right",
      ],
      type: "TreeNode",
    },
    {
      keywords: ["graphnode", "graph", "adjacency", "neighbor", "edge"],
      type: "GraphNode",
    },
    {
      keywords: [
        "matrix",
        "grid",
        "int[][]",
        "vector<vector",
        "list[list",
        "array<array",
      ],
      type: "Matrix",
    },
  ];

  dataStructurePatterns.forEach(({ keywords, type }) => {
    if (keywords.some((keyword) => combined.includes(keyword))) {
      analysis.dataStructures.add(type);
    }
  });

  // Enhanced algorithm pattern detection
  const patternMap = [
    {
      keywords: ["twosum", "two_sum", "pair_sum", "target_sum"],
      pattern: "two_sum",
    },
    {
      keywords: ["search", "binary", "sorted", "find", "locate"],
      pattern: "binary_search",
    },
    {
      keywords: ["reverse", "merge", "cycle", "listnode", "linked"],
      pattern: "linked_list",
    },
    {
      keywords: [
        "traversal",
        "inorder",
        "preorder",
        "postorder",
        "treenode",
        "binary_tree",
      ],
      pattern: "binary_tree",
    },
    {
      keywords: [
        "dp",
        "dynamic",
        "fib",
        "climb",
        "memo",
        "cache",
        "optimization",
      ],
      pattern: "dynamic_programming",
    },
    {
      keywords: ["rotate", "spiral", "island", "matrix", "grid", "flood"],
      pattern: "matrix",
    },
    {
      keywords: ["valid", "palindrome", "anagram", "string", "char", "text"],
      pattern: "string_processing",
    },
    {
      keywords: ["permut", "combin", "subset", "backtrack", "generate"],
      pattern: "backtracking",
    },
    {
      keywords: ["window", "substring", "subarray", "sliding", "consecutive"],
      pattern: "sliding_window",
    },
    {
      keywords: ["stack", "queue", "parenthes", "bracket", "deque"],
      pattern: "stack_queue",
    },
    {
      keywords: ["sort", "merge", "quick", "heap", "bubble"],
      pattern: "sorting",
    },
    {
      keywords: ["bfs", "dfs", "breadth", "depth", "level"],
      pattern: "graph_traversal",
    },
  ];

  // Function name based detection
  const funcName = analysis.functionName.toLowerCase();
  for (const { keywords, pattern } of patternMap) {
    if (
      keywords.some(
        (keyword) => funcName.includes(keyword) || combined.includes(keyword),
      )
    ) {
      analysis.algorithmPattern = pattern;
      break;
    }
  }

  // Return type based detection for more accuracy
  const returnType = analysis.returnType.toLowerCase();
  if (returnType.includes("listnode")) {
    analysis.dataStructures.add("ListNode");
    analysis.algorithmPattern = "linked_list";
  } else if (returnType.includes("treenode")) {
    analysis.dataStructures.add("TreeNode");
    analysis.algorithmPattern = "binary_tree";
  } else if (
    returnType.includes("vector<vector") ||
    returnType.includes("int[][]")
  ) {
    analysis.dataStructures.add("Matrix");
    analysis.algorithmPattern = "matrix";
  }

  // Parameter based detection
  analysis.parameters.forEach((param) => {
    const paramLower = param.toLowerCase();
    if (paramLower.includes("listnode")) {
      analysis.dataStructures.add("ListNode");
    } else if (paramLower.includes("treenode")) {
      analysis.dataStructures.add("TreeNode");
    } else if (paramLower.includes("matrix") || paramLower.includes("grid")) {
      analysis.dataStructures.add("Matrix");
    }
  });
}

// Generate wrapper code using enhanced AI prompt
async function generateWrapperCode(
  userCode: string,
  language: string,
  testCase: any,
  analysis: CodeAnalysis,
  gemini: any,
): Promise<string> {
  console.log(
    `Generating wrapper code for ${language} with pattern: ${analysis.algorithmPattern}`,
  );

  const prompt = LEETCODE_WRAPPER_PROMPT.replace(
    /{function_name}/g,
    analysis.functionName,
  )
    .replace(/{function_params}/g, analysis.parameters.join(", "))
    .replace(/{return_type}/g, analysis.returnType)
    .replace(/{language}/g, language.toLowerCase())
    .replace(/{algorithm_pattern}/g, analysis.algorithmPattern)
    .replace(
      /{data_structures}/g,
      Array.from(analysis.dataStructures).join(", "),
    )
    .replace(/{test_input}/g, JSON.stringify(testCase.input))
    .replace(/{expected_output}/g, JSON.stringify(testCase.output))
    .replace(/{user_code}/g, userCode);

  const response = await generateText({
    model: gemini("gemini-2.0-flash"),
    prompt,
    temperature: 0.05, // Lower temperature for more consistent output
    maxTokens: 5000,
  });

  let extractedCode = extractCode(response.text, language);

  // Language-specific post-processing
  if (language.toLowerCase() === "java") {
    // Ensure Main class name for Judge0
    extractedCode = extractedCode.replace(
      /public\s+class\s+\w+/g,
      "public class Main",
    );
  }

  return extractedCode;
}

// Enhanced code extraction with multiple fallback patterns
function extractCode(aiResponse: string, language: string): string {
  const langVariants = {
    cpp: ["cpp", "c++", "cxx"],
    javascript: ["javascript", "js"],
    typescript: ["typescript", "ts"],
    python: ["python", "py"],
  };

  const variants = langVariants[language as keyof typeof langVariants] || [
    language,
  ];

  // Try each language variant
  for (const variant of variants) {
    const pattern = new RegExp(`\`\`\`${variant}\\s*([\\s\\S]*?)\`\`\``, "i");
    const match = pattern.exec(aiResponse);
    if (match && match[1]?.trim().length > 50) {
      return match[1].trim();
    }
  }

  // Generic code block fallback
  const genericMatch = /```\s*([\s\S]*?)```/.exec(aiResponse);
  if (genericMatch && genericMatch[1]?.trim().length > 50) {
    return genericMatch[1].trim();
  }

  // Last resort: clean response
  return aiResponse
    .replace(/```[\s\S]*?```/g, "")
    .replace(/```/g, "")
    .trim();
}

// Execute code on Judge0 with retry logic
async function executeCode(
  { code, language }: { code: string; language: string },
  retries = 2,
) {
  const langId = LANGUAGE_MAP[language.toLowerCase()];
  if (!langId) throw new Error("Unsupported language");

  console.log(`Executing ${language} code on Judge0...`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      try {
        const response = await executeOnJudge0({
          code,
          languageId: langId,
          stdin: "",
        });
        return response;
      } catch (e: any) {
        if (
          attempt < retries &&
          (e?.message?.includes("429") || e?.message?.includes("5"))
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, (attempt + 1) * 1000),
          );
          continue;
        }
        throw e;
      }
    } catch (error) {
      console.error(`Judge0 execution failed (attempt ${attempt + 1}):`, error);

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, (attempt + 1) * 1000),
        );
        continue;
      }

      throw error;
    }
  }
}

// Enhanced output comparison with robust format handling
function compareOutputs(actual: string, expected: any): boolean {
  try {
    const actualTrim = actual.trim();

    // Handle boolean outputs
    if (typeof expected === "boolean") {
      const actualLower = actualTrim.toLowerCase();
      return (
        actualLower === expected.toString() ||
        actualLower === (expected ? "1" : "0") ||
        actualLower === (expected ? "true" : "false")
      );
    }

    // Handle numeric outputs
    if (typeof expected === "number") {
      const actualNum = parseFloat(actualTrim);
      return !isNaN(actualNum) && Math.abs(actualNum - expected) < 1e-9;
    }

    // Handle string outputs
    if (typeof expected === "string") {
      return (
        actualTrim === expected.trim() ||
        actualTrim === `"${expected}"` ||
        actualTrim.replace(/"/g, "") === expected
      );
    }

    // Handle array outputs
    if (Array.isArray(expected)) {
      const expectedStr = JSON.stringify(expected);

      // Direct JSON match
      if (actualTrim === expectedStr) return true;

      // Try parsing as JSON
      try {
        const actualParsed = JSON.parse(actualTrim);
        return JSON.stringify(actualParsed) === expectedStr;
      } catch {
        // Handle array-like output without proper JSON format
        const normalizedActual = actualTrim
          .replace(/\s+/g, "")
          .replace(/'/g, '"')
          .replace(/([a-zA-Z_]\w*)/g, '"$1"'); // Quote unquoted strings

        const normalizedExpected = expectedStr.replace(/\s+/g, "");

        if (normalizedActual === normalizedExpected) return true;

        // Handle bracket-less arrays: 1,2,3 instead of [1,2,3]
        if (!actualTrim.startsWith("[") && actualTrim.includes(",")) {
          try {
            const elements = actualTrim.split(",").map((e) => {
              const trimmed = e.trim();
              const num = parseFloat(trimmed);
              return isNaN(num) ? trimmed.replace(/"/g, "") : num;
            });
            return JSON.stringify(elements) === expectedStr;
          } catch {
            return false;
          }
        }
      }
    }

    // Handle object outputs
    if (typeof expected === "object" && expected !== null) {
      try {
        const actualParsed = JSON.parse(actualTrim);
        return JSON.stringify(actualParsed) === JSON.stringify(expected);
      } catch {
        return false;
      }
    }

    // Fallback string comparison
    return actualTrim === String(expected).trim();
  } catch (error) {
    console.error("Output comparison error:", error);
    return false;
  }
}

// Format error messages for better user understanding
function formatError(error: string, language: string): string {
  const errorPatterns = [
    {
      pattern: /compilation terminated|compilation failed/i,
      message: "Code compilation failed. Check syntax and imports.",
    },
    {
      pattern: /cannot find symbol|undefined reference/i,
      message: "Variable or method not found. Check declarations and spelling.",
    },
    {
      pattern: /segmentation fault|access violation/i,
      message: "Memory access error. Check for null pointers and array bounds.",
    },
    {
      pattern: /index out of bounds|array index/i,
      message: "Array index error. Check array boundaries.",
    },
    {
      pattern: /null pointer|nullpointerexception/i,
      message: "Null reference error. Check for null values.",
    },
    {
      pattern: /syntax error|unexpected token/i,
      message: "Syntax error. Review code structure.",
    },
    {
      pattern: /time limit exceeded/i,
      message:
        "Code took too long. Check for infinite loops or optimize algorithm.",
    },
    {
      pattern: /stack overflow/i,
      message:
        "Stack overflow. Check recursion depth or use iterative approach.",
    },
    {
      pattern: /runtime error/i,
      message: "Runtime error during execution. Check logic and edge cases.",
    },
  ];

  for (const { pattern, message } of errorPatterns) {
    if (pattern.test(error)) {
      return `${message}\n\nDetails: ${error.substring(0, 300)}`;
    }
  }

  return error.length > 400 ? error.substring(0, 400) + "..." : error;
}

// Main API handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const credit = await requireCredits(req, 3, "ai_execute");
    if (!credit.allowed) {
      return NextResponse.json(credit.body, { status: credit.status });
    }
    console.log("Starting enhanced code execution request...");

    const { code, language = "java", testCase } = await req.json();
    const gemini = createGeminiClient();

    // Enhanced validation
    if (!LANGUAGE_MAP[language.toLowerCase()]) {
      return NextResponse.json(
        {
          error: `Unsupported language: ${language}`,
          supported: Object.keys(LANGUAGE_MAP),
          message: `Language '${language}' is not supported. Use one of: ${Object.keys(LANGUAGE_MAP).join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (
      !code?.trim() ||
      !testCase ||
      !Array.isArray(testCase.input) ||
      testCase.output === undefined
    ) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details:
            "Required: code (string), testCase.input (array), testCase.output (any)",
          example: {
            code: "function twoSum(nums, target) { return [0, 1]; }",
            language: "javascript",
            testCase: { input: [[2, 7, 11, 15], 9], output: [0, 1] },
          },
        },
        { status: 400 },
      );
    }

    console.log(`Processing ${language} code execution:`, {
      codeLength: code.length,
      inputParams: testCase.input.length,
      expectedOutput: testCase.output,
    });

    // Analyze user code
    const analysis = analyzeCode(code, language);

    if (!analysis.functionName) {
      const languageHints = {
        java: "Use: public ReturnType methodName(params) { }",
        python: "Use: def function_name(params):",
        cpp: "Use: returnType functionName(params) { }",
        c: "Use: returnType functionName(params) { }",
        go: "Use: func functionName(params) returnType { }",
        javascript:
          "Use: function functionName(params) { } or const func = (params) => { }",
        typescript: "Use: function functionName(params): returnType { }",
      };

      return NextResponse.json(
        {
          error: "NO_FUNCTION_FOUND",
          message: `No testable function detected in ${language} code`,
          hint:
            languageHints[
              language.toLowerCase() as keyof typeof languageHints
            ] || "Check function syntax",
          codePreview:
            code.substring(0, 200) + (code.length > 200 ? "..." : ""),
        },
        { status: 400 },
      );
    }

    console.log(`Function Analysis:`, {
      name: analysis.functionName,
      language: analysis.language,
      paramCount: analysis.parameters.length,
      returnType: analysis.returnType,
      pattern: analysis.algorithmPattern,
      dataStructures: Array.from(analysis.dataStructures),
      isStatic: analysis.isStatic,
      isAsync: analysis.isAsync,
    });

    // Generate executable wrapper code
    const executableCode = await generateWrapperCode(
      code,
      language,
      testCase,
      analysis,
      gemini,
    );
    console.log(`Generated wrapper code (${executableCode.length} chars)`);

    // Execute on Judge0
    const result = await executeCode({ code: executableCode, language });
    console.log(`Judge0 execution result:`, {
      status: result.status?.description,
      statusId: result.status?.id,
      time: result.time,
      memory: result.memory,
      hasOutput: !!result.stdout,
      hasError: !!(result.stderr || result.compile_output),
    });

    // Process execution results
    let actualOutput = "";
    let error = null;
    let executionStatus = "completed";

    if (result.compile_output?.trim()) {
      error = formatError(
        `Compilation Error: ${result.compile_output}`,
        language,
      );
      executionStatus = "compilation_error";
    } else if (result.stderr?.trim()) {
      error = formatError(`Runtime Error: ${result.stderr}`, language);
      executionStatus = "runtime_error";
    } else if (result.stdout?.trim()) {
      actualOutput = result.stdout.trim();
      executionStatus = "success";
    } else {
      error = "No output produced by the function";
      executionStatus = "no_output";
    }

    // Compare outputs
    const passed = !error && compareOutputs(actualOutput, testCase.output);
    const processingTime = Date.now() - startTime;

    console.log(`Execution completed:`, {
      passed,
      actualOutput: actualOutput?.substring(0, 150),
      expectedOutput: JSON.stringify(testCase.output).substring(0, 150),
      executionStatus,
      processingTime: `${processingTime}ms`,
    });

    // Comprehensive response
    return NextResponse.json({
      // Core results
      passed,
      actualOutput,
      expectedOutput: testCase.output,
      error,

      // Execution details
      language,
      executionStatus,
      executionTime: result.time || 0,
      memoryUsage: result.memory || 0,

      // Code analysis
      functionTested: analysis.functionName,
      functionParameters: analysis.parameters,
      returnType: analysis.returnType,
      algorithmPattern: analysis.algorithmPattern,
      dataStructuresUsed: Array.from(analysis.dataStructures),
      isStaticMethod: analysis.isStatic,
      isAsyncMethod: analysis.isAsync,

      // Performance metrics
      performanceMetrics: {
        processingTime,
        executionTime: result.time || 0,
        memoryUsage: result.memory || 0,
        codeSize: code.length,
        wrapperSize: executableCode.length,
      },

      // Full generated code for debugging
      fullCode: executableCode,

      // Judge0 details
      judge0Status: result.status?.description,
      judge0StatusId: result.status?.id,

      // Metadata
      timestamp: new Date().toISOString(),
      version: "3.0.0",
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("System error occurred:", error);

    return NextResponse.json(
      {
        error: `System Error: ${error.message}`,
        details: error.stack?.substring(0, 500),
        processingTime,
        timestamp: new Date().toISOString(),
        retryable:
          error.message.includes("429") || error.message.includes("50"),
      },
      { status: 500 },
    );
  }
}
