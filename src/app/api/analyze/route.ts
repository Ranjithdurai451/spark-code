import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

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
function extractFunctionInfo(code: string, language: string): FunctionInfo {
  const extractors = {
    java: extractJavaFunction,
    javascript: extractJavaScriptFunction,
    typescript: extractTypeScriptFunction,
    python: extractPythonFunction,
    cpp: extractCppFunction,
    c: extractCFunction,
    go: extractGoFunction,
    csharp: extractCSharpFunction
  };

  const extractor = extractors[language.toLowerCase() as keyof typeof extractors];
  return extractor ? extractor(code) : createEmptyFunctionInfo(language);
}

function extractJavaFunction(code: string): FunctionInfo {
  // Enhanced Java function patterns
  const patterns = [
    // Standard method with modifiers
    /(public|private|protected)?\s*(static)?\s*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/g,
    // Constructor pattern
    /(public|private|protected)?\s+(\w+)\s*\(([^)]*)\)/g
  ];

  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      let returnType, functionName, paramString;
      
      if (match.length === 6) {
        // Standard method
        [, , , returnType, functionName, paramString] = match;
      } else {
        // Constructor
        [, , functionName, paramString] = match;
        returnType = functionName; // Constructor "returns" the class type
      }

      // Skip excluded functions
      const excludedFunctions = [
        'main', 'toString', 'equals', 'hashCode', 'compareTo', 'clone',
        'getClass', 'notify', 'notifyAll', 'wait', 'finalize'
      ];
      
      if (excludedFunctions.includes(functionName.toLowerCase())) {
        continue;
      }

      // Check if it has a body
      const functionStart = match.index! + match[0].length;
      const afterMatch = code.substring(functionStart).trim();
      
      if (afterMatch.startsWith('{') && afterMatch.includes('}')) {
        const parameters = paramString.trim() 
          ? paramString.split(',').map(p => p.trim()) 
          : [];

        return {
          name: functionName,
          parameters,
          returnType: returnType || 'void',
          signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
          isValid: true,
          language: 'java',
          algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
        };
      }
    }
  }

  return createEmptyFunctionInfo('java');
}

function extractJavaScriptFunction(code: string): FunctionInfo {
  const patterns = [
    // Function declarations
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Function expressions
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{/g,
    // Arrow functions
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*[\{]/g,
    // Arrow functions without parentheses
    /(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>\s*[\{]/g
  ];

  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, params] = match;
      
      if (['main', 'console', 'log', 'error', 'require'].includes(functionName.toLowerCase())) {
        continue;
      }

      const parameters = params && params !== functionName 
        ? params.split(',').map(p => p.trim()).filter(p => p) 
        : [];

      return {
        name: functionName,
        parameters,
        returnType: 'any',
        signature: `function ${functionName}(${parameters.join(', ')})`,
        isValid: true,
        language: 'javascript',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('javascript');
}

function extractTypeScriptFunction(code: string): FunctionInfo {
  const patterns = [
    // Function with return type
    /function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Function without return type
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Arrow function with return type
    /(?:const|let)\s+(\w+)\s*=\s*\(([^)]*)\)\s*:\s*([^=]+)\s*=>/g,
    // Arrow function without return type
    /(?:const|let)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g
  ];

  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, params, returnType] = match;
      
      if (['main', 'console', 'log', 'import', 'export'].includes(functionName.toLowerCase())) {
        continue;
      }

      const parameters = params 
        ? params.split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p)
        : [];

      return {
        name: functionName,
        parameters,
        returnType: returnType?.trim() || 'any',
        signature: `function ${functionName}(${parameters.join(', ')}): ${returnType || 'any'}`,
        isValid: true,
        language: 'typescript',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('typescript');
}

function extractPythonFunction(code: string): FunctionInfo {
  const pattern = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, functionName, paramString, returnType] = match;

    if (functionName.startsWith('__') || ['main'].includes(functionName.toLowerCase())) {
      continue;
    }

    // Check for function body
    const functionStart = match.index! + match[0].length;
    const afterColon = code.substring(functionStart);
    const nextLines = afterColon.split('\n').slice(1, 3);
    const hasBody = nextLines.some(line => line.trim() && (line.startsWith('    ') || line.startsWith('\t')));

    if (hasBody) {
      const parameters = paramString.trim()
        ? paramString.split(',')
            .map(p => p.trim().split(':')[0].trim())
            .filter(p => p && p !== 'self')
        : [];

      return {
        name: functionName,
        parameters,
        returnType: returnType?.trim() || 'Any',
        signature: `def ${functionName}(${parameters.join(', ')})${returnType ? ` -> ${returnType}` : ''}`,
        isValid: true,
        language: 'python',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('python');
}

function extractCppFunction(code: string): FunctionInfo {
  const pattern = /(\w+(?:<[^>]+>)?(?:\s*[&*])*)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;

    if (['main', 'if', 'for', 'while'].includes(functionName.toLowerCase()) ||
        functionName.startsWith('~') || functionName.startsWith('operator')) {
      continue;
    }

    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim())
      : [];

    return {
      name: functionName,
      parameters,
      returnType,
      signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
      isValid: true,
      language: 'cpp',
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
    };
  }

  return createEmptyFunctionInfo('cpp');
}

function extractCFunction(code: string): FunctionInfo {
  const pattern = /(\w+(?:\s*[*])*)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;

    if (['main', 'if', 'for', 'while', 'sizeof'].includes(functionName.toLowerCase())) {
      continue;
    }

    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim())
      : [];

    return {
      name: functionName,
      parameters,
      returnType,
      signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
      isValid: true,
      language: 'c',
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
    };
  }

  return createEmptyFunctionInfo('c');
}

