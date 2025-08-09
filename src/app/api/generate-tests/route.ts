import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const LEETCODE_TEST_CASE_PROMPT = `
🚨 **MAIN RULE - CRITICAL UNDERSTANDING:**
ALWAYS generate test cases based on the DETECTED ALGORITHM PATTERN and FUNCTION SIGNATURE, NOT the user's code implementation.
The user's code may be incomplete, incorrect, or buggy. Your job is to:
1. Identify the INTENDED algorithm pattern from function name and signature
2. Generate CORRECT test cases for that specific algorithmic pattern
3. IGNORE the user's implementation logic - focus only on what the function SHOULD do based on its signature

You are an expert LeetCode test case generator. Analyze the provided {language} code and generate exactly 3 test cases in EXACT LeetCode JSON format.

CRITICAL: You MUST identify a clear, callable function in the code. If no function is found, respond with: {"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}

CODE TO ANALYZE:
\`\`\`{language}
{user_code}
\`\`\`

🔍 **FUNCTION ANALYSIS WORKFLOW:**
1. **Extract Function Signature**: {function_name}({function_params}) -> {return_type}
2. **Detect Algorithm Pattern**: Based on function name, parameters, and return type
3. **Generate Standard Test Cases**: For the detected pattern, NOT the user's implementation

DETECTED FUNCTION ANALYSIS:
- Function Name: {function_name}
- Parameters: {function_params}  
- Return Type: {return_type}
- Language: {language}
- Algorithm Pattern: [AUTO-DETECT FROM SIGNATURE]

⚡ **ALGORITHM PATTERN DETECTION RULES:**

**PATTERN IDENTIFICATION BY FUNCTION SIGNATURE:**
- \`twoSum(array, target) -> indices[]\` → Two Sum Pattern
- \`search(sortedArray, target) -> index\` → Binary Search Pattern  
- \`reverse(ListNode) -> ListNode\` → Linked List Pattern
- \`inorderTraversal(TreeNode) -> array\` → Binary Tree Pattern
- \`isValid(string) -> boolean\` → String Validation Pattern
- \`maxSubArray(array) -> number\` → Dynamic Programming Pattern
- \`rotate(matrix) -> void\` → Matrix Manipulation Pattern
- \`numIslands(grid) -> number\` → Graph/DFS Pattern

🎯 **LEETCODE PROBLEM PATTERNS & STANDARD TEST CASES:**

**🔢 ARRAY PROBLEMS:**
- **Two Sum**: \`{"input": [[2,7,11,15], 9], "output": [0,1]}\`
- **Array Sum**: \`{"input": [[1,2,3,4,5]], "output": 15}\`
- **Binary Search**: \`{"input": [[-1,0,3,5,9,12], 9], "output": 4}\`
- **Max Subarray**: \`{"input": [[-2,1,-3,4,-1,2,1,-5,4]], "output": 6}\`

**🔗 LINKED LIST PROBLEMS:**
- **Reverse List**: \`{"input": [[1,2,3,4,5]], "output": [5,4,3,2,1]}\`
- **Merge Lists**: \`{"input": [[1,2,4], [1,3,4]], "output": [1,1,2,3,4,4]}\`
- **Cycle Detection**: \`{"input": [[3,2,0,-4], 1], "output": true}\`
- **Remove Elements**: \`{"input": [[1,2,6,3,4,5,6], 6], "output": [1,2,3,4,5]}\`

**🌳 BINARY TREE PROBLEMS:**
- **Inorder Traversal**: \`{"input": [[1,null,2,3]], "output": [1,3,2]}\`
- **Tree Validation**: \`{"input": [[2,1,3]], "output": true}\`
- **Level Order**: \`{"input": [[3,9,20,null,null,15,7]], "output": [[3],[9,20],[15,7]]}\`
- **Max Depth**: \`{"input": [[3,9,20,null,null,15,7]], "output": 3}\`

**🧮 STRING PROBLEMS:**
- **Valid Parentheses**: \`{"input": ["()[]{}"], "output": true}\`
- **Palindrome Check**: \`{"input": ["racecar"], "output": true}\`
- **Anagram Check**: \`{"input": ["anagram", "nagaram"], "output": true}\`
- **Longest Substring**: \`{"input": ["abcabcbb"], "output": 3}\`

**📊 MATRIX PROBLEMS:**
- **Matrix Rotation**: \`{"input": [[[1,2,3],[4,5,6],[7,8,9]]], "output": [[7,4,1],[8,5,2],[9,6,3]]}\`
- **Search Matrix**: \`{"input": [[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]], 5], "output": true}\`
- **Number of Islands**: \`{"input": [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], "output": 1}\`

**⚡ DYNAMIC PROGRAMMING:**
- **Fibonacci**: \`{"input": [10], "output": 55}\`
- **Climbing Stairs**: \`{"input": [3], "output": 3}\`
- **Coin Change**: \`{"input": [[1,3,4], 6], "output": 2}\`
- **House Robber**: \`{"input": [[2,7,9,3,1]], "output": 12}\`

**🔍 BACKTRACKING:**
- **Permutations**: \`{"input": [[1,2,3]], "output": [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]}\`
- **Combinations**: \`{"input": [4, 2], "output": [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]}\`
- **Subsets**: \`{"input": [[1,2,3]], "output": [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]}\`

**🎯 SLIDING WINDOW:**
- **Max Average**: \`{"input": [[1,12,-5,-6,50,3], 4], "output": 12.75}\`
- **Min Window**: \`{"input": ["ADOBECODEBANC", "ABC"], "output": "BANC"}\`
- **Longest Substring**: \`{"input": ["pwwkew"], "output": 3}\`

**🔧 STACK/QUEUE:**
- **Valid Parentheses**: \`{"input": ["()[]{}"], "output": true}\`
- **Next Greater**: \`{"input": [[1,3,2,4]], "output": [3,4,4,-1]}\`
- **Daily Temperatures**: \`{"input": [[73,74,75,71,69,72,76,73]], "output": [1,1,4,2,1,1,0,0]}\`

LANGUAGE-SPECIFIC FUNCTION DETECTION:

**JAVA FUNCTIONS:**
- Pattern: \`(public|private|protected)? (static)? ReturnType functionName(params)\`
- Skip: main, constructors, toString, equals, hashCode

**PYTHON FUNCTIONS:**  
- Pattern: \`def function_name(params):\`
- Skip: __init__, __str__, __main__, dunder methods

**C++ FUNCTIONS:**
- Pattern: \`ReturnType functionName(params) { }\`
- Skip: main, constructors, destructors (~name)

**C FUNCTIONS:**
- Pattern: \`returnType functionName(params) { }\`
- Skip: main

**GO FUNCTIONS:**
- Pattern: \`func functionName(params) returnType { }\`
- Skip: main, init

**JAVASCRIPT FUNCTIONS:**
- Pattern: \`function functionName(params) { }\` or \`const functionName = (params) => {}\`
- Skip: main, console methods, require, module exports

**TYPESCRIPT FUNCTIONS:**
- Pattern: \`function functionName(params): returnType { }\` or \`const functionName = (params): returnType => {}\`
- Skip: main, console methods, import/export statements

🎯 **INTELLIGENT PATTERN MATCHING:**

Based on the detected function signature, automatically identify the most likely LeetCode pattern:

1. **Function Name Analysis**: 
   - Contains "sum" → Array sum problems
   - Contains "search" → Binary search problems  
   - Contains "reverse" → Linked list problems
   - Contains "valid" → Validation problems
   - Contains "max/min" → Optimization problems

2. **Parameter Analysis**:
   - \`(array, target)\` → Two Sum family
   - \`(ListNode)\` → Linked List operations
   - \`(TreeNode)\` → Binary Tree operations  
   - \`(matrix)\` → 2D array problems
   - \`(string)\` → String manipulation

3. **Return Type Analysis**:
   - \`int[]\` → Index-based results
   - \`boolean\` → Validation/check problems
   - \`ListNode\` → Linked list manipulation
   - \`List<List<>>\` → Level-order/grouping results

STRICT REQUIREMENTS:
1. **Signature-Based Generation**: Generate test cases based on what the function SHOULD do, not what the user implemented
2. **Input Wrapping**: ALL function parameters wrapped in array: func(a,b) → [a,b]
3. **Pattern Compliance**: Test cases must match standard LeetCode patterns for the detected algorithm
4. **Edge Case Coverage**: Include empty inputs, boundary conditions, and corner cases
5. **Data Type Accuracy**: Maintain exact LeetCode data types and formats

TEST CASE GENERATION STRATEGY:
1. **Standard Case (50%)**: Classic example for the detected pattern
2. **Edge Case (30%)**: Boundary conditions (empty, single element, extremes)
3. **Complex Case (20%)**: Larger input that thoroughly tests the algorithm

RESPONSE FORMAT:
Return ONLY valid JSON. Either:
\`[{"input": [...], "output": ...}, {"input": [...], "output": ...}, {"input": [...], "output": ...}]\`

OR if no function found:
\`{"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}\`

🔥 **REMEMBER**: Generate test cases for what the function SHOULD do based on its signature and detected pattern, NOT what the user's potentially incorrect code does!
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
  const javaPattern = /(public|private|protected)?\s*(static)?\s*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)\s*\(([^)]*)\)/g;
  
  const matches = Array.from(code.matchAll(javaPattern));
  
  for (const match of matches) {
    const [fullMatch, , , returnType, functionName, paramString] = match;
    
    // Enhanced exclusion list
    const excludedFunctions = [
      'main', 'class', 'if', 'for', 'while', 'switch', 'try', 'catch',
      'toString', 'equals', 'hashCode', 'compareTo', 'clone', 'finalize',
      'wait', 'notify', 'notifyAll', 'getClass'
    ];
    
    if (excludedFunctions.includes(functionName.toLowerCase())) {
      continue;
    }
    
    // Skip constructors
    const classNameMatch = code.match(/class\s+(\w+)/);
    if (classNameMatch && classNameMatch[1] === functionName) {
      continue;
    }
    
    // Parse parameters with enhanced type detection
    const parameters = paramString.trim() ? 
      paramString.split(',').map(p => p.trim()) : [];
    
    // Validate function has body
    const functionStart = match.index || 0;
    const afterMatch = code.substring(functionStart + match[0].length).trim();
    
    if (afterMatch.startsWith('{')) {
      const signature = {
        name: functionName,
        parameters: parameters,
        returnType,
        language: 'java',
        isValid: true,
        algorithmPattern: detectAlgorithmPattern(functionName, parameters, returnType, code),
        dataStructureTypes: detectDataStructureTypes(parameters, returnType)
      };
      
      console.log(`✅ Found Java function: ${functionName} with pattern: ${signature.algorithmPattern}`);
      return signature;
    }
  }
  
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
