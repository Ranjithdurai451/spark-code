import { NextRequest } from "next/server";
import { createStreamingGeminiModel } from "@/lib/services/model";
import { requireCredits } from "@/lib/credits/index";
import { streamText } from "ai";
import { extractFunctionInfo } from "@/lib/extractor";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";
// BYOK removed: gemini client is created from env

// Enhanced analysis prompt with better structure
const CODE_ANALYSIS_PROMPT = `
🚨 **CRITICAL INSTRUCTIONS:**
- You are an expert software engineer and code reviewer
- Analyze the provided code based on its ACTUAL implementation, NOT comments
- Focus on what the code DOES, not what comments say it should do
- Provide actionable, specific feedback
- Be constructive and educational

**CODE TO ANALYZE:**
\`\`\`{language}
{user_code}
\`\`\`

**DETECTED FUNCTION:** {function_signature}
**ALGORITHM PATTERN:** {algorithm_pattern}
**CODE QUALITY SCORE:** {quality_score}/10

## 🎯 **What This Code Does**
[Analyze the actual functionality based on implementation, ignore comments]

## 📊 **Algorithm Analysis**
- **Pattern:** {algorithm_pattern}
- **Approach:** [Describe the actual algorithmic approach used]
- **Time Complexity:** O(?) - [Analyze the actual loops/operations]
- **Space Complexity:** O(?) - [Analyze memory usage and auxiliary data structures]

## 🏆 **Code Quality Assessment: {quality_score}/10**

### ✅ **Strengths**
- [List 2-3 specific things done well in the implementation]
- [Focus on actual code structure, logic, efficiency]

### ⚠️ **Issues & Improvements**
- **Logic Issues:** [Any algorithmic problems in the actual implementation]
- **Edge Cases:** [Missing boundary condition handling]
- **Performance:** [Inefficiencies in the current implementation]
- **Code Style:** [Naming, formatting, structure issues]

## 🚀 **Optimization Suggestions**

### **Primary Optimization:**
\`\`\`{language}
// Show an improved version addressing the main issue
{optimization_example}
\`\`\`
**Improvement:** [Specific benefit - performance, readability, correctness]

### **Alternative Approaches:**
- **Method 1:** [Different algorithm] - Complexity: O(?), Benefits: [when to use]
- **Method 2:** [Another approach] - Complexity: O(?), Benefits: [when to use]

## 🛡️ **Robustness Check**
- **Input Validation:** [What validation is missing]
- **Boundary Conditions:** [Edge cases not handled]
- **Error Handling:** [Exception scenarios not covered]

## 💡 **Key Insights**
- **Main Learning:** [The key algorithmic concept demonstrated]
- **Best Practice:** [What developers should take away]
- **Real-world Usage:** [Where this pattern is commonly applied]

## 🎯 **Action Items** (Priority Order)
1. **Fix:** [Most critical issue to address]
2. **Improve:** [Performance/readability enhancement]
3. **Add:** [Missing feature or validation]

---
**Overall Assessment:** This is a **{quality_level}** implementation that {overall_summary}.
`;

// Improved function signature extraction
interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType: string;
  signature: string;
  isValid: boolean;
  language: string;
  algorithmPattern: string;
}

// Enhanced function extraction with better pattern detection

// Enhanced language detection
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