function extractGoFunction(code: string): FunctionInfo {
  const pattern = /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, functionName, paramString, returnType] = match;

    if (['main', 'init'].includes(functionName.toLowerCase())) {
      continue;
    }

    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim())
      : [];

    return {
      name: functionName,
      parameters,
      returnType: returnType?.trim() || '',
      signature: `func ${functionName}(${parameters.join(', ')}) ${returnType || ''}`,
      isValid: true,
      language: 'go',
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
    };
  }

  return createEmptyFunctionInfo('go');
}

function extractCSharpFunction(code: string): FunctionInfo {
  const pattern = /(public|private|protected|internal)?\s*(static)?\s*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/g;
  const matches = Array.from(code.matchAll(pattern));

  for (const match of matches) {
    const [, , , returnType, functionName, paramString] = match;

    if (['Main', 'ToString', 'Equals', 'GetHashCode'].includes(functionName)) {
      continue;
    }

    const functionStart = match.index! + match[0].length;
    const afterMatch = code.substring(functionStart).trim();
    
    if (afterMatch.startsWith('{')) {
      const parameters = paramString.trim()
        ? paramString.split(',').map(p => p.trim())
        : [];

      return {
        name: functionName,
        parameters,
        returnType,
        signature: `${returnType} ${functionName}(${parameters.join(', ')})`,
        isValid: true,
        language: 'csharp',
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, code)
      };
    }
  }

  return createEmptyFunctionInfo('csharp');
}

function createEmptyFunctionInfo(language: string): FunctionInfo {
  return {
    name: '',
    parameters: [],
    returnType: '',
    signature: '',
    isValid: false,
    language,
    algorithmPattern: 'unknown'
  };
}

