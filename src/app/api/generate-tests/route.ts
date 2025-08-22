import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});


const LEETCODE_TEST_CASE_PROMPT = `
🚨 **MAIN RULES - READ CAREFULLY:**
- You are an expert LeetCode test case generator.
- ALWAYS generate test cases based ONLY on the DETECTED ALGORITHM PATTERN, FUNCTION SIGNATURE, and INFERRED LEETCODE PROBLEM TYPE, NOT the user's code implementation.
- The user's code may be incomplete, incorrect, buggy, or entirely wrong—IGNORE IT COMPLETELY for generating test cases and expected outputs.
- **DO NOT read or use any code comments. Comments are unrelated to the problem and must be ignored.**
- Your job is to:
  1. Identify the INTENDED algorithm pattern or LeetCode problem from the function name, signature, parameters, and return type.
  2. Infer the specific LeetCode problem or closest matching algorithmic challenge (e.g., if function is 'twoSum(nums, target)', treat it as LeetCode 1: Two Sum).
  3. Generate CORRECT test cases with 100% accurate expected outputs for that inferred problem/pattern, as if for a canonical correct solution on LeetCode.
  4. IGNORE the user's implementation logic, all comments, and any potential outputs from the code—focus only on what the function SHOULD do based on its signature and inferred problem.
- For expected outputs, ensure they are mathematically and logically correct. For example, in Two Sum, verify that the indices' values sum exactly to the target, and indices are in ascending order if multiple possibilities.

You will be given code in {language}. Analyze it and generate exactly 3 test cases in precise LeetCode JSON format.

**IMPORTANT:** You MUST identify a clear, callable function in the code. If no function is found, respond with:
\`{"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}\`

CODE TO ANALYZE (ignore all comments in this code):
\`\`\`{language}
{user_code}
\`\`\`

🔍 **FUNCTION ANALYSIS WORKFLOW:**
1. **Extract Function Signature**: {function_name}({function_params}) -> {return_type}
2. **Detect Algorithm Pattern and Infer LeetCode Problem**: Based on function name, parameters, and return type. Use your knowledge to map to a standard LeetCode problem if possible (e.g., 'longestPalindrome(s)' → LeetCode 5: Longest Palindromic Substring).
3. **Generate Standard Test Cases**: For the detected pattern or inferred problem, NOT the user's implementation. Ensure inputs/outputs are 100% correct for the standard solution. Always include: one standard example, one edge case (e.g., empty, duplicates, negatives, minimum size), one complex case (larger input, multiple possibilities).

DETECTED FUNCTION ANALYSIS:
- Function Name: {function_name}
- Parameters: {function_params}
- Return Type: {return_type}
- Language: {language}
- Algorithm Pattern: [AUTO-DETECT FROM SIGNATURE]
- Inferred LeetCode Problem: [INFER BASED ON SIGNATURE, e.g., 'Two Sum' if matches]

⚡ **ALGORITHM PATTERN DETECTION RULES:**

**PATTERN IDENTIFICATION BY FUNCTION SIGNATURE:**
- \`twoSum(array, target) -> indices[]\` → Two Sum Pattern (LeetCode 1)
- \`search(sortedArray, target) -> index\` → Binary Search Pattern (LeetCode 704)
- \`reverse(ListNode) -> ListNode\` → Linked List Reversal (LeetCode 206)
- \`inorderTraversal(TreeNode) -> array\` → Binary Tree Traversal (LeetCode 94)
- \`isValid(string) -> boolean\` → String Validation (LeetCode 20 - Valid Parentheses)
- \`maxSubArray(array) -> number\` → Dynamic Programming (LeetCode 53 - Maximum Subarray)
- \`rotate(matrix) -> void\` → Matrix Manipulation (LeetCode 48 - Rotate Image)
- \`numIslands(grid) -> number\` → Graph/DFS (LeetCode 200 - Number of Islands)
- \`singleNumber(array) -> number\` → Bit Manipulation (LeetCode 136)
- \`canJump(array) -> boolean\` → Greedy (LeetCode 55)
- \`findRedundantConnection(edges) -> array\` → Union-Find (LeetCode 684)
- \`wordBreak(string, wordDict) -> boolean\` → Dynamic Programming/String (LeetCode 139)
- \`cloneGraph(node) -> node\` → Graph (LeetCode 133)
- \`findKthLargest(nums, k) -> number\` → Heap/Priority Queue (LeetCode 215)
- \`longestIncreasingSubsequence(nums) -> number\` → Dynamic Programming (LeetCode 300)
- \`shortestPath(graph, start, end) -> number\` → Graph/BFS (Similar to LeetCode 743)

**GENERAL INFERENCE RULE:** If no exact match, use the function name as a search key for a LeetCode problem (e.g., 'mergeTwoLists' → LeetCode 21) and generate test cases accordingly. Rely on your knowledge of LeetCode to infer and ensure coverage for any problem type, including rare ones like Trie, Bit Manipulation, Greedy, etc. If unsure, default to generating logically correct test cases based on signature (e.g., for sum problems, ensure sums match target).

🎯 **LEETCODE PROBLEM PATTERNS & STANDARD TEST CASES:**

**🔢 ARRAY PROBLEMS:**
- **Two Sum (LeetCode 1)**: 
  - Standard: \`{"input": [[2,7,11,15], 9], "output": [0,1]}\` (2+7=9)
  - Standard: \`{"input": [[3,2,4], 6], "output": [1,2]}\` (2+4=6)
  - Edge: \`{"input": [[3,3], 6], "output": [0,1]}\` (duplicates, 3+3=6)
  - Edge with negatives: \`{"input": [[-1,3,4,7], 3], "output": [0,2]}\` (-1+4=3)
  - Complex: \`{"input": [[1,4,10,-3,9,5,1,23], 10], "output": [4,6]}\` (multiple pairs possible, return any valid like 9+1=10 indices 4,6 in ascending order)
- **Array Sum**: \`{"input": [[1,2,3,4,5]], "output": 15}\`
- **Binary Search**: \`{"input": [[-1,0,3,5,9,12], 9], "output": 4}\`
- **Max Subarray**: \`{"input": [[-2,1,-3,4,-1,2,1,-5,4]], "output": 6}\`
- **Product Except Self**: \`{"input": [[1,2,3,4]], "output": [24,12,8,6]}\` (LeetCode 238)

**🔗 LINKED LIST PROBLEMS:**
- **Reverse List**: \`{"input": [[1,2,3,4,5]], "output": [5,4,3,2,1]}\`
- **Merge Lists**: \`{"input": [[1,2,4], [1,3,4]], "output": [1,1,2,3,4,4]}\`
- **Cycle Detection**: \`{"input": [[3,2,0,-4], 1], "output": true}\` (pos for cycle)
- **Remove Elements**: \`{"input": [[1,2,6,3,4,5,6], 6], "output": [1,2,3,4,5]}\`
- **Add Two Numbers**: \`{"input": [[2,4,3], [5,6,4]], "output": [7,0,8]}\` (LeetCode 2)

**🌳 BINARY TREE PROBLEMS:**
- **Inorder Traversal**: \`{"input": [[1,null,2,3]], "output": [1,3,2]}\`
- **Tree Validation**: \`{"input": [[2,1,3]], "output": true}\` (BST)
- **Level Order**: \`{"input": [[3,9,20,null,null,15,7]], "output": [[3],[9,20],[15,7]]}\`
- **Max Depth**: \`{"input": [[3,9,20,null,null,15,7]], "output": 3}\`
- **Diameter**: \`{"input": [[1,2,3,4,5]], "output": 3}\` (LeetCode 543)

**🧮 STRING PROBLEMS:**
- **Valid Parentheses**: \`{"input": ["()[]{}"], "output": true}\`
- **Palindrome Check**: \`{"input": ["racecar"], "output": true}\`
- **Anagram Check**: \`{"input": ["anagram", "nagaram"], "output": true}\`
- **Longest Substring**: \`{"input": ["abcabcbb"], "output": 3}\`
- **Longest Palindromic Substring**: \`{"input": ["babad"], "output": "bab"}\` (LeetCode 5)

**📊 MATRIX PROBLEMS:**
- **Matrix Rotation**: \`{"input": [[[1,2,3],[4,5,6],[7,8,9]]], "output": [[7,4,1],[8,5,2],[9,6,3]]}\`
- **Search Matrix**: \`{"input": [[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]], 5], "output": true}\`
- **Number of Islands**: \`{"input": [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], "output": 1}\`
- **Spiral Order**: \`{"input": [[[1,2,3],[4,5,6],[7,8,9]]], "output": [1,2,3,6,9,8,7,4,5]}\` (LeetCode 54)

**⚡ DYNAMIC PROGRAMMING:**
- **Fibonacci**: \`{"input": [10], "output": 55}\`
- **Climbing Stairs**: \`{"input": [3], "output": 3}\`
- **Coin Change**: \`{"input": [[1,3,4], 6], "output": 2}\`
- **House Robber**: \`{"input": [[2,7,9,3,1]], "output": 12}\`
- **Longest Increasing Subsequence**: \`{"input": [[10,9,2,5,3,7,101,18]], "output": 4}\` (LeetCode 300)
- **Word Break**: \`{"input": ["leetcode", ["leet","code"]], "output": true}\`

**🔍 BACKTRACKING:**
- **Permutations**: \`{"input": [[1,2,3]], "output": [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]}\`
- **Combinations**: \`{"input": [4, 2], "output": [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]}\`
- **Subsets**: \`{"input": [[1,2,3]], "output": [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]}\`
- **N-Queens**: \`{"input": [4], "output": [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]}\` (LeetCode 51, simplified)

**🎯 SLIDING WINDOW:**
- **Max Average**: \`{"input": [[1,12,-5,-6,50,3], 4], "output": 12.75}\`
- **Min Window**: \`{"input": ["ADOBECODEBANC", "ABC"], "output": "BANC"}\`
- **Longest Substring**: \`{"input": ["pwwkew"], "output": 3}\`

**🔧 STACK/QUEUE:**
- **Valid Parentheses**: \`{"input": ["()[]{}"], "output": true}\`
- **Next Greater**: \`{"input": [[1,3,2,4]], "output": [3,4,4,-1]}\`
- **Daily Temperatures**: \`{"input": [[73,74,75,71,69,72,76,73]], "output": [1,1,4,2,1,1,0,0]}\`

**🔢 BIT MANIPULATION:**
- **Single Number**: \`{"input": [[2,2,1]], "output": 1}\`
- **Hamming Weight**: \`{"input": [00000000000000000000000000001011], "output": 3}\` (LeetCode 191)
- **Missing Number**: \`{"input": [[3,0,1]], "output": 2}\` (LeetCode 268)

**💰 GREEDY:**
- **Jump Game**: \`{"input": [[2,3,1,1,4]], "output": true}\`
- **Container With Most Water**: \`{"input": [[1,8,6,2,5,4,8,3,7]], "output": 49}\`
- **Task Scheduler**: \`{"input": [["A","A","A","B","B","B"], 2], "output": 8}\` (LeetCode 621)

**🔗 UNION-FIND:**
- **Redundant Connection**: \`{"input": [[[1,2],[1,3],[2,3]]], "output": [2,3]}\`
- **Accounts Merge**: \`{"input": [[["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]], "output": [["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]}\` (LeetCode 721, simplified)
- **Number of Provinces**: \`{"input": [[[1,1,0],[1,1,0],[0,0,1]]], "output": 2}\` (LeetCode 547)

**📈 GRAPH PROBLEMS:**
- **Clone Graph**: \`{"input": [[[2],[1],[],[],[1]]], "output": [[[2],[1],[],[],[1]]]}\` (adj list representation)
- **Course Schedule**: \`{"input": [2, [[1,0]]], "output": true}\`
- **Word Ladder**: \`{"input": ["hit", "cog", ["hot","dot","dog","lot","log","cog"]], "output": 5}\`

**🌐 TRIE/WORD PROBLEMS:**
- **Word Search**: \`{"input": [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED"], "output": true}\` (LeetCode 79)
- **Implement Trie (Prefix Tree)**: For methods, but if single: assume insert and search test cases.
- **Longest Common Prefix**: \`{"input": [["flower","flow","flight"]], "output": "fl"}\` (LeetCode 14)

**🗑 HEAP/PRIORITY QUEUE:**
- **Kth Largest Element**: \`{"input": [[3,2,1,5,6,4], 2], "output": 5}\`
- **Merge K Sorted Lists**: \`{"input": [[[1,4,5],[1,3,4],[2,6]]], "output": [1,1,2,3,4,4,5,6]}\`
- **Top K Frequent**: \`{"input": [[1,1,1,2,2,3], 2], "output": [1,2]}\` (LeetCode 347)

**MATH PROBLEMS:**
- **Add Digits**: \`{"input": [38], "output": 2}\` (LeetCode 258)
- **Pow(x, n)**: \`{"input": [2.0, 10], "output": 1024.0}\` (LeetCode 50)
- **Sqrt(x)**: \`{"input": [4], "output": 2}\` (LeetCode 69)

LANGUAGE-SPECIFIC FUNCTION DETECTION: (unchanged from original)

🎯 **INTELLIGENT PATTERN MATCHING:**

Based on the detected function signature, automatically identify the most likely LeetCode pattern or problem:

1. **Function Name Analysis**:
   - Contains "sum" or "add" → Array/Number sum problems
   - Contains "search" or "find" → Search/Binary Search/Graph Search
   - Contains "reverse" or "invert" → Reversal problems (List/Tree/String)
   - Contains "valid" or "check" → Validation problems
   - Contains "max" or "min" or "longest" or "shortest" → Optimization/DP/Greedy
   - Contains "bit" or "xor" or "and" → Bit Manipulation
   - Contains "jump" or "can" → Greedy/Jump Game
   - Contains "union" or "find" or "connect" → Union-Find
   - Contains "graph" or "node" or "edge" → Graph
   - Contains "trie" or "word" or "prefix" → Trie/String Matching
   - Contains "heap" or "kth" or "top" → Heap
   - Use exact function name to match LeetCode problem titles (e.g., 'maxArea' → Container With Most Water)

2. **Parameter Analysis**:
   - \`(array, target)\` → Two Sum/Search family
   - \`(ListNode)\` → Linked List operations
   - \`(TreeNode)\` → Binary Tree operations
   - \`(matrix/grid)\` → 2D array/Graph problems
   - \`(string, dict)\` → String/Word problems
   - \`(edges/list of lists)\` → Graph/Union-Find
   - \`(nums, k)\` → K-related (Heap/DP)

3. **Return Type Analysis**:
   - \`int[]/array\` → Index/List results
   - \`boolean\` → Validation/check/can-do problems
   - \`ListNode/TreeNode\` → Structure manipulation
   - \`List<List<>>\` → Grouped/Level-order/Combinations
   - \`string\` → String results (e.g., palindrome)
   - \`number/float\` → Count/Max/Min/Length

**FALLBACK FOR UNKNOWN PATTERNS:** If no listed pattern matches, infer the closest LeetCode problem based on signature and your knowledge (e.g., recall standard test cases for that problem). Generate 3 correct test cases: 1 standard, 1 edge (empty/single/extreme/duplicates/negatives), 1 complex. Verify outputs logically (e.g., for sums, check math).

CRITICAL TEST CASE REQUIREMENTS:
1. **Correctness First**: Every test case, especially the last (complex) one, must have an expected output that is 100% accurate for the standard LeetCode solution of the inferred problem. Never use or be influenced by the user's code or its output. Always verify the expected output for all cases—double-check the logic and ensure the last case is correct by running or reasoning through the real solution.
2. **Input Wrapping**: All function parameters must be provided as an array: func(a, b) → [a, b]. Use only JSON-serializable formats (arrays for lists, null for None, etc.).
3. **LeetCode Pattern Matching**: Strictly follow standard LeetCode examples for the inferred problem or pattern, adapting if needed. For Two Sum, always return indices in ascending order.
4. **Edge Case Coverage**: Always include: (1) Standard case, (2) Edge case (empty input if allowed, single element, min/max values, negatives, duplicates, invalid if applicable), (3) Complex case (larger/more challenging input). For the complex case, ensure the expected output is correct and has been checked against the real/official solution.
5. **Data Type and Format Accuracy**: Match exact LeetCode formats (e.g., linked lists as arrays, trees as arrays with nulls, graphs as adj lists). Assume constraints like unique solution for Two Sum.
6. **Universal Coverage**: This must work for ANY LeetCode problem type—use inference to handle unlisted ones like Design, Math, Simulation, etc. If the problem assumes "exactly one solution", don't generate multiples.

**IMPORTANT:** Even if the user's code is incorrect, crashes, or outputs wrong values, your test cases and expected outputs must always be correct based on the intended problem. Always ensure the last (complex) test case has the correct expected output, verified by real program logic or the official solution.

TEST CASE GENERATION STRATEGY:
1. **Standard Case (50%)**: Classic LeetCode example for the inferred problem.
2. **Edge Case (30%)**: Boundary conditions (empty, single, extremes, special cases like all duplicates, negatives).
3. **Complex Case (20%)**: Larger/more intricate input to test the full algorithm. For this case, always double-check and guarantee the expected output is correct.

RESPONSE FORMAT:
Return ONLY valid JSON. Either:
\`[{"input": [...], "output": ...}, {"input": [...], "output": ...}, {"input": [...], "output": ...}]\`

OR if no function found:
\`{"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}\`

🔥 **REMEMBER:** Generate test cases for what the function SHOULD do based on its signature, detected pattern, and inferred LeetCode problem, NOT what the user's potentially incorrect code does. **NEVER use or reference any code comments.** Ensure 100% correctness for any problem type, verifying outputs logically.
`;