// Enhanced code quality assessment
function assessCodeQuality(code: string): { score: number; level: string } {
  let score = 5; // Base score

  // Complexity analysis
  const complexity = (code.match(/\b(if|while|for|switch|try|catch)\b/g) || [])
    .length;
  if (complexity > 10) score -= 2;
  else if (complexity > 5) score -= 1;
  else if (complexity >= 2) score += 1;

  // Function length (sweet spot is 10-50 lines)
  const lines = code.split("\n").length;
  if (lines >= 10 && lines <= 50) score += 1;
  else if (lines > 100) score -= 2;

  // Variable naming
  const goodNames = code.match(/\b[a-z][a-zA-Z]{2,}\b/g)?.length || 0;
  const badNames = code.match(/\b[a-z]\b|\b\w*\d+\w*\b/g)?.length || 0;
  if (goodNames > badNames) score += 1;

  // Comments and documentation
  if (/\/\*[\s\S]*\*\/|\/\/.*|#.*|"""[\s\S]*"""/m.test(code)) score += 1;

  // Error handling
  if (/try|catch|except|throw|raise/i.test(code)) score += 1;

  // Return statement presence
  if (/return\s+\w+/.test(code)) score += 1;

  score = Math.max(1, Math.min(10, score));

  const level =
    score >= 8 ? "advanced" : score >= 6 ? "intermediate" : "novice";
  return { score, level };
}

// Main API handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest("POST", req.url);

    const credit = await requireCredits(req, 1, "analyze");
    if (!credit.allowed) {
      logger.apiResponse(
        "POST",
        req.url,
        credit.status || 402,
        Date.now() - startTime,
        {
          error: "insufficient_credits",
        },
      );
      return new Response(JSON.stringify(credit.body), {
        status: credit.status || 402,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { messages, code, language } = await req.json();
    const gemini = await createStreamingGeminiModel();

    // Extract code from request
    let codeToAnalyze = code;
    let detectedLanguage = language;

    if (!codeToAnalyze && Array.isArray(messages) && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      const codeMatch =
        userMessage.content.match(/```(\w+)?\n?([\s\S]*?)```/) ||
        userMessage.content.match(/`([^`]{20,})`/);

      if (codeMatch) {
        detectedLanguage =
          codeMatch[1] || detectLanguage(codeMatch[2] || codeMatch[1]);
        codeToAnalyze = (codeMatch[2] || codeMatch[1]).trim();
      }
    }

    // Validation
    if (!codeToAnalyze || codeToAnalyze.length < 20) {
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "insufficient_code",
      });
      throw APIError.create(
        ErrorCode.INVALID_REQUEST,
        {
          suggestion: "Include a complete function or method implementation",
        },
        "Please provide a substantial code snippet (at least 20 characters)",
      );
    }

    if (!detectedLanguage) {
      detectedLanguage = detectLanguage(codeToAnalyze);
    }

    // Extract function information
    const functionInfo = extractFunctionInfo(codeToAnalyze, detectedLanguage);

    if (!functionInfo.isValid) {
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "no_valid_function",
        language: detectedLanguage,
      });
      throw APIError.create(
        ErrorCode.INVALID_REQUEST,
        {
          detectedLanguage,
          supportedLanguages: [
            "java",
            "javascript",
            "typescript",
            "python",
            "cpp",
            "c",
            "go",
            "csharp",
          ],
          suggestion:
            "Please provide code with at least one complete function implementation",
        },
        `No complete function found in the ${detectedLanguage} code`,
      );
    }

    // Assess code quality
    const quality = assessCodeQuality(codeToAnalyze);

    // Generate optimization example (basic template)
    const optimizationExample = generateOptimizationExample(functionInfo);

    // Build analysis prompt
    const analysisPrompt = CODE_ANALYSIS_PROMPT.replace(
      /\{user_code\}/g,
      codeToAnalyze,
    )
      .replace(/\{language\}/g, detectedLanguage)
      .replace(/\{function_signature\}/g, functionInfo.signature)
      .replace(/\{algorithm_pattern\}/g, functionInfo.algorithmPattern)
      .replace(/\{quality_score\}/g, quality.score.toString())
      .replace(/\{quality_level\}/g, quality.level)
      .replace(/\{optimization_example\}/g, optimizationExample)
      .replace(
        /\{overall_summary\}/g,
        `demonstrates ${functionInfo.algorithmPattern} with ${quality.level} implementation quality`,
      );

    // Stream the analysis
    const result = streamText({
      model: gemini,
      prompt: analysisPrompt,
      temperature: 0.1,
      maxTokens: 3000,
    });

    const response = result.toDataStreamResponse();

    // Add metadata headers
    response.headers.set("X-Function-Name", functionInfo.name);
    response.headers.set("X-Function-Language", detectedLanguage);
    response.headers.set("X-Algorithm-Pattern", functionInfo.algorithmPattern);
    response.headers.set("X-Quality-Score", quality.score.toString());
    response.headers.set("X-Quality-Level", quality.level);
    response.headers.set(
      "X-Processing-Time",
      (Date.now() - startTime).toString(),
    );

    logger.apiResponse("POST", req.url, 200, Date.now() - startTime, {
      function: functionInfo.name,
      language: detectedLanguage,
      pattern: functionInfo.algorithmPattern,
      quality: `${quality.score}/10`,
    });

    return response;
  } catch (error) {
    logger.apiResponse(
      "POST",
      req.url,
      error instanceof APIError ? error.statusCode : 500,
      Date.now() - startTime,
      { error: error instanceof Error ? error.message : "Unknown error" },
    );

    return createErrorResponse(error, {
      processingTime: Date.now() - startTime,
    });
  }
}

// Generate basic optimization example
function generateOptimizationExample(functionInfo: FunctionInfo): string {
  const patterns = {
    linked_list_reversal: `// Optimized with clear variable names and comments
ListNode prev = null;
ListNode current = head;
while (current != null) {
    ListNode nextTemp = current.next;
    current.next = prev;
    prev = current;
    current = nextTemp;
}
return prev;`,

    two_sum: `// Using HashMap for O(n) solution
Map<Integer, Integer> map = new HashMap<>();
for (int i = 0; i < nums.length; i++) {
    int complement = target - nums[i];
    if (map.containsKey(complement)) {
        return new int[] { map.get(complement), i };
    }
    map.put(nums[i], i);
}`,

    binary_search: `// Clear binary search implementation
int left = 0, right = nums.length - 1;
while (left <= right) {
    int mid = left + (right - left) / 2;
    if (nums[mid] == target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
}
return -1;`,
  };

  return (
    patterns[functionInfo.algorithmPattern as keyof typeof patterns] ||
    `// Consider optimizing the main logic here\n// Focus on reducing time/space complexity`
  );
}