// Enhanced algorithm pattern detection
function detectAlgorithmPattern(functionName: string, parameters: string[], code: string): string {
  const name = functionName.toLowerCase();
  const codeStr = code.toLowerCase();
  const paramStr = parameters.join(' ').toLowerCase();

  // Specific algorithm patterns
  const patterns = [
    { keywords: ['twosum', 'two_sum'], pattern: 'two_sum' },
    { keywords: ['threesum', 'three_sum'], pattern: 'three_sum' },
    { keywords: ['binary_search', 'binarysearch', 'search'], pattern: 'binary_search' },
    { keywords: ['reverse', 'reverselist', 'reverse_list'], pattern: 'linked_list_reversal' },
    { keywords: ['merge', 'mergelist', 'merge_list'], pattern: 'merge_lists' },
    { keywords: ['valid', 'isvalid', 'check'], pattern: 'validation' },
    { keywords: ['palindrome', 'ispalindrome'], pattern: 'palindrome_check' },
    { keywords: ['anagram', 'isanagram'], pattern: 'anagram_check' },
    { keywords: ['subarray', 'maxsubarray'], pattern: 'max_subarray' },
    { keywords: ['substring', 'longestsubstring'], pattern: 'longest_substring' },
    { keywords: ['permutation', 'permute'], pattern: 'permutations' },
    { keywords: ['combination', 'combine'], pattern: 'combinations' },
    { keywords: ['subset', 'subsets'], pattern: 'subsets' },
    { keywords: ['climb', 'stairs'], pattern: 'climbing_stairs' },
    { keywords: ['coin', 'change'], pattern: 'coin_change' },
    { keywords: ['fibonacci', 'fib'], pattern: 'fibonacci' },
    { keywords: ['island', 'islands'], pattern: 'number_of_islands' },
    { keywords: ['rotate', 'rotation'], pattern: 'rotation' },
    { keywords: ['depth', 'height'], pattern: 'tree_depth' },
    { keywords: ['inorder', 'preorder', 'postorder'], pattern: 'tree_traversal' }
  ];

  // Check function name first
  for (const { keywords, pattern } of patterns) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return pattern;
    }
  }

  // Check parameter patterns
  if (paramStr.includes('listnode')) return 'linked_list_operations';
  if (paramStr.includes('treenode')) return 'binary_tree_operations';
  if (paramStr.includes('target') && (paramStr.includes('array') || paramStr.includes('nums'))) return 'array_search';

  // Check code content patterns
  if (codeStr.includes('left') && codeStr.includes('right') && codeStr.includes('mid')) return 'binary_search';
  if (codeStr.includes('next') && (codeStr.includes('prev') || codeStr.includes('head'))) return 'linked_list_operations';
  if (codeStr.includes('left') && codeStr.includes('right') && codeStr.includes('root')) return 'binary_tree_operations';
  if (codeStr.includes('dp') || codeStr.includes('memo')) return 'dynamic_programming';
  if (codeStr.includes('visited') && (codeStr.includes('dfs') || codeStr.includes('bfs'))) return 'graph_traversal';

  return 'general_algorithm';
}