interface FunctionSignature {
  name: string;
  parameters: string[];
  returnType?: string;
  language: string;
  isValid: boolean;
  algorithmPattern?: string;
  dataStructureTypes?: string[];
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { messages, code, language } = await req.json();

    let codeToAnalyze = code;
    let detectedLanguage = language || "java";

    // Enhanced code extraction with better pattern matching
    if (!codeToAnalyze && Array.isArray(messages) && messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      
      const extractionPatterns: RegExp[] = [
        /``````/g, // Multi-line code blocks with language
        /`([^`\n]{10,})`/g, // Single line code (min 10 chars)
        /(?:function|def|class|public|private|func|int|vector|string|const|let|var)\s+[\w\s\(\)]+\s*[\{\:=]/i, // Function declarations
      ];

      // Enhanced code extraction with proper handling
      for (const pattern of extractionPatterns) {
        const matches = Array.from(userMessage.content.matchAll(pattern)) as RegExpMatchArray[];
        for (const match of matches) {
          if (match[1] && match[1].length >= 10) {
            codeToAnalyze = match[1];
          } else if (match[0] && pattern === extractionPatterns[2]) {
            codeToAnalyze = match[0];
          }
          if (codeToAnalyze && codeToAnalyze.length > 20) break;
        }
        if (codeToAnalyze && codeToAnalyze.length > 20) break;
      }
    }

    // Enhanced validation
    if (!codeToAnalyze || codeToAnalyze.trim().length === 0) {
      return Response.json({
        error: "NO_CODE_PROVIDED",
        message: "No code found in the request",
        details: "Please provide code either directly or within triple backticks",
        supportedLanguages: ["java", "cpp", "python", "go", "c", "javascript", "typescript"],
        retryable: true
      }, { status: 400 });
    }

    if (codeToAnalyze.length < 15) {
      return Response.json({
        error: "INSUFFICIENT_CODE",
        message: "Code is too short for meaningful analysis",
        details: `Code length: ${codeToAnalyze.length} characters (minimum 15 required)`,
        retryable: true
      }, { status: 400 });
    }

    // Enhanced language detection
    if (!language) {
      detectedLanguage = detectLanguageFromCode(codeToAnalyze);
    }

    // Validate language support
    const supportedLanguages = ["java", "cpp", "c", "python", "go", "javascript", "typescript"];
    if (!supportedLanguages.includes(detectedLanguage.toLowerCase())) {
      return Response.json({
        error: "UNSUPPORTED_LANGUAGE",
        message: `Language '${detectedLanguage}' is not supported`,
        details: `Supported languages: ${supportedLanguages.join(', ')}`,
        detectedLanguage,
        retryable: true
      }, { status: 400 });
    }

    // Enhanced function signature validation
    const functionSignature = extractFunctionSignature(codeToAnalyze, detectedLanguage);
    
    if (!functionSignature.isValid) {
      return Response.json({
        error: "NO_FUNCTION_FOUND",
        message: "No callable function detected in the provided code",
        details: `Expected a complete function definition in ${detectedLanguage}. Note: main methods, constructors, and utility methods are excluded from testing.`,
        suggestions: getFunctionSuggestions(detectedLanguage),
        retryable: true
      }, { status: 400 });
    }

    console.log(`📊 Enhanced Function Analysis:`, {
      name: functionSignature.name,
      parameters: functionSignature.parameters.length,
      language: detectedLanguage,
      codeLength: codeToAnalyze.length,
      algorithmPattern: functionSignature.algorithmPattern,
      dataStructures: functionSignature.dataStructureTypes,
      processingTime: Date.now() - startTime
    });

    // Build enhanced prompt with function context
    const prompt = LEETCODE_TEST_CASE_PROMPT
      .replace(/\{user_code\}/g, codeToAnalyze)
      .replace(/\{language\}/g, detectedLanguage)
      .replace(/\{function_name\}/g, functionSignature.name)
      .replace(/\{function_params\}/g, functionSignature.parameters.join(', '))
      .replace(/\{return_type\}/g, functionSignature.returnType || 'auto-detect');

    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt,
      temperature: 0.05, // Very low temperature for consistent formatting
      maxTokens: 2000,
    });

    const response = result.toDataStreamResponse();
    
    // Enhanced response headers with metadata
    response.headers.set('Content-Type', 'text/plain; charset=utf-8');
    response.headers.set('Cache-Control', 'no-cache');
    response.headers.set('X-Function-Name', functionSignature.name);
    response.headers.set('X-Function-Language', detectedLanguage);
    response.headers.set('X-Function-Parameters', functionSignature.parameters.length.toString());
    response.headers.set('X-Algorithm-Pattern', functionSignature.algorithmPattern || 'unknown');
    response.headers.set('X-Processing-Time', (Date.now() - startTime).toString());
    
    return response;

  } catch (error: any) {
    console.error("💥 Test Case Generation Error:", {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      processingTime: Date.now() - startTime
    });

    return Response.json({
      error: "GENERATION_FAILED",
      message: "Failed to generate test cases",
      details: process.env.NODE_ENV === 'development' ? error.message : "Internal processing error",
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      retryable: true
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// Enhanced function signature extraction for all languages
function extractFunctionSignature(code: string, language: string): FunctionSignature {
  const result: FunctionSignature = {
    name: "",
    parameters: [],
    language,
    isValid: false,
    returnType: "",
    algorithmPattern: "unknown",
    dataStructureTypes: []
  };

  try {
    switch (language.toLowerCase()) {
      case 'java':
        return extractJavaFunction(code);
      case 'python':
        return extractPythonFunction(code);
      case 'cpp':
        return extractCppFunction(code);
      case 'c':
        return extractCFunction(code);
      case 'go':
        return extractGoFunction(code);
      case 'javascript':
        return extractJavaScriptFunction(code);
      case 'typescript':
        return extractTypeScriptFunction(code);
      default:
        return result;
    }
  } catch (error) {
    console.warn(`Function extraction failed for ${language}:`, error);
    return result;
  }
}

// Enhanced Java function extraction
function extractJavaFunction(code: string): FunctionSignature {
  // Improved regex: allow for generic return types, array types, and nested generics, and static/non-static
  // Also, match methods inside classes, and allow for whitespace/newlines
  // This pattern matches: [modifiers] returnType functionName(params) {
  const javaPattern = /(?:public|private|protected)?\s*(?:static)?\s*([\w\<\>\[\], ?]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;

  // Find all class names for constructor exclusion
  const classNames = Array.from(code.matchAll(/class\s+(\w+)/g)).map(m => m[1]);

  // Find all function matches
  const matches = Array.from(code.matchAll(javaPattern));

  for (const match of matches) {
    // match[1]: returnType, match[2]: functionName, match[3]: paramString
    const returnType = match[1]?.trim() || "";
    const functionName = match[2];
    const paramString = match[3] || "";

    // Exclude common non-solution methods
    const excludedFunctions = [
      'main', 'class', 'if', 'for', 'while', 'switch', 'try', 'catch',
      'toString', 'equals', 'hashCode', 'compareTo', 'clone', 'finalize',
      'wait', 'notify', 'notifyAll', 'getClass'
    ];
    if (excludedFunctions.includes(functionName.toLowerCase())) continue;

    // Exclude constructors (function name matches any class name)
    if (classNames.includes(functionName)) continue;

    // Parse parameters (handle empty string)
    const parameters = paramString.trim()
      ? paramString.split(',').map(p => p.trim()).filter(Boolean)
      : [];

    // Validate function body: ensure the match is followed by a '{'
    // (Our regex already requires '{' after the signature, so this is always true)
    // But let's check that the function is not just a declaration (no semicolon after signature)
    // and that it's not an interface method
    const matchEnd = (match.index ?? 0) + match[0].length;
    const afterMatch = code.substring(matchEnd, matchEnd + 200);
    if (afterMatch.trim().startsWith(";")) continue; // skip interface/abstract methods

    // Compose signature
    const signature: FunctionSignature = {
      name: functionName,
      parameters,
      returnType,
      language: 'java',
      isValid: true,
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
      dataStructureTypes: detectDataStructureTypes(parameters, returnType)
    };

    // Debug
    console.log(`✅ Found Java function: ${functionName}(${parameters.join(", ")}) : ${returnType}`);

    return signature;
  }

  // If nothing found, return invalid signature
  console.log(`❌ No valid Java function detected`);
  return { name: "", parameters: [], language: 'java', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}


// Enhanced Python function extraction
function extractPythonFunction(code: string): FunctionSignature {
  const pythonPattern = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/g;
  
  const matches = Array.from(code.matchAll(pythonPattern));
  
  for (const match of matches) {
    const [, functionName, paramString, returnType] = match;
    
    const excludedFunctions = [
      'main', '__init__', '__str__', '__repr__', '__eq__', '__hash__',
      '__len__', '__getitem__', '__setitem__', '__contains__', '__iter__', '__next__'
    ];
    
    if (excludedFunctions.includes(functionName.toLowerCase()) || 
        (functionName.startsWith('__') && functionName.endsWith('__'))) {
      continue;
    }
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => {
        const param = p.trim().split(':')[0].trim();
        return param === 'self' ? param : param;
      }).filter(p => p && p !== 'self') : [];
    
    // Validate function has body
    const functionStart = (match.index || 0) + match[0].length;
    const afterColon = code.substring(functionStart);
    const nextLines = afterColon.split('\n').slice(1, 4);
    
    const hasBody = nextLines.some(line => line.trim() && (line.startsWith('    ') || line.startsWith('\t')));
    
    if (hasBody) {
      const signature = {
        name: functionName,
        parameters,
        returnType: returnType?.trim() || "",
        language: 'python',
        isValid: true,
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
        dataStructureTypes: detectDataStructureTypes(parameters, returnType)
      };
      
      console.log(`✅ Found Python function: ${functionName} with pattern: ${signature.algorithmPattern}`);
      return signature;
    }
  }
  
  return { name: "", parameters: [], language: 'python', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}

// Enhanced C++ function extraction
function extractCppFunction(code: string): FunctionSignature {
  const cppPattern = /(\w+(?:<[^>]+>)?(?:\s*[&*])*)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*{/g;
  
  const matches = Array.from(code.matchAll(cppPattern));
  
  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;
    
    const excludedFunctions = [
      'main', 'if', 'for', 'while', 'switch', 'try', 'catch',
      'operator', 'new', 'delete'
    ];
    
    if (excludedFunctions.includes(functionName.toLowerCase()) || 
        functionName.startsWith('~') || functionName.startsWith('operator')) {
      continue;
    }
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => p.trim()) : [];
    
    const signature = {
      name: functionName,
      parameters,
      returnType,
      language: 'cpp',
      isValid: true,
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
      dataStructureTypes: detectDataStructureTypes(parameters, returnType)
    };
    
    console.log(`✅ Found C++ function: ${functionName} with pattern: ${signature.algorithmPattern}`);
    return signature;
  }
  
  return { name: "", parameters: [], language: 'cpp', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}

// C function extraction
function extractCFunction(code: string): FunctionSignature {
  const cPattern = /(\w+(?:\s*[*])*)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
  
  const matches = Array.from(code.matchAll(cPattern));
  
  for (const match of matches) {
    const [, returnType, functionName, paramString] = match;
    
    const excludedFunctions = ['main', 'if', 'for', 'while', 'switch', 'sizeof'];
    
    if (excludedFunctions.includes(functionName.toLowerCase())) {
      continue;
    }
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => p.trim()) : [];
    
    const signature = {
      name: functionName,
      parameters,
      returnType,
      language: 'c',
      isValid: true,
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
      dataStructureTypes: detectDataStructureTypes(parameters, returnType)
    };
    
    console.log(`✅ Found C function: ${functionName} with pattern: ${signature.algorithmPattern}`);
    return signature;
  }
  
  return { name: "", parameters: [], language: 'c', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}

// Go function extraction
function extractGoFunction(code: string): FunctionSignature {
  const goPattern = /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*{/g;
  
  const matches = Array.from(code.matchAll(goPattern));
  
  for (const match of matches) {
    const [, functionName, paramString, returnType] = match;
    
    const excludedFunctions = ['main', 'init', 'if', 'for', 'switch'];
    
    if (excludedFunctions.includes(functionName.toLowerCase())) {
      continue;
    }
    
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => p.trim()) : [];
    
    const signature = {
      name: functionName,
      parameters,
      returnType: returnType?.trim() || "",
      language: 'go',
      isValid: true,
      algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
      dataStructureTypes: detectDataStructureTypes(parameters, returnType)
    };
    
    console.log(`✅ Found Go function: ${functionName} with pattern: ${signature.algorithmPattern}`);
    return signature;
  }
  
  return { name: "", parameters: [], language: 'go', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}

// NEW: JavaScript function extraction
function extractJavaScriptFunction(code: string): FunctionSignature {
  // JavaScript function patterns (function declarations, expressions, arrow functions)
  const jsPatterns = [
    // Function declarations: function name() {}
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Function expressions: const name = function() {}
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{/g,
    // Arrow functions: const name = () => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    // Arrow functions without parentheses: const name = param => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>/g
  ];

  for (const pattern of jsPatterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, params] = match;
      
      const excludedFunctions = [
        'main', 'console', 'if', 'for', 'while', 'require', 'module', 'exports',
        'log', 'error', 'warn', 'info', 'debug', 'trace'
      ];
      
      if (excludedFunctions.includes(functionName.toLowerCase())) {
        continue;
      }
      
      const parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      
      // Validate function has body (for arrow functions, we check if there's a => followed by { or expression)
      const functionStart = (match.index || 0) + match[0].length;
      const afterMatch = code.substring(functionStart);
      
      let hasBody = false;
      if (pattern === jsPatterns[0] || pattern === jsPatterns[1]) {
        // Regular function or function expression - should have {
        hasBody = afterMatch.trim().startsWith('{') || match[0].includes('{');
      } else {
        // Arrow function - has => in the match
        hasBody = true;
      }
      
      if (hasBody) {
        const signature = {
          name: functionName,
          parameters,
          returnType: "", // JavaScript is dynamically typed
          language: 'javascript',
          isValid: true,
          algorithmPattern: detectAlgorithmPattern(functionName, parameters, "", code),
          dataStructureTypes: detectDataStructureTypes(parameters, "")
        };
        
        console.log(`✅ Found JavaScript function: ${functionName} with pattern: ${signature.algorithmPattern}`);
        return signature;
      }
    }
  }
  
  return { name: "", parameters: [], language: 'javascript', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}

// NEW: TypeScript function extraction
function extractTypeScriptFunction(code: string): FunctionSignature {
  // TypeScript function patterns (with type annotations)
  const tsPatterns = [
    // Function declarations: function name(): type {}
    /function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Function expressions: const name = function(): type {}
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Arrow functions: const name = (): type => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*:\s*([^=]+)\s*=>/g,
    // Function declarations without return type: function name() {}
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Arrow functions without return type: const name = () => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g
  ];

  for (const pattern of tsPatterns) {
    const matches = Array.from(code.matchAll(pattern));
    
    for (const match of matches) {
      const [, functionName, params, returnType] = match;
      
      const excludedFunctions = [
        'main', 'console', 'if', 'for', 'while', 'require', 'module', 'exports',
        'import', 'export', 'log', 'error', 'warn', 'info', 'debug', 'trace'
      ];
      
      if (excludedFunctions.includes(functionName.toLowerCase())) {
        continue;
      }
      
      const parameters = params ? params.split(',')
        .map(p => p.trim().split(':')[0].trim())
        .filter(p => p) : [];
      
      // Validate function has body
      const functionStart = (match.index || 0) + match[0].length;
      const afterMatch = code.substring(functionStart);
      
      let hasBody = false;
      if (pattern === tsPatterns[0] || pattern === tsPatterns[1] || pattern === tsPatterns[3]) {
        // Regular function or function expression - should have {
        hasBody = afterMatch.trim().startsWith('{') || match[0].includes('{');
      } else {
        // Arrow function - has => in the match
        hasBody = true;
      }
      
      if (hasBody) {
        const signature = {
          name: functionName,
          parameters,
          returnType: returnType?.trim() || "",
          language: 'typescript',
          isValid: true,
          algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
          dataStructureTypes: detectDataStructureTypes(parameters, returnType)
        };
        
        console.log(`✅ Found TypeScript function: ${functionName} with pattern: ${signature.algorithmPattern}`);
        return signature;
      }
    }
  }
  
  return { name: "", parameters: [], language: 'typescript', isValid: false, algorithmPattern: "unknown", dataStructureTypes: [] };
}

// Enhanced language detection
function detectLanguageFromCode(code: string): string {
  const languagePatterns = [
    { pattern: /package\s+main|func\s+\w+.*\{|:=|fmt\.Print/i, language: 'go' },
    { pattern: /public\s+(?:static\s+)?\w+\s+\w+\s*\(|import\s+java\.|System\.out|class\s+\w+/i, language: 'java' },
    { pattern: /#include\s*<.*>.*using\s+namespace|std::|vector<|cout\s*<<|class\s+\w+.*{/i, language: 'cpp' },
    { pattern: /#include\s*<.*>.*int\s+main|printf\s*\(|scanf\s*\(|malloc\s*\(/i, language: 'c' },
    { pattern: /def\s+\w+.*:|import\s+\w+|print\s*\(|:\s*$|if\s+__name__/m, language: 'python' },
    // NEW: JavaScript patterns
    { pattern: /function\s+\w+\s*\(|const\s+\w+\s*=\s*\(.*\)\s*=>|let\s+\w+\s*=|var\s+\w+\s*=|console\.log|require\s*\(|module\.exports/i, language: 'javascript' },
    // NEW: TypeScript patterns (check before JavaScript since TS is superset)
    { pattern: /:\s*(string|number|boolean|any|\w+\[\])\s*[=\)\{]|interface\s+\w+|type\s+\w+\s*=|import\s+.*from|export\s+(default\s+)?/i, language: 'typescript' },
  ];

  // Check TypeScript first since it's a superset of JavaScript
  for (const { pattern, language } of languagePatterns) {
    if (pattern.test(code)) {
      console.log(`🔍 Detected language: ${language}`);
      return language;
    }
  }
  
  console.log(`🔍 Defaulting to Java (no pattern matched)`);
  return 'java';
}

// Algorithm pattern detection
function detectAlgorithmPattern(functionName: string, parameters: string[], returnType: string | undefined, code: string): string {
  const name = functionName.toLowerCase();
  const paramStr = parameters.join(' ').toLowerCase();
  const codeStr = code.toLowerCase();
  
  // Two Sum pattern
  if (name.includes('twosum') || name.includes('two_sum') || 
      (paramStr.includes('target') && (paramStr.includes('array') || paramStr.includes('nums')))) {
    return 'two_sum';
  }
  
  // Binary Search pattern
  if (name.includes('search') || name.includes('binary') ||
      (codeStr.includes('left') && codeStr.includes('right') && codeStr.includes('mid'))) {
    return 'binary_search';
  }
  
  // Linked List pattern
  if (paramStr.includes('listnode') || name.includes('list') || 
      codeStr.includes('next') || codeStr.includes('head')) {
    return 'linked_list';
  }
  
  // Tree pattern
  if (paramStr.includes('treenode') || name.includes('tree') ||
      (codeStr.includes('left') && codeStr.includes('right') && codeStr.includes('root'))) {
    return 'binary_tree';
  }
  
  // Dynamic Programming pattern
  if (name.includes('dp') || codeStr.includes('memo') || codeStr.includes('fibonacci') ||
      codeStr.includes('dynamic') || name.includes('climb') || name.includes('coin')) {
    return 'dynamic_programming';
  }
  
  // Graph pattern
  if (name.includes('graph') || paramStr.includes('adjacency') || 
      codeStr.includes('visited') || codeStr.includes('dfs') || codeStr.includes('bfs')) {
    return 'graph';
  }
  
  // String pattern
  if (paramStr.includes('string') || name.includes('palindrome') || 
      name.includes('anagram') || name.includes('substring')) {
    return 'string_manipulation';
  }
  
  // Matrix pattern
  if (paramStr.includes('matrix') || paramStr.includes('grid') ||
      (codeStr.includes('row') && codeStr.includes('col'))) {
    return 'matrix';
  }
  
  // Sliding Window pattern
  if (name.includes('window') || name.includes('sliding') ||
      (codeStr.includes('left') && codeStr.includes('right') && !codeStr.includes('mid'))) {
    return 'sliding_window';
  }
  
  return 'general_algorithm';
}

// Data structure type detection
function detectDataStructureTypes(parameters: string[], returnType: string | undefined): string[] {
  const types: string[] = [];
  const allParams = parameters.join(' ') + ' ' + (returnType || '');
  const paramStr = allParams.toLowerCase();
  
  if (paramStr.includes('listnode')) types.push('linked_list');
  if (paramStr.includes('treenode')) types.push('binary_tree');
  if (paramStr.includes('array') || paramStr.includes('[]') || paramStr.includes('vector')) types.push('array');
  if (paramStr.includes('string') || paramStr.includes('str')) types.push('string');
  if (paramStr.includes('matrix') || paramStr.includes('grid')) types.push('matrix');
  if (paramStr.includes('graph') || paramStr.includes('adjacency')) types.push('graph');
  if (paramStr.includes('int') || paramStr.includes('long') || paramStr.includes('double') || paramStr.includes('number')) types.push('numeric');
  if (paramStr.includes('bool') || paramStr.includes('boolean')) types.push('boolean');
  
  return types.length > 0 ? types : ['unknown'];
}

// Get language-specific function suggestions
function getFunctionSuggestions(language: string): string[] {
  const suggestions = {
    java: [
      "public int[] twoSum(int[] nums, int target) { ... }",
      "public ListNode reverseList(ListNode head) { ... }",
      "public boolean isValid(String s) { ... }"
    ],
    python: [
      "def two_sum(nums: List[int], target: int) -> List[int]: ...",
      "def reverse_list(head: ListNode) -> ListNode: ...",
      "def is_valid(s: str) -> bool: ..."
    ],
    cpp: [
      "vector<int> twoSum(vector<int>& nums, int target) { ... }",
      "ListNode* reverseList(ListNode* head) { ... }",
      "bool isValid(string s) { ... }"
    ],
    c: [
      "int* twoSum(int* nums, int numsSize, int target, int* returnSize) { ... }",
      "struct ListNode* reverseList(struct ListNode* head) { ... }",
      "bool isValid(char* s) { ... }"
    ],
    go: [
      "func twoSum(nums []int, target int) []int { ... }",
      "func reverseList(head *ListNode) *ListNode { ... }",
      "func isValid(s string) bool { ... }"
    ],
    javascript: [
      "function twoSum(nums, target) { ... }",
      "const reverseList = (head) => { ... }",
      "function isValid(s) { ... }"
    ],
    typescript: [
      "function twoSum(nums: number[], target: number): number[] { ... }",
      "const reverseList = (head: ListNode): ListNode => { ... }",
      "function isValid(s: string): boolean { ... }"
    ]
  };
  
  return suggestions[language.toLowerCase() as keyof typeof suggestions] || suggestions.java;
}