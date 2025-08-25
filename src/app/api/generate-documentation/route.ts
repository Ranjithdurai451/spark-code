import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import {
  extractJavaFunction,
  extractJavaScriptFunction,
  extractTypeScriptFunction,
  extractPythonFunction,
  extractCppFunction,
  extractCFunction,
  extractGoFunction,
  extractCSharpFunction,
} from "@/lib/extractor";
import { getApiKeys } from "@/lib/getApiKeys";

// Improved documentation generation prompt
const CODE_DOCUMENTATION_PROMPT = `
You are an expert code documentation generator. Add professional, concise documentation to the provided code.

**CRITICAL REQUIREMENTS:**
- Return ONLY the original code with added comments
- DO NOT use markdown formatting, code blocks, or explanations
- Focus on WHY and HOW, not WHAT the code does
- Avoid obvious line-by-line explanations
- Use meaningful, concise comments
- DO NOT add any text before or after the code

**CODE TO DOCUMENT:**
{user_code}

**LANGUAGE:** {language}
**FUNCTION:** {function_signature}
**ALGORITHM:** {algorithm_pattern}

**DOCUMENTATION STYLE:**
1. **Method-level documentation:**
   - Purpose and algorithm approach
   - Time Complexity: O(?)
   - Space Complexity: O(?)
   - @param and @return if applicable

2. **Strategic inline comments:**
   - Complex logic or algorithm steps
   - Non-obvious business logic
   - Important edge cases
   - Key algorithmic phases
   - Do NOT comment obvious operations like assignments or loops

**GOOD EXAMPLE:**
/**
 * Removes duplicates from sorted doubly linked list using two-pointer technique
 * Time Complexity: O(n) - single pass through list
 * Space Complexity: O(1) - only uses pointers
 */
public void removeDuplicates(DoublyListNode head) {
    if (head == null) return;
    
    DoublyListNode current = head;
    DoublyListNode temp = head.next;
    
    // Skip duplicates and maintain links between unique nodes
    while (temp != null) {
        if (current.data != temp.data) {
            current.next = temp;
            temp.prev = current;
            current = current.next;
        }
        temp = temp.next;
    }
    
    // Terminate list after last unique element
    current.next = null;
}

**AVOID:**
- "Initialize variable to..." 
- "Move pointer to next node"
- "Check if condition is true"
- Explaining simple assignments or obvious operations

Return ONLY the documented source code with no additional formatting or text.
`;

// Function extraction interface
interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType: string;
  signature: string;
  isValid: boolean;
  language: string;
  algorithmPattern: string;
}

function extractFunctionInfo(code: string, language: string): FunctionInfo {
  const extractors = {
    java: extractJavaFunction,
    javascript: extractJavaScriptFunction,
    typescript: extractTypeScriptFunction,
    python: extractPythonFunction,
    cpp: extractCppFunction,
    c: extractCFunction,
    go: extractGoFunction,
    csharp: extractCSharpFunction,
  };

  const extractor =
    extractors[language.toLowerCase() as keyof typeof extractors];
  return extractor ? extractor(code) : createEmptyFunctionInfo(language);
}