// Enhanced language detection
function detectLanguage(code: string): string {
  const patterns = [
    { regex: /package\s+main|func\s+\w+.*\{|fmt\./, lang: 'go' },
    { regex: /public\s+class|import\s+java\.|System\.out/, lang: 'java' },
    { regex: /#include.*<.*>.*std::|vector<|cout\s*<</, lang: 'cpp' },
    { regex: /#include.*<.*>.*printf|malloc\s*\(/, lang: 'c' },
    { regex: /def\s+\w+.*:|import\s+\w+|:\s*$/m, lang: 'python' },
    { regex: /using\s+System|Console\.WriteLine|public\s+class/, lang: 'csharp' },
    { regex: /:\s*(string|number|boolean|\w+\[\])\s*[=\)\{]|interface\s+\w+/, lang: 'typescript' },
    { regex: /function\s+\w+|const\s+\w+\s*=.*=>|console\.log/, lang: 'javascript' }
  ];

  for (const { regex, lang } of patterns) {
    if (regex.test(code)) return lang;
  }

  return 'javascript';
}

// Enhanced code quality assessment
function assessCodeQuality(code: string, language: string): { score: number; level: string } {
  let score = 5; // Base score

  // Complexity analysis
  const complexity = (code.match(/\b(if|while|for|switch|try|catch)\b/g) || []).length;
  if (complexity > 10) score -= 2;
  else if (complexity > 5) score -= 1;
  else if (complexity >= 2) score += 1;

  // Function length (sweet spot is 10-50 lines)
  const lines = code.split('\n').length;
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

  const level = score >= 8 ? 'advanced' : score >= 6 ? 'intermediate' : 'novice';
  return { score, level };
}

// Main API handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { messages, code, language, type = 'comprehensive' } = await req.json();

    // Extract code from request
    let codeToAnalyze = code;
    let detectedLanguage = language;

    if (!codeToAnalyze && Array.isArray(messages) && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      const codeMatch = userMessage.content.match(/```(\w+)?\n?([\s\S]*?)```/) || 
                       userMessage.content.match(/`([^`]{20,})`/);
      
      if (codeMatch) {
        detectedLanguage = codeMatch[1] || detectLanguage(codeMatch[2] || codeMatch[1]);
        codeToAnalyze = (codeMatch[2] || codeMatch[1]).trim();
      }
    }

    // Validation
    if (!codeToAnalyze || codeToAnalyze.length < 20) {
      return new Response(
        JSON.stringify({
          error: "INSUFFICIENT_CODE",
          message: "Please provide a substantial code snippet (at least 20 characters)",
          suggestion: "Include a complete function or method implementation",
          retryable: true
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!detectedLanguage) {
      detectedLanguage = detectLanguage(codeToAnalyze);
    }

    // Extract function information
    const functionInfo = extractFunctionInfo(codeToAnalyze, detectedLanguage);
    
    if (!functionInfo.isValid) {
      return new Response(
        JSON.stringify({
          error: "NO_VALID_FUNCTION",
          message: `No complete function found in the ${detectedLanguage} code`,
          suggestion: "Please provide code with at least one complete function implementation",
          detectedLanguage,
          supportedLanguages: ["java", "javascript", "typescript", "python", "cpp", "c", "go", "csharp"],
          retryable: true
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Assess code quality
    const quality = assessCodeQuality(codeToAnalyze, detectedLanguage);

    console.log(`🔍 Analysis Request:`, {
      function: functionInfo.name,
      language: detectedLanguage,
      pattern: functionInfo.algorithmPattern,
      quality: `${quality.score}/10 (${quality.level})`,
      codeLength: codeToAnalyze.length,
      processingTime: Date.now() - startTime
    });

    // Generate optimization example (basic template)
    const optimizationExample = generateOptimizationExample(functionInfo, codeToAnalyze);

    // Build analysis prompt
    const analysisPrompt = CODE_ANALYSIS_PROMPT
      .replace(/\{user_code\}/g, codeToAnalyze)
      .replace(/\{language\}/g, detectedLanguage)
      .replace(/\{function_signature\}/g, functionInfo.signature)
      .replace(/\{algorithm_pattern\}/g, functionInfo.algorithmPattern)
      .replace(/\{quality_score\}/g, quality.score.toString())
      .replace(/\{quality_level\}/g, quality.level)
      .replace(/\{optimization_example\}/g, optimizationExample)
      .replace(/\{overall_summary\}/g, `demonstrates ${functionInfo.algorithmPattern} with ${quality.level} implementation quality`);

    // Stream the analysis
    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt: analysisPrompt,
      temperature: 0.1,
      maxTokens: 3000,
    });

    const response = result.toDataStreamResponse();
    
    // Add metadata headers
    response.headers.set('X-Function-Name', functionInfo.name);
    response.headers.set('X-Function-Language', detectedLanguage);
    response.headers.set('X-Algorithm-Pattern', functionInfo.algorithmPattern);
    response.headers.set('X-Quality-Score', quality.score.toString());
    response.headers.set('X-Quality-Level', quality.level);
    response.headers.set('X-Processing-Time', (Date.now() - startTime).toString());

    return response;

  } catch (error: any) {
    console.error("💥 Analysis Error:", {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      processingTime: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({
        error: "ANALYSIS_FAILED",
        message: "Failed to analyze the code",
        details: process.env.NODE_ENV === 'development' ? error.message : "Internal processing error",
        timestamp: new Date().toISOString(),
        retryable: true
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Generate basic optimization example
function generateOptimizationExample(functionInfo: FunctionInfo, code: string): string {
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
return -1;`
  };

  return patterns[functionInfo.algorithmPattern as keyof typeof patterns] || 
    `// Consider optimizing the main logic here\n// Focus on reducing time/space complexity`;
}