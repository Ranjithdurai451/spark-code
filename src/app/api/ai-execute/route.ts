import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
};

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true";
const JUDGE0_KEY = process.env.JUDGE0_KEY!;

interface CodeAnalysis {
  functionName: string;
  parameters: string[];
  returnType: string;
  isStatic: boolean;
  language: string;
  dataStructures: Set<string>;
  needsConversion: boolean;
  algorithmPattern: string;
}

// Enhanced LEETCODE WRAPPER PROMPT
const LEETCODE_WRAPPER_PROMPT = `
🚨 **MAIN RULES - READ CAREFULLY:**
- You are an expert LeetCode wrapper code generator.
- ALWAYS generate wrapper code based ONLY on the DETECTED ALGORITHM PATTERN and FUNCTION SIGNATURE, NOT the user's code implementation.
- The user's code may be incomplete, incorrect, or buggy.
- **DO NOT read or use any code comments. Comments are unrelated to the problem and must be ignored.**
- Your job is to:
  1. Identify the INTENDED algorithm pattern from the function name and signature.
  2. Generate CORRECT wrapper code that handles input/output conversion for that specific algorithmic pattern.
  3. IGNORE the user's implementation logic and all comments—focus only on what the function SHOULD do based on its signature.
  4. **NEVER modify the user's function code - include it EXACTLY as provided**

**IMPORTANT:** You MUST identify a clear, callable function in the code. If no function is found, respond with:
\`{"error": "NO_FUNCTION_FOUND", "message": "No callable function detected in the provided code"}\`

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

🎯 **INPUT/OUTPUT CONVERSION PATTERNS:**

**🔢 ARRAY PROBLEMS:**
- **Input**: \`[array, target]\` → Convert to: \`function(array, target)\`
- **Output**: \`number/array\` → Return as-is or convert indices
- **Two Sum**: \`{"input": [[2,7,11,15], 9], "output": [0,1]}\`
- **Binary Search**: \`{"input": [[-1,0,3,5,9,12], 9], "output": 4}\`
- **Max Subarray**: \`{"input": [[-2,1,-3,4,-1,2,1,-5,4]], "output": 6}\`

**🔗 LINKED LIST PROBLEMS:**
- **Input**: \`[array]\` → Convert to: \`ListNode chain\`
- **Output**: \`ListNode\` → Convert to: \`array representation\`
- **Reverse List**: \`{"input": [[1,2,3,4,5]], "output": [5,4,3,2,1]}\`
- **Merge Lists**: \`{"input": [[1,2,4], [1,3,4]], "output": [1,1,2,3,4,4]}\`
- **Cycle Detection**: \`{"input": [[3,2,0,-4], 1], "output": true}\`

**🌳 BINARY TREE PROBLEMS:**
- **Input**: \`[array]\` → Convert to: \`TreeNode structure (level-order with nulls)\`
- **Output**: \`TreeNode/array\` → Convert to: \`array representation\`
- **Inorder Traversal**: \`{"input": [[1,null,2,3]], "output": [1,3,2]}\`
- **Tree Validation**: \`{"input": [[2,1,3]], "output": true}\`
- **Level Order**: \`{"input": [[3,9,20,null,null,15,7]], "output": [[3],[9,20],[15,7]]}\`

**🧮 STRING PROBLEMS:**
- **Input**: \`[string]\` or \`[string1, string2]\` → Pass directly as strings
- **Output**: \`boolean/number/string\` → Return as-is
- **Valid Parentheses**: \`{"input": ["()[]{}"], "output": true}\`
- **Palindrome Check**: \`{"input": ["racecar"], "output": true}\`
- **Anagram Check**: \`{"input": ["anagram", "nagaram"], "output": true}\`

**📊 MATRIX PROBLEMS:**
- **Input**: \`[matrix]\` or \`[matrix, target]\` → Convert to 2D array
- **Output**: \`matrix/boolean/number\` → Return appropriate format
- **Matrix Rotation**: \`{"input": [[[1,2,3],[4,5,6],[7,8,9]]], "output": [[7,4,1],[8,5,2],[9,6,3]]}\`
- **Search Matrix**: \`{"input": [[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]], 5], "output": true}\`
- **Number of Islands**: \`{"input": [[["1","1","1","1","0"],["1","1","0","1","0"]]], "output": 1}\`

**⚡ DYNAMIC PROGRAMMING:**
- **Input**: \`[number]\` or \`[array, target]\` → Pass parameters directly
- **Output**: \`number\` → Return as-is
- **Fibonacci**: \`{"input": [10], "output": 55}\`
- **Climbing Stairs**: \`{"input": [3], "output": 3}\`
- **Coin Change**: \`{"input": [[1,3,4], 6], "output": 2}\`

**🔍 BACKTRACKING:**
- **Input**: \`[array]\` or \`[n, k]\` → Pass parameters directly
- **Output**: \`array of arrays\` → Return nested arrays as-is
- **Permutations**: \`{"input": [[1,2,3]], "output": [[1,2,3],[1,3,2],...]}\`
- **Combinations**: \`{"input": [4, 2], "output": [[1,2],[1,3],...]}\`

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

🔥 **CRITICAL REQUIREMENTS:**
1. **NEVER modify the user's function code - include it EXACTLY as provided**
2. **Generate wrapper based on function signature and detected pattern, NOT implementation**
3. **Handle all input/output conversions based on standard LeetCode formats**
4. **NEVER use or reference any code comments**
5. **Return complete, executable code with proper main/test execution**

DETECTED FUNCTION ANALYSIS:
- Function Name: {function_name}
- Parameters: {function_params}
- Return Type: {return_type}
- Language: {language}
- Algorithm Pattern: {algorithm_pattern}
- Test Input: {test_input}
- Expected Output: {expected_output}

Generate complete executable {language} code that:
1. Includes user's code EXACTLY as provided (DO NOT MODIFY)
2. Adds proper data structure conversion helpers if needed
3. Converts test input to proper function parameters
4. Calls the user's function
5. Converts output to expected format
6. Prints the result (no extra text, just the result)
`;