function detectLanguage(code: string): string {
  const patterns = [
    { regex: /package\s+main|func\s+\w+.*\{|fmt\./, lang: "go" },
    { regex: /public\s+class|import\s+java\.|System\.out/, lang: "java" },
    { regex: /#include.*<.*>.*std::|vector<|cout\s*<</, lang: "cpp" },
    { regex: /#include.*<.*>.*printf|malloc\s*\(/, lang: "c" },
    { regex: /def\s+\w+.*:|import\s+\w+|:\s*$/m, lang: "python" },
    {
      regex: /using\s+System|Console\.WriteLine|public\s+class/,
      lang: "csharp",
    },
    {
      regex: /:\s*(string|number|boolean|\w+\[\])\s*[=\)\{]|interface\s+\w+/,
      lang: "typescript",
    },
    {
      regex: /function\s+\w+|const\s+\w+\s*=.*=>|console\.log/,
      lang: "javascript",
    },
  ];

  for (const { regex, lang } of patterns) {
    if (regex.test(code)) return lang;
  }

  return "javascript";
}

function detectAlgorithmPattern(
  functionName: string,
  parameters: string[],
  code: string
): string {
  const name = functionName.toLowerCase();
  const codeStr = code.toLowerCase();

  const patterns = [
    { keywords: ["twosum", "two_sum"], pattern: "two_pointer_technique" },
    { keywords: ["threesum", "three_sum"], pattern: "three_pointer_technique" },
    {
      keywords: ["binary_search", "binarysearch", "search"],
      pattern: "binary_search",
    },
    {
      keywords: ["reverse", "reverselist", "reverse_list"],
      pattern: "linked_list_reversal",
    },
    {
      keywords: ["merge", "mergelist", "merge_list"],
      pattern: "merge_technique",
    },
    {
      keywords: ["valid", "isvalid", "check"],
      pattern: "validation_algorithm",
    },
    { keywords: ["palindrome", "ispalindrome"], pattern: "palindrome_check" },
    { keywords: ["anagram", "isanagram"], pattern: "string_manipulation" },
    { keywords: ["subarray", "maxsubarray"], pattern: "kadane_algorithm" },
    { keywords: ["substring", "longestsubstring"], pattern: "sliding_window" },
    { keywords: ["permutation", "permute"], pattern: "backtracking" },
    { keywords: ["combination", "combine"], pattern: "backtracking" },
    { keywords: ["subset", "subsets"], pattern: "bit_manipulation" },
    { keywords: ["climb", "stairs"], pattern: "dynamic_programming" },
    { keywords: ["coin", "change"], pattern: "dynamic_programming" },
    { keywords: ["fibonacci", "fib"], pattern: "dynamic_programming" },
    { keywords: ["island", "islands"], pattern: "graph_traversal" },
    { keywords: ["rotate", "rotation"], pattern: "array_manipulation" },
    { keywords: ["depth", "height"], pattern: "tree_traversal" },
    {
      keywords: ["inorder", "preorder", "postorder"],
      pattern: "tree_traversal",
    },
  ];

  for (const { keywords, pattern } of patterns) {
    if (keywords.some((keyword) => name.includes(keyword))) {
      return pattern;
    }
  }

  // Check code patterns
  if (
    codeStr.includes("left") &&
    codeStr.includes("right") &&
    codeStr.includes("mid")
  )
    return "binary_search";
  if (
    codeStr.includes("next") &&
    (codeStr.includes("prev") || codeStr.includes("head"))
  )
    return "linked_list_operations";
  if (codeStr.includes("dp") || codeStr.includes("memo"))
    return "dynamic_programming";
  if (
    codeStr.includes("visited") &&
    (codeStr.includes("dfs") || codeStr.includes("bfs"))
  )
    return "graph_traversal";

  return "general_algorithm";
}

function createEmptyFunctionInfo(language: string): FunctionInfo {
  return {
    name: "",
    parameters: [],
    returnType: "",
    signature: "",
    isValid: false,
    language,
    algorithmPattern: "unknown",
  };
}

// Main documentation generation endpoint
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const {
      messages,
      code,
      language,
      geminiApiKey: clientGeminiApiKey,
    } = await req.json();
    const keyInfo = await getApiKeys(req);
    const geminiKey =
      keyInfo.mode === "local" ? clientGeminiApiKey : keyInfo.geminiKey;

    // Check if key available
    if (!geminiKey) {
      return Response.json(
        {
          error: "NO_API_KEY",
          message: keyInfo.error || "Gemini API key required",
          mode: keyInfo.mode,
        },
        { status: 401 }
      );
    }
    const gemini = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });

    // Extract code from request
    let codeToDocument = code;
    let detectedLanguage = language;

    if (!codeToDocument && Array.isArray(messages) && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      // Try to extract code block (```lang\ncode```) or long inline code (`code`)
      const codeBlockMatch =
        userMessage.content.match(/```(\w+)?\n([\s\S]*?)```/) ||
        userMessage.content.match(/`([^`]{20,})`/);

      if (codeBlockMatch) {
        // codeBlockMatch[1] is language, codeBlockMatch[2] is code (for code block)
        // codeBlockMatch[1] is code (for inline)
        if (codeBlockMatch[2]) {
          detectedLanguage =
            codeBlockMatch[1] || detectLanguage(codeBlockMatch[2]);
          codeToDocument = codeBlockMatch[2].trim();
        } else if (codeBlockMatch[1]) {
          detectedLanguage = detectLanguage(codeBlockMatch[1]);
          codeToDocument = codeBlockMatch[1].trim();
        }
      }
    }

    // Validation
    if (!codeToDocument || codeToDocument.length < 20) {
      return new Response(
        JSON.stringify({
          error: "INSUFFICIENT_CODE",
          message:
            "Please provide a substantial code snippet (at least 20 characters)",
          suggestion: "Include a complete function or method implementation",
          retryable: true,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!detectedLanguage) {
      detectedLanguage = detectLanguage(codeToDocument);
    }

    // Extract function information
    const functionInfo = extractFunctionInfo(codeToDocument, detectedLanguage);

    console.log(`📝 Documentation Request:`, {
      function: functionInfo.name || "anonymous",
      language: detectedLanguage,
      pattern: functionInfo.algorithmPattern,
      codeLength: codeToDocument.length,
      processingTime: Date.now() - startTime,
    });

    // Build documentation prompt
    const documentationPrompt = CODE_DOCUMENTATION_PROMPT.replace(
      /\{user_code\}/g,
      codeToDocument
    )
      .replace(/\{language\}/g, detectedLanguage)
      .replace(
        /\{function_signature\}/g,
        functionInfo.signature || "Not detected"
      )
      .replace(/\{algorithm_pattern\}/g, functionInfo.algorithmPattern);

    // Generate the documented code (NO STREAMING)
    const result = await generateText({
      model: gemini("gemini-2.0-flash"),
      prompt: documentationPrompt,
      temperature: 0.1,
      maxTokens: 4000,
    });

    // Clean up the result - generateText returns string directly or { text: string }
    let rawText: string;
    if (typeof result === "string") {
      rawText = result;
    } else if (result && typeof result === "object" && "text" in result) {
      rawText = (result as any).text;
    } else {
      rawText = String(result);
    }

    // Remove any markdown code blocks or stray backticks
    let cleanedCode = rawText
      .replace(/```[\w]*\n?/g, "") // Remove code block markers
      .replace(/```/g, "") // Remove any remaining ```
      .replace(/^\s*[\r\n]/g, "") // Remove leading blank lines
      .trim();

    // If there are still code blocks, extract the content inside the last code block
    if (/```/.test(cleanedCode)) {
      const match = cleanedCode.match(/```[\w]*\n?([\s\S]*?)```/);
      if (match && match[1]) {
        cleanedCode = match[1].trim();
      }
    }

    console.log("Generated documentation length:", cleanedCode.length);

    // Return plain text response
    return new Response(cleanedCode, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "X-Function-Name": functionInfo.name || "anonymous",
        "X-Function-Language": detectedLanguage,
        "X-Algorithm-Pattern": functionInfo.algorithmPattern,
        "X-Processing-Time": (Date.now() - startTime).toString(),
      },
    });
  } catch (error: any) {
    console.error("💥 Documentation Error:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      processingTime: Date.now() - startTime,
    });

    return new Response("Failed to generate documentation for the code", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