// Enhanced code analysis with better regex patterns
function analyzeUserCode(code: string, language: string): CodeAnalysis {
  const analysis: CodeAnalysis = {
    functionName: "",
    parameters: [],
    returnType: "",
    isStatic: false,
    language: language.toLowerCase(),
    dataStructures: new Set<string>(),
    needsConversion: false,
    algorithmPattern: "standard"
  };

  console.log(`🔍 Analyzing ${language} code:`, code.substring(0, 200) + "...");

  try {
    switch (language.toLowerCase()) {
      case 'java':
        return analyzeJavaCode(code, analysis);
      case 'python':
        return analyzePythonCode(code, analysis);
      case 'cpp':
        return analyzeCppCode(code, analysis);
      case 'c':
        return analyzeCCode(code, analysis);
      case 'go':
        return analyzeGoCode(code, analysis);
      case 'javascript':
        return analyzeJavaScriptCode(code, analysis);
      case 'typescript':
        return analyzeTypeScriptCode(code, analysis);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  } catch (error) {
    console.error(`❌ Analysis failed for ${language}:`, error);
    return analysis;
  }
}

// Improved Java code analysis with more robust patterns
function analyzeJavaCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  // Enhanced patterns to catch various Java method signatures
  const methodPatterns = [
    // Full method signature: (access) (static) returnType methodName(params) {
    /(public|private|protected)?\s*(static)?\s*([\w<>\[\]\s,]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Method without access modifier: (static) returnType methodName(params) {
    /(static)?\s*([\w<>\[\]\s,]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Simple pattern: returnType methodName(params) {
    /([\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g
  ];

  for (const pattern of methodPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      let access, staticKeyword, returnType, methodName, params;
      
      if (match.length === 6) {
        [, access, staticKeyword, returnType, methodName, params] = match;
      } else if (match.length === 5) {
        [, staticKeyword, returnType, methodName, params] = match;
      } else {
        [, returnType, methodName, params] = match;
      }
      
      console.log(`🎯 Found Java method: ${methodName}`, { returnType, params });
      
      if (methodName && !isExcludedJavaMethod(methodName)) {
        analysis.functionName = methodName;
        analysis.returnType = returnType?.trim() || "";
        analysis.isStatic = !!staticKeyword;
        analysis.parameters = params ? params.split(',').map((p: string) => p.trim()).filter((p: string) => p) : [];
        
        // Enhanced data structure detection
        const signature = `${returnType} ${params} ${code}`;
        detectDataStructures(signature, analysis);
        detectAlgorithmPattern(methodName, signature, code, analysis);
        
        console.log(`✅ Java function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid Java function found in code`);
  return analysis;
}

// Enhanced Python analysis with better pattern matching
function analyzePythonCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPatterns = [
    // Function with type hints: def func(params) -> returnType:
    /def\s+(\w+)\s*\(([^)]*)\)\s*->\s*([^:]+):/g,
    // Function without type hints: def func(params):
    /def\s+(\w+)\s*\(([^)]*)\):/g,
    // Class methods: def func(self, params):
    /def\s+(\w+)\s*\(\s*self\s*(?:,\s*([^)]*))?\)\s*(?:->\s*([^:]+))?:/g
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const [, functionName, params, returnType] = match;
      
      console.log(`🎯 Found Python function: ${functionName}`, { params, returnType });
      
      if (!isExcludedPythonMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = params ? params.split(',')
          .map((p: string) => {
            // Handle type hints: param: type = default
            const cleanParam = p.trim().split(':')[0].trim().split('=')[0].trim();
            return cleanParam;
          })
          .filter((p: string) => p && p !== 'self') : [];
        
        const signature = `${returnType || ''} ${params} ${code}`;
        detectDataStructures(signature, analysis);
        detectDataStructures(code, analysis);
        detectAlgorithmPattern(functionName, signature, code, analysis);
        
        console.log(`✅ Python function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid Python function found in code`);
  return analysis;
}

// Enhanced C++ analysis
function analyzeCppCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPatterns = [
    // Template functions: template<...> returnType func(params) {
    /template\s*<[^>]*>\s*([\w<>\*&:\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
    // Regular functions: returnType func(params) {
    /([\w<>\*&:\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
    // Member functions: Class::func(params) {
    /(\w+)::\s*(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      let returnType, functionName, params;
      
      if (match.length === 4 && match[0].includes('::')) {
        [, , functionName, params] = match;
        returnType = ""; // Member function, return type may be implicit
      } else {
        [, returnType, functionName, params] = match;
      }
      
      console.log(`🎯 Found C++ function: ${functionName}`, { returnType, params });
      
      if (!isExcludedCppMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = params ? params.split(',').map((p: string) => p.trim()).filter((p: string) => p) : [];
        
        const signature = `${returnType} ${params} ${code}`;
        detectDataStructures(signature, analysis);
        detectAlgorithmPattern(functionName, signature, code, analysis);
        
        console.log(`✅ C++ function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid C++ function found in code`);
  return analysis;
}

// Enhanced C analysis
function analyzeCCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPatterns = [
    // Standard C function: returnType func(params) {
    /([\w\*\s]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Function pointer: returnType (*func)(params) = 
    /([\w\*\s]+)\s*\(\*(\w+)\)\s*\(([^)]*)\)/g
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const [, returnType, functionName, params] = match;
      
      console.log(`🎯 Found C function: ${functionName}`, { returnType, params });
      
      if (!isExcludedCMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = returnType.trim();
        analysis.parameters = params ? params.split(',').map((p: string) => p.trim()).filter((p: string) => p) : [];
        
        const signature = `${returnType} ${params}`;
        detectDataStructures(signature, analysis);
        detectAlgorithmPattern(functionName, signature, code, analysis);
        
        console.log(`✅ C function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid C function found in code`);
  return analysis;
}

// Enhanced Go analysis
function analyzeGoCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPatterns = [
    // Regular function: func name(params) returnType {
    /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g,
    // Method: func (receiver) name(params) returnType {
    /func\s+\([^)]+\)\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g,
    // Function with multiple return values: func name(params) (returnTypes) {
    /func\s+(\w+)\s*\(([^)]*)\)\s*\(([^)]+)\)\s*\{/g
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const [, functionName, params, returnType] = match;
      
      console.log(`🎯 Found Go function: ${functionName}`, { params, returnType });
      
      if (!isExcludedGoMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = params ? params.split(',').map((p: string) => p.trim()).filter((p: string) => p) : [];
        
        const signature = `${returnType} ${params}`;
        detectDataStructures(signature, analysis);
        detectAlgorithmPattern(functionName, signature, code, analysis);
        
        console.log(`✅ Go function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid Go function found in code`);
  return analysis;
}

// Enhanced JavaScript analysis
function analyzeJavaScriptCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPatterns = [
    // Function declarations: function name(params) {}
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Function expressions: const name = function(params) {}
    /(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{/g,
    // Arrow functions: const name = (params) => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    // Arrow functions single param: const name = param => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>/g,
    // Class methods: methodName(params) {}
    /(\w+)\s*\(([^)]*)\)\s*\{/g
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const [, functionName, params] = match;
      
      console.log(`🎯 Found JavaScript function: ${functionName}`, { params });
      
      if (!isExcludedJavaScriptMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = ""; // JavaScript is dynamically typed
        analysis.parameters = params ? params.split(',').map((p: string) => p.trim()).filter((p: string) => p) : [];
        
        const signature = `${params} ${code}`;
        detectDataStructures(signature, analysis);
        detectDataStructures(code, analysis);
        detectAlgorithmPattern(functionName, signature, code, analysis);
        
        console.log(`✅ JavaScript function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid JavaScript function found in code`);
  return analysis;
}

// Enhanced TypeScript analysis
function analyzeTypeScriptCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPatterns = [
    // Function with return type: function name(params): returnType {}
    /function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g,
    // Arrow function with return type: const name = (params): returnType => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*:\s*([^=]+)\s*=>/g,
    // Function without return type: function name(params) {}
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Arrow function without return type: const name = (params) => {}
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    // Class methods with types: methodName(params): returnType {}
    /(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const [, functionName, params, returnType] = match;
      
      console.log(`🎯 Found TypeScript function: ${functionName}`, { params, returnType });
      
      if (!isExcludedTypeScriptMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = returnType?.trim() || "";
        analysis.parameters = params ? params.split(',')
          .map((p: string) => {
            // Handle type hints: param: type = default
            const cleanParam = p.trim().split(':')[0].trim().split('=')[0].trim();
            return cleanParam;
          })
          .filter((p: string) => p) : [];
        
        const signature = `${returnType || ''} ${params} ${code}`;
        detectDataStructures(signature, analysis);
        detectDataStructures(code, analysis);
        detectAlgorithmPattern(functionName, signature, code, analysis);
        
        console.log(`✅ TypeScript function detected:`, analysis);
        return analysis;
      }
    }
  }
  
  console.log(`❌ No valid TypeScript function found in code`);
  return analysis;
}

// Helper functions for exclusion lists
function isExcludedJavaMethod(name: string): boolean {
  const excluded = ['main', 'toString', 'equals', 'hashCode', 'compareTo', 'clone', 'class', 'if', 'for', 'while', 'public', 'private', 'protected', 'static', 'void', 'int', 'String'];
  return excluded.includes(name.toLowerCase());
}

function isExcludedPythonMethod(name: string): boolean {
  const excluded = ['main', '__init__', '__str__', '__repr__', '__eq__', '__hash__', '__len__', 'if', 'for', 'while', 'def', 'class'];
  return excluded.includes(name.toLowerCase()) || (name.startsWith('__') && name.endsWith('__'));
}

function isExcludedCppMethod(name: string): boolean {
  const excluded = ['main', 'operator', 'if', 'for', 'while', 'class', 'struct', 'template', 'namespace', 'using', 'include'];
  return excluded.includes(name.toLowerCase()) || name.startsWith('~') || name.includes('operator');
}

function isExcludedCMethod(name: string): boolean {
  const excluded = ['main', 'printf', 'scanf', 'malloc', 'free', 'if', 'for', 'while', 'struct', 'union', 'typedef'];
  return excluded.includes(name.toLowerCase());
}

function isExcludedGoMethod(name: string): boolean {
  const excluded = ['main', 'init', 'if', 'for', 'switch', 'func', 'var', 'const', 'type', 'package', 'import'];
  return excluded.includes(name.toLowerCase());
}

function isExcludedJavaScriptMethod(name: string): boolean {
  const excluded = ['main', 'console', 'if', 'for', 'while', 'require', 'module', 'exports', 'function', 'var', 'let', 'const'];
  return excluded.includes(name.toLowerCase());
}

function isExcludedTypeScriptMethod(name: string): boolean {
  const excluded = ['main', 'console', 'if', 'for', 'while', 'require', 'module', 'exports', 'import', 'export', 'function', 'var', 'let', 'const', 'type', 'interface', 'class'];
  return excluded.includes(name.toLowerCase());
}

// Enhanced data structure detection
function detectDataStructures(signature: string, analysis: CodeAnalysis): void {
  const sigLower = signature.toLowerCase();
  
  // Linked List detection
  if (sigLower.includes('listnode') || sigLower.includes('linkedlist') || sigLower.includes('list<')) {
    analysis.dataStructures.add('ListNode');
    analysis.needsConversion = true;
  }
  
  // Binary Tree detection
  if (sigLower.includes('treenode') || sigLower.includes('binarytree') || sigLower.includes('tree')) {
    analysis.dataStructures.add('TreeNode');
    analysis.needsConversion = true;
  }
  
  // Graph detection
  if (sigLower.includes('graphnode') || sigLower.includes('graph') || sigLower.includes('adjacency')) {
    analysis.dataStructures.add('GraphNode');
    analysis.needsConversion = true;
  }
  
  // Matrix detection
  if (sigLower.includes('matrix') || sigLower.includes('grid') || sigLower.includes('int[][]') || sigLower.includes('vector<vector')) {
    analysis.dataStructures.add('Matrix');
  }
}

// Enhanced algorithm pattern detection
function detectAlgorithmPattern(funcName: string, signature: string, code: string, analysis: CodeAnalysis): void {
  const name = funcName.toLowerCase();
  const sig = signature.toLowerCase();
  const codeStr = code.toLowerCase();
  
  // Two Sum family
  if (name.includes('twosum') || name.includes('two_sum') || name.includes('twosum')) {
    analysis.algorithmPattern = 'two_sum';
  }
  // Binary Search
  else if (name.includes('search') || name.includes('binarysearch') || codeStr.includes('binary search') || codeStr.includes('left <= right')) {
    analysis.algorithmPattern = 'binary_search';
  }
  // Linked List operations
  else if (analysis.dataStructures.has('ListNode') || name.includes('reverse') || name.includes('merge') || name.includes('cycle')) {
    analysis.algorithmPattern = 'linked_list';
  }
  // Binary Tree operations
  else if (analysis.dataStructures.has('TreeNode') || name.includes('traversal') || name.includes('inorder') || name.includes('preorder') || name.includes('postorder')) {
    analysis.algorithmPattern = 'binary_tree';
  }
  // Dynamic Programming
  else if (name.includes('dp') || name.includes('dynamic') || name.includes('fib') || name.includes('climb') || codeStr.includes('memo')) {
    analysis.algorithmPattern = 'dynamic_programming';
  }
  // Matrix operations
  else if (analysis.dataStructures.has('Matrix') || name.includes('rotate') || name.includes('spiral') || name.includes('island')) {
    analysis.algorithmPattern = 'matrix';
  }
  // String operations
  else if (sig.includes('string') || name.includes('valid') || name.includes('palindrome') || name.includes('anagram')) {
    analysis.algorithmPattern = 'string_processing';
  }
  // Backtracking
  else if (name.includes('permut') || name.includes('combin') || name.includes('subset') || codeStr.includes('backtrack')) {
    analysis.algorithmPattern = 'backtracking';
  }
  // Sliding Window
  else if (name.includes('window') || name.includes('substring') || name.includes('subarray')) {
    analysis.algorithmPattern = 'sliding_window';
  }
  // Stack/Queue
  else if (name.includes('stack') || name.includes('queue') || name.includes('parenthes') || name.includes('bracket')) {
    analysis.algorithmPattern = 'stack_queue';
  }
  // Default
  else {
    analysis.algorithmPattern = 'standard';
  }
}

// Enhanced wrapper prompt builder with comprehensive LeetCode format knowledge
function buildWrapperPrompt({ userCode, language, testCase, analysis }: {
  userCode: string;
  language: string;
  testCase: { input: any[]; output: any };
  analysis: CodeAnalysis;
}): string {
  return LEETCODE_WRAPPER_PROMPT
    .replace(/{function_name}/g, analysis.functionName || 'solution')
    .replace(/{function_params}/g, analysis.parameters.join(', '))
    .replace(/{return_type}/g, analysis.returnType || 'auto')
    .replace(/{language}/g, language.toLowerCase())
    .replace(/{algorithm_pattern}/g, analysis.algorithmPattern)
    .replace(/{test_input}/g, JSON.stringify(testCase.input))
    .replace(/{expected_output}/g, JSON.stringify(testCase.output)) +
    `\n\nUSER CODE TO INCLUDE (DO NOT MODIFY):\n\`\`\`${language}\n${userCode}\n\`\`\`\n\nTEST CASE TO HANDLE:\nInput: ${JSON.stringify(testCase.input)}\nExpected Output: ${JSON.stringify(testCase.output)}`;
}

// Enhanced code extraction with better language detection
function extractCode(aiResponse: string, language: string = ''): string {
  const lang = language.toLowerCase();
  
  // Language-specific patterns with aliases
  const patterns = [
    // Exact language match
    new RegExp(`\`\`\`${lang}\\s*([\\s\\S]*?)\`\`\``, 'i'),
    // Language aliases
    ...(lang === 'cpp' ? [/```c\+\+\s*([\s\S]*?)```/i, /```cpp\s*([\s\S]*?)```/i] : []),
    ...(lang === 'javascript' ? [/```js\s*([\s\S]*?)```/i, /```javascript\s*([\s\S]*?)```/i] : []),
    ...(lang === 'typescript' ? [/```ts\s*([\s\S]*?)```/i, /```typescript\s*([\s\S]*?)```/i] : []),
    ...(lang === 'python' ? [/```py\s*([\s\S]*?)```/i, /```python\s*([\s\S]*?)```/i] : []),
    // Generic code block
    /```\s*([\s\S]*?)```/
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = pattern.exec(aiResponse);
    if (match && match[1]) {
      const extractedCode = match[1].trim();
      if (extractedCode.length > 10) { // Minimum viable code length
        return extractedCode;
      }
    }
  }

  // Fallback: clean response
  return aiResponse
    .replace(/```[\s\S]*?```/g, '')
    .replace(/```/g, '')
    .trim();
}

// Enhanced wrapper code generation with better error handling
async function buildExecutableCode(userCode: string, language: string, testCase: any, analysis: CodeAnalysis): Promise<string> {
  try {
    console.log(`🤖 Generating wrapper code for ${language}...`);
    
    const prompt = buildWrapperPrompt({ userCode, language, testCase, analysis });
    
    const ai = await generateText({
      model: gemini("gemini-2.0-flash"),
      prompt,
      temperature: 0.0,
      maxTokens: 3000
    });
    
    let code = extractCode(ai.text, language);
    
    console.log(`📝 Generated code (${code.length} chars):`, code.substring(0, 300) + "...");
    
    // Validation checks
    const funcNameLower = analysis.functionName.toLowerCase();
    const codeLower = code.toLowerCase();
    
    // Check if user code/function is included
    if (!codeLower.includes(funcNameLower) && !codeLower.includes(userCode.substring(0, 50).toLowerCase())) {
      console.warn("⚠️ AI didn't include user code properly, using enhanced fallback");
      return generateEnhancedFallback(userCode, language, testCase, analysis);
    }
    
    // Language-specific validation
    if (!validateGeneratedCode(code, language, analysis)) {
      console.warn("⚠️ Generated code failed validation, using enhanced fallback");
      return generateEnhancedFallback(userCode, language, testCase, analysis);
    }
    
    return code;
  } catch (err) {
    console.error("❌ AI generation failed:", err);
    return generateEnhancedFallback(userCode, language, testCase, analysis);
  }
}

// Enhanced validation for generated code
function validateGeneratedCode(code: string, language: string, analysis: CodeAnalysis): boolean {
  const codeLower = code.toLowerCase();
  
  switch (language.toLowerCase()) {
    case 'java':
      return codeLower.includes('public class') && codeLower.includes('public static void main');
    case 'python':
      return codeLower.includes('if __name__') || codeLower.includes('print(');
    case 'cpp':
      return codeLower.includes('#include') && codeLower.includes('int main');
    case 'c':
      return codeLower.includes('#include') && codeLower.includes('int main');
    case 'go':
      return codeLower.includes('package main') && codeLower.includes('func main');
    case 'javascript':
      return codeLower.includes('console.log') || codeLower.includes('function');
    case 'typescript':
      return codeLower.includes('console.log') || codeLower.includes('function');
    default:
      return true;
  }
}

// Enhanced fallback with better data structure support
function generateEnhancedFallback(userCode: string, language: string, testCase: any, analysis: CodeAnalysis): string {
  const funcName = analysis.functionName || 'solution';
  const input = testCase.input;
  const needsConversion = analysis.needsConversion;
  
  console.log(`🔧 Using enhanced fallback generator for ${language}`, {
    needsConversion,
    dataStructures: Array.from(analysis.dataStructures),
    algorithmPattern: analysis.algorithmPattern
  });
  
  switch (language.toLowerCase()) {
    case 'java':
      return generateJavaWrapper(userCode, funcName, input, analysis);
    case 'python':
      return generatePythonWrapper(userCode, funcName, input, analysis);
    case 'cpp':
      return generateCppWrapper(userCode, funcName, input, analysis);
    case 'c':
      return generateCWrapper(userCode, funcName, input, analysis);
    case 'go':
      return generateGoWrapper(userCode, funcName, input, analysis);
    case 'javascript':
      return generateJavaScriptWrapper(userCode, funcName, input, analysis);
    case 'typescript':
      return generateTypeScriptWrapper(userCode, funcName, input, analysis);
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

// Enhanced Java wrapper generator with data structure support
function generateJavaWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  // Extract user imports if present
  const userImports: string[] = [];
  const importRegex = /^import\s+[\w.*]+;\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(userCode)) !== null) {
    userImports.push(match[0].trim());
  }

  // Remove user imports from userClassBody to avoid duplication
  let userClassBody = userCode.replace(importRegex, '').trim();

  // Always include java.util.* for helpers, but avoid duplicates
  const importsSet = new Set<string>(userImports);
  importsSet.add("import java.util.*;");

  // Data structure class definitions (ListNode, TreeNode, etc.)
  let dataStructureClasses = '';
  let helperMethods = '';

  if (analysis.dataStructures.has('ListNode')) {
    dataStructureClasses += `
    static class ListNode {
        int val;
        ListNode next;
        ListNode() {}
        ListNode(int val) { this.val = val; }
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }`;

    helperMethods += `
    static ListNode arrayToList(int[] arr) {
        if (arr == null || arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode current = head;
        for (int i = 1; i < arr.length; i++) {
            current.next = new ListNode(arr[i]);
            current = current.next;
        }
        return head;
    }

    static int[] listToArray(ListNode head) {
        List<Integer> result = new ArrayList<>();
        while (head != null) {
            result.add(head.val);
            head = head.next;
        }
        return result.stream().mapToInt(i -> i).toArray();
    }`;
  }

  if (analysis.dataStructures.has('TreeNode')) {
    dataStructureClasses += `
    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;
        TreeNode() {}
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }`;

    helperMethods += `
    static TreeNode arrayToTree(Integer[] arr) {
        if (arr == null || arr.length == 0 || arr[0] == null) return null;
        TreeNode root = new TreeNode(arr[0]);
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < arr.length) {
            TreeNode node = queue.poll();
            if (i < arr.length && arr[i] != null) {
                node.left = new TreeNode(arr[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < arr.length && arr[i] != null) {
                node.right = new TreeNode(arr[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }`;
  }

  // Find the user's class name (assume always public, any name)
  const classNameMatch = userClassBody.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
  const userClassName = classNameMatch ? classNameMatch[1] : "Solution";

  // Remove the user's public class wrapper, but keep the code inside
  if (classNameMatch) {
    userClassBody = userClassBody.replace(
      new RegExp(`public\\s+class\\s+${userClassName}\\s*\\{`),
      ''
    );
    userClassBody = userClassBody.replace(/}\s*$/, '');
  }

  // Prepare input and output conversion code
  const inputConversion = generateJavaInputConversion(input, analysis);
  const outputConversion = generateJavaOutputConversion(analysis);

  // Compose the final Java code
  return `
${Array.from(importsSet).join('\n')}

/**
 * LeetCode-like problem function for analysis and test generation.
 * 
 * Write your solution as a static method below.
 * 
 * Example:
 * // Given an array nums, return all unique triplets [nums[i], nums[j], nums[k]] such that i != j != k and nums[i] + nums[j] + nums[k] == 0.
 * // Input: [-1,0,1,2,-1,-4]
 * // Output: [[-1,-1,2],[-1,0,1]]
 */

public class ${userClassName} {
${dataStructureClasses}

${userClassBody}

${helperMethods}

    public static void main(String[] args) {
        ${userClassName} solution = new ${userClassName}();
        ${inputConversion}
        ${outputConversion}
    }
}
`.trim();
}

// Enhanced Python wrapper generator
function generatePythonWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  const hasListNode = analysis.dataStructures.has('ListNode');
  const hasTreeNode = analysis.dataStructures.has('TreeNode');
  
  let dataStructureClasses = '';
  let helperFunctions = '';
  
  if (hasListNode) {
    dataStructureClasses += `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next`;
    
    helperFunctions += `
def array_to_list(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    current = head
    for i in range(1, len(arr)):
        current.next = ListNode(arr[i])
        current = current.next
    return head

def list_to_array(head):
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result`;
  }
  
  if (hasTreeNode) {
    dataStructureClasses += `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right`;
    
    helperFunctions += `
def array_to_tree(arr):
    if not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        node = queue.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root`;
  }
  
  const inputConversion = generatePythonInputConversion(input, analysis);
  const outputConversion = generatePythonOutputConversion(analysis);
  
  return `
${dataStructureClasses}

${helperFunctions}

${userCode}

if __name__ == "__main__":
    ${inputConversion}
    ${outputConversion}
`.trim();
}

// Enhanced input conversion generators
function generateJavaInputConversion(input: any[], analysis: CodeAnalysis): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    
    if (analysis.dataStructures.has('ListNode') && Array.isArray(value)) {
      return `        int[] arr${i} = {${value.join(', ')}};
        ListNode ${varName} = arrayToList(arr${i});`;
    }
    
    if (analysis.dataStructures.has('TreeNode') && Array.isArray(value)) {
      const nullSafeArray = value.map((v: any) => v === null ? 'null' : v).join(', ');
      return `        Integer[] arr${i} = {${nullSafeArray}};
        TreeNode ${varName} = arrayToTree(arr${i});`;
    }
    
    if (Array.isArray(value)) {
      if (Array.isArray(value[0])) {
        // 2D array (matrix)
        const matrixStr = value.map((row: any[]) => `{${row.join(', ')}}`).join(', ');
        return `        int[][] ${varName} = {${matrixStr}};`;
      } else {
        // 1D array
        return `        int[] ${varName} = {${value.join(', ')}};`;
      }
    }
    
    if (typeof value === 'string') {
      return `        String ${varName} = "${value}";`;
    }
    
    if (typeof value === 'number') {
      return `        int ${varName} = ${value};`;
    }
    
    return `        Object ${varName} = ${JSON.stringify(value)};`;
  }).join('\n');
}

function generatePythonInputConversion(input: any[], analysis: CodeAnalysis): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    
    if (analysis.dataStructures.has('ListNode') && Array.isArray(value)) {
      return `    ${varName} = array_to_list(${JSON.stringify(value)})`;
    }
    
    if (analysis.dataStructures.has('TreeNode') && Array.isArray(value)) {
      return `    ${varName} = array_to_tree(${JSON.stringify(value)})`;
    }
    
    return `    ${varName} = ${JSON.stringify(value)}`;
  }).join('\n');
}

// Enhanced output conversion generators
function generateJavaOutputConversion(analysis: CodeAnalysis): string {
  const paramList = Array.from({length: 10}, (_, i) => `param${i}`).join(', ');
  const funcCall = `solution.${analysis.functionName}(${paramList})`;
  
  if (analysis.dataStructures.has('ListNode') && analysis.returnType.toLowerCase().includes('listnode')) {
    return `        ListNode result = ${funcCall};
        int[] output = listToArray(result);
        System.out.println(java.util.Arrays.toString(output));`;
  }
  
  if (analysis.returnType.toLowerCase().includes('int[]') || analysis.returnType.toLowerCase().includes('array')) {
    return `        int[] result = ${funcCall};
        System.out.println(java.util.Arrays.toString(result));`;
  }
  
  return `        Object result = ${funcCall};
        System.out.println(result);`;
}

function generatePythonOutputConversion(analysis: CodeAnalysis): string {
  const paramList = Array.from({length: 10}, (_, i) => `param${i}`).join(', ');
  const funcCall = `${analysis.functionName}(${paramList})`;
  
  if (analysis.dataStructures.has('ListNode')) {
    return `    result = ${funcCall}
    if isinstance(result, ListNode):
        result = list_to_array(result)
    print(result)`;
  }
  
  return `    result = ${funcCall}
    print(result)`;
}

// Additional wrapper generators for other languages
function generateCppWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  let includes = `#include <iostream>
#include <vector>
#include <string>`;
  
  let dataStructures = '';
  let helpers = '';
  
  if (analysis.dataStructures.has('ListNode')) {
    dataStructures += `
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};`;
    
    helpers += `
ListNode* arrayToList(std::vector<int>& arr) {
    if (arr.empty()) return nullptr;
    ListNode* head = new ListNode(arr[0]);
    ListNode* current = head;
    for (int i = 1; i < arr.size(); i++) {
        current->next = new ListNode(arr[i]);
        current = current->next;
    }
    return head;
}`;
  }
  
  const inputCode = generateCppInputs(input);
  
  return `
${includes}
using namespace std;

${dataStructures}

${userCode}

${helpers}

int main() {
${inputCode}
    auto result = ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')});
    cout << result << endl;
    return 0;
}`.trim();
}

function generateCWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  return `
#include <stdio.h>
#include <stdlib.h>

${userCode}

int main() {
    ${generateCInputs(input)}
    int result = ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')});
    printf("%d\\n", result);
    return 0;
}`.trim();
}

function generateGoWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  return `
package main
import "fmt"

${userCode}

func main() {
    ${generateGoInputs(input)}
    result := ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')})
    fmt.Println(result)
}`.trim();
}

function generateJavaScriptWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  let dataStructures = '';
  let helpers = '';
  
  if (analysis.dataStructures.has('ListNode')) {
    dataStructures += `
class ListNode {
    constructor(val, next) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}`;
    
    helpers += `
function arrayToList(arr) {
    if (!arr || arr.length === 0) return null;
    const head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}

function listToArray(head) {
    const result = [];
    while (head) {
        result.push(head.val);
        head = head.next;
    }
    return result;
}`;
  }
  
  const inputCode = generateJavaScriptInputs(input);
  const outputCode = analysis.dataStructures.has('ListNode') ? 
    `let result = ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')});
    if (result && typeof result === 'object' && result.val !== undefined) {
        result = listToArray(result);
    }
    console.log(JSON.stringify(result));` :
    `const result = ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')});
    console.log(JSON.stringify(result));`;
  
  return `
${dataStructures}

${helpers}

${userCode}

// Main execution
(function() {
${inputCode}
    ${outputCode}
})();
`.trim();
}

function generateTypeScriptWrapper(userCode: string, funcName: string, input: any[], analysis: CodeAnalysis): string {
  let dataStructures = '';
  let helpers = '';
  
  if (analysis.dataStructures.has('ListNode')) {
    dataStructures += `
class ListNode {
    val: number;
    next: ListNode | null;
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}`;
    
    helpers += `
function arrayToList(arr: number[]): ListNode | null {
    if (!arr || arr.length === 0) return null;
    const head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
}

function listToArray(head: ListNode | null): number[] {
    const result: number[] = [];
    while (head) {
        result.push(head.val);
        head = head.next;
    }
    return result;
}`;
  }
  
  const inputCode = generateTypeScriptInputs(input);
  const outputCode = analysis.dataStructures.has('ListNode') ? 
    `let result = ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')});
    if (result && typeof result === 'object' && (result as any).val !== undefined) {
        result = listToArray(result as ListNode);
    }
    console.log(JSON.stringify(result));` :
    `const result = ${funcName}(${input.map((_value: any, i: number) => `param${i}`).join(', ')});
    console.log(JSON.stringify(result));`;
  
  return `
${dataStructures}

${helpers}

${userCode}

// Main execution
(function(): void {
${inputCode}
    ${outputCode}
})();
`.trim();
}

// Enhanced input generators for fallback
function generateCppInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    if (Array.isArray(value)) {
      if (Array.isArray(value[0])) {
        // 2D vector
        const matrixStr = value.map((row: any[]) => `{${row.join(', ')}}`).join(', ');
        return `    vector<vector<int>> ${varName} = {${matrixStr}};`;
      } else {
        // 1D vector
        return `    vector<int> ${varName} = {${value.join(', ')}};`;
      }
    }
    if (typeof value === 'number') return `    int ${varName} = ${value};`;
    if (typeof value === 'string') return `    string ${varName} = "${value}";`;
    return `    auto ${varName} = ${value};`;
  }).join('\n');
}

function generateCInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    if (typeof value === 'number') return `    int ${varName} = ${value};`;
    return `    int ${varName} = ${value};`;
  }).join('\n');
}

function generateGoInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    if (Array.isArray(value)) {
      if (Array.isArray(value[0])) {
        // 2D slice
        const matrixStr = value.map((row: any[]) => `{${row.join(', ')}}`).join(', ');
        return `    ${varName} := [][]int{${matrixStr}}`;
      } else {
        // 1D slice
        return `    ${varName} := []int{${value.join(', ')}}`;
      }
    }
    if (typeof value === 'number') return `    ${varName} := ${value}`;
    if (typeof value === 'string') return `    ${varName} := "${value}"`;
    return `    ${varName} := ${value}`;
  }).join('\n');
}

function generateJavaScriptInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    return `    const ${varName} = ${JSON.stringify(value)};`;
  }).join('\n');
}

function generateTypeScriptInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    let type = 'any';
    
    if (Array.isArray(value)) {
      if (Array.isArray(value[0])) {
        type = 'number[][]';
      } else {
        type = typeof value[0] === 'number' ? 'number[]' : 
             typeof value[0] === 'string' ? 'string[]' : 'any[]';
      }
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'string') {
      type = 'string';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    }
    
    return `    const ${varName}: ${type} = ${JSON.stringify(value)};`;
  }).join('\n');
}

function forceMainClass(src: string): string {
  const re = /\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/;
  return re.test(src)
    ? src.replace(re, (_, name) =>
        name === "Main" ? `public class Main` : `public class Main`)
    : src;                       // no public class found → leave unchanged
}
// Enhanced Judge0 execution with retry logic
async function executeCode({ code, language }: { code: string; language: string }, retries = 2) {
  const langId = LANGUAGE_MAP[language.toLowerCase()];
  if (!langId) throw new Error("Unsupported language");

  console.log(`🚀 Executing ${language} code on Judge0 (attempt ${3 - retries}/3)...`);
  console.log(`📝 Code to execute (${code.length} chars):`, code.substring(0, 500) + "...");
const patchedCode =
    language.toLowerCase() === "java" ? forceMainClass(code) : code;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(JUDGE0_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": JUDGE0_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
          source_code: patchedCode,
          language_id: langId,
          stdin: "",
          expected_output: "",
          cpu_time_limit: 2,
          memory_limit: 128000
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Judge0 API Error: ${res.status} - ${errorText}`);
        
        if (attempt < retries && (res.status === 429 || res.status >= 500)) {
          console.log(`⏳ Retrying in ${(attempt + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
        
        throw new Error(`Judge0 API Error: ${res.status} - ${errorText}`);
      }

      const result = await res.json();
      console.log(`📊 Judge0 Response:`, {
        status: result.status?.description,
        time: result.time,
        memory: result.memory,
        stdout: result.stdout?.substring(0, 200),
        stderr: result.stderr?.substring(0, 200),
        compile_output: result.compile_output?.substring(0, 200)
      });

      return result;
    } catch (error) {
      console.error(`💥 Judge0 execution failed (attempt ${attempt + 1}):`, error);
      
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${(attempt + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        continue;
      }
      
      throw error;
    }
  }
}

// Enhanced output comparison with better handling
function compareOutputs(actual: string, expected: any): boolean {
  try {
    const actualTrim = actual.trim();
    
    // Handle different output formats
    if (typeof expected === 'boolean') {
      return actualTrim.toLowerCase() === expected.toString().toLowerCase();
    }
    
    if (typeof expected === 'number') {
      const actualNum = parseFloat(actualTrim);
      return !isNaN(actualNum) && Math.abs(actualNum - expected) < 1e-9;
    }
    
    if (typeof expected === 'string') {
      return actualTrim === expected.trim();
    }
    
    if (Array.isArray(expected)) {
      // Handle array outputs
      const expectedStr = JSON.stringify(expected);
      
      // Direct match
      if (actualTrim === expectedStr) return true;
      
      // Handle different spacing: [1,2,3] vs [1, 2, 3]
      const normalizedActual = actualTrim.replace(/\s+/g, '').replace(/'/g, '"');
      const normalizedExpected = expectedStr.replace(/\s+/g, '');
      if (normalizedActual === normalizedExpected) return true;
      
      // Try parsing as JSON
      try {
        const actualParsed = JSON.parse(actualTrim);
        return JSON.stringify(actualParsed) === expectedStr;
      } catch {
        // Handle array-like strings without brackets
        if (!actualTrim.startsWith('[') && !actualTrim.startsWith('{')) {
          const elements = actualTrim.split(/[,\s]+/).filter(e => e);
          const parsedElements = elements.map(e => {
            const num = parseFloat(e);
            return isNaN(num) ? e.replace(/"/g, '') : num;
          });
          return JSON.stringify(parsedElements) === expectedStr;
        }
      }
    }
    
    // Handle object outputs
    if (typeof expected === 'object' && expected !== null) {
      try {
        const actualParsed = JSON.parse(actualTrim);
        return JSON.stringify(actualParsed) === JSON.stringify(expected);
      } catch {
        return false;
      }
    }
    
    // Fallback to string comparison
    return actualTrim === String(expected).trim();
    
  } catch (error) {
    console.error('❌ Output comparison error:', error);
    return false;
  }
}

// Enhanced error message formatting
function formatError(error: string, language: string): string {
  // Common error patterns and their user-friendly explanations
  const errorPatterns = [
    {
      pattern: /compilation terminated/i,
      message: "Code compilation failed. Check your syntax and ensure all required imports/includes are present."
    },
    {
      pattern: /cannot find symbol/i,
      message: "Variable or method not found. Check spelling and ensure all variables are declared."
    },
    {
      pattern: /undefined reference/i,
      message: "Function or variable not defined. Make sure all functions are properly declared."
    },
    {
      pattern: /segmentation fault/i,
      message: "Memory access error. Check for null pointer access or array bounds violations."
    },
    {
      pattern: /index out of bounds/i,
      message: "Array index error. Ensure you're not accessing beyond array boundaries."
    },
    {
      pattern: /null pointer/i,
      message: "Null reference error. Check for null values before accessing object properties."
    },
    {
      pattern: /syntax error/i,
      message: "Syntax error detected. Review your code structure and punctuation."
    },
    {
      pattern: /time limit exceeded/i,
      message: "Code execution took too long. Consider optimizing your algorithm or check for infinite loops."
    },
    {
      pattern: /runtime error/i,
      message: "Runtime error occurred during execution. Check your logic and handle edge cases."
    }
  ];

  for (const { pattern, message } of errorPatterns) {
    if (pattern.test(error)) {
      return `${message}\n\nOriginal error: ${error.substring(0, 200)}`;
    }
  }

  return error.length > 300 ? error.substring(0, 300) + "..." : error;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log(`🎯 Starting enhanced code execution request...`);
    
    const { code, language = 'java', testCase } = await req.json();
    
    // Enhanced validation with detailed logging
    if (!LANGUAGE_MAP[language.toLowerCase()]) {
      console.log(`❌ Unsupported language: ${language}`);
      return NextResponse.json({
        error: `Unsupported language: ${language}`,
        supported: Object.keys(LANGUAGE_MAP),
        details: `Language '${language}' is not supported. Please use one of: ${Object.keys(LANGUAGE_MAP).join(', ')}`,
        suggestions: [
          "Check the language spelling",
          "Use lowercase language names",
          "Supported languages: " + Object.keys(LANGUAGE_MAP).join(', ')
        ]
      }, { status: 400 });
    }

    if (!code || !testCase || !testCase.input || testCase.output === undefined) {
      console.log(`❌ Missing required fields:`, { 
        hasCode: !!code, 
        hasTestCase: !!testCase, 
        hasInput: !!testCase?.input, 
        hasOutput: testCase?.output !== undefined 
      });
      return NextResponse.json({
        error: "Missing required fields: code, testCase with input and output",
        details: "Please provide code and testCase with input and output fields",
        received: {
          code: !!code,
          testCase: !!testCase,
          input: !!testCase?.input,
          output: testCase?.output !== undefined
        },
        example: {
          code: "function twoSum(nums, target) { /* your code */ }",
          language: "javascript",
          testCase: {
            input: [[2,7,11,15], 9],
            output: [0,1]
          }
        }
      }, { status: 400 });
    }

    console.log(`✅ Processing enhanced code execution:`, {
      language,
      codeLength: code.length,
      testInput: testCase.input,
      expectedOutput: testCase.output,
      timestamp: new Date().toISOString()
    });

    // Enhanced code analysis with detailed logging
    const analysis = analyzeUserCode(code, language);
    
    if (!analysis.functionName) {
      console.log(`❌ No function detected in code`);
      
      // Provide language-specific guidance
      const languageGuidance: Record<string, string[]> = {
        java: [
          "Ensure your function is inside a class",
          "Use format: public ReturnType functionName(params) { }",
          "Avoid using 'main' as the function name"
        ],
        python: [
          "Use format: def function_name(params):",
          "Avoid using __main__ or dunder methods as function names",
          "Make sure indentation is correct"
        ],
        cpp: [
          "Use format: returnType functionName(params) { }",
          "Include necessary headers like #include <iostream>",
          "Avoid using 'main' as the function name"
        ],
        javascript: [
          "Use format: function functionName(params) { }",
          "Or: const functionName = (params) => { }",
          "Avoid using 'main' or console methods as function names"
        ],
        typescript: [
          "Use format: function functionName(params): returnType { }",
          "Or: const functionName = (params): returnType => { }",
          "Include proper type annotations"
        ]
      };
      
      return NextResponse.json({
        error: "No valid function found in the code",
        details: `Could not detect a testable function in ${language} code. Make sure your code contains a complete function definition.`,
        suggestions: languageGuidance[language.toLowerCase()] || [
          "Ensure your function has proper syntax for the language",
          "Check that the function is not named 'main' or other excluded names",
          "Verify the function has a complete signature with parameters and body"
        ],
        analysisDebug: process.env.NODE_ENV === 'development' ? {
          detectedFunctions: "None found",
          codePreview: code.substring(0, 200) + "..."
        } : undefined
      }, { status: 400 });
    }
    
    console.log(`🎉 Enhanced Function Analysis Complete:`, {
      name: analysis.functionName,
      language: analysis.language,
      parameters: analysis.parameters.length,
      parameterNames: analysis.parameters,
      returnType: analysis.returnType,
      dataStructures: Array.from(analysis.dataStructures),
      algorithmPattern: analysis.algorithmPattern,
      needsConversion: analysis.needsConversion,
      isStatic: analysis.isStatic
    });

    // Generate wrapper code with enhanced error handling
    let executableCode: string;
    try {
      executableCode = await buildExecutableCode(code, language, testCase, analysis);
      console.log(`✅ Generated wrapper code successfully (${executableCode.length} chars)`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Generated executable code preview:", executableCode.substring(0, 500) + "...");
      }
    } catch (wrapperError: any) {
      console.error("❌ Wrapper generation failed:", wrapperError);
      return NextResponse.json({
        error: "Failed to generate executable wrapper code",
        details: wrapperError.message,
        suggestions: [
          "Check if your function signature is properly formatted",
          "Ensure all required data structures are properly defined",
          "Verify the function parameters match the test case input format"
        ],
        functionAnalysis: {
          detectedFunction: analysis.functionName,
          parameters: analysis.parameters,
          algorithmPattern: analysis.algorithmPattern
        }
      }, { status: 500 });
    }

    // Execute code on Judge0 with retry logic
    let result: any;
    try {
      result = await executeCode({ code: executableCode, language });
      console.log(`🎊 Judge0 execution completed:`, {
        status: result.status?.description,
        statusId: result.status?.id,
        time: result.time,
        memory: result.memory,
        hasOutput: !!result.stdout,
        hasError: !!(result.stderr || result.compile_output)
      });
    } catch (executionError: any) {
      console.error("❌ Judge0 execution failed:", executionError);
      return NextResponse.json({
        error: "Code execution failed on Judge0",
        details: executionError.message,
        suggestions: [
          "Check if the Judge0 service is available",
          "Verify your code compiles without errors",
          "Ensure the generated wrapper code is valid"
        ],
        retryable: executionError.message.includes('429') || executionError.message.includes('50')
      }, { status: 503 });
    }

    // Enhanced result processing
    let actualOutput = "";
    let error = null;
    let executionStatus = "completed";

    // Process compilation errors
    if (result.compile_output?.trim()) {
      error = formatError(`Compilation Error: ${result.compile_output}`, language);
      executionStatus = "compilation_error";
      console.log(`❌ Compilation Error:`, result.compile_output.substring(0, 200));
    }
    // Process runtime errors
    else if (result.stderr?.trim()) {
      error = formatError(`Runtime Error: ${result.stderr}`, language);
      executionStatus = "runtime_error";
      console.log(`❌ Runtime Error:`, result.stderr.substring(0, 200));
    }
    // Process successful execution
    else if (result.stdout) {
      actualOutput = result.stdout.trim();
      executionStatus = "success";
      console.log(`✅ Got output:`, actualOutput.substring(0, 200));
    }
    // Handle no output
    else {
      error = "No output produced by the function";
      executionStatus = "no_output";
      console.log(`❌ No output produced`);
    }

    // Enhanced output comparison
    const passed = !error && compareOutputs(actualOutput, testCase.output);
    const processingTime = Date.now() - startTime;

    // Performance metrics
    const performanceMetrics = {
      processingTime,
      executionTime: result.time || 0,
      memoryUsage: result.memory || 0,
      codeSize: code.length,
      wrapperSize: executableCode.length
    };

    console.log(`🏁 Enhanced Final Result:`, {
      passed,
      actualOutput: actualOutput?.substring(0, 100),
      expectedOutput: JSON.stringify(testCase.output).substring(0, 100),
      executionStatus,
      performanceMetrics,
      error: error?.substring(0, 100)
    });

    // Comprehensive response
    return NextResponse.json({
      // Test Results
      actualOutput,
      expectedOutput: testCase.output,
      passed,
      error,
      fullCode:executableCode,
      
      // Execution Details
      language,
      executionStatus,
      executionTime: result.time,
      memoryUsage: result.memory,
      status: result.status?.description || 'Unknown',
      statusId: result.status?.id,
      
      // Function Analysis
      functionTested: analysis.functionName,
      functionParameters: analysis.parameters,
      returnType: analysis.returnType,
      algorithmPattern: analysis.algorithmPattern,
      dataStructuresUsed: Array.from(analysis.dataStructures),
      needsDataConversion: analysis.needsConversion,
      isStaticMethod: analysis.isStatic,
      
      // Performance Metrics
      performanceMetrics,
      
      // Debug Information (development only)
      debug: process.env.NODE_ENV === 'development' ? {
        executableCode,
        judge0Response: {
          stdout: result.stdout,
          stderr: result.stderr,
          compile_output: result.compile_output
        },
        analysisDetails: analysis
      } : undefined,
      
      // Metadata
      timestamp: new Date().toISOString(),
      version: "2.0.0"
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("💥 System Error:", error);
    
    // Enhanced error response
    return NextResponse.json({
      error: `System Error: ${error.message}`,
      details: error.stack || "Unknown system error occurred",
      errorType: error.name || "UnknownError",
      suggestions: [
        "Check if all required environment variables are set",
        "Verify the request format matches the expected schema",
        "Try again in a few moments if this is a temporary issue"
      ],
      performanceMetrics: {
        processingTime,
        failedAt: "system_level"
      },
      timestamp: new Date().toISOString(),
      retryable: !error.message.includes('validation') && !error.message.includes('format')
    }, { status: 500 });
  }
}