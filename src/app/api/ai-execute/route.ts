import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
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
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  } catch (error) {
    console.error(`❌ Analysis failed for ${language}:`, error);
    return analysis;
  }
}

// Improved Java code analysis with better regex
function analyzeJavaCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  // More robust regex that handles various Java method signatures
  const methodPatterns = [
    // Standard method pattern
    /(public|private|protected)?\s*(static)?\s*([\w<>\[\]\s]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    // Method without access modifier
    /(static)?\s*([\w<>\[\]\s]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g
  ];

  for (const pattern of methodPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      let access, staticKeyword, returnType, methodName, params;
      
      if (match.length === 6) {
        [, access, staticKeyword, returnType, methodName, params] = match;
      } else {
        [, staticKeyword, returnType, methodName, params] = match;
        access = null;
      }
      
      console.log(`🎯 Found Java method: ${methodName}`, { returnType, params });
      
      if (methodName !== 'main' && !isExcludedJavaMethod(methodName)) {
        analysis.functionName = methodName;
        analysis.returnType = returnType?.trim() || "";
        analysis.isStatic = !!staticKeyword;
        analysis.parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
        
        // Detect data structures
        const signature = `${returnType} ${params}`;
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

// Enhanced Python analysis
function analyzePythonCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  // More comprehensive Python function detection
  const functionPatterns = [
    /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/g,
    /def\s+(\w+)\s*\(([^)]*)\)\s*:/g
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
          .map(p => p.trim().split(':')[0].trim())
          .filter(p => p && p !== 'self') : [];
        
        const signature = `${returnType || ''} ${params}`;
        detectDataStructures(signature, analysis);
        detectDataStructures(code, analysis); // Also check in code body
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
  // Better C++ function detection
  const functionPatterns = [
    /([\w<>\*&\s:]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*\{/g,
    /(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g
  ];

  for (const pattern of functionPatterns) {
    const match = pattern.exec(code);
    if (match) {
      const [, returnType, functionName, params] = match;
      
      console.log(`🎯 Found C++ function: ${functionName}`, { returnType, params });
      
      if (!isExcludedCppMethod(functionName)) {
        analysis.functionName = functionName;
        analysis.returnType = returnType.trim();
        analysis.parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
        
        const signature = `${returnType} ${params}`;
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
  const functionPattern = /([\w\*\s]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
  
  const match = functionPattern.exec(code);
  if (match) {
    const [, returnType, functionName, params] = match;
    
    console.log(`🎯 Found C function: ${functionName}`, { returnType, params });
    
    if (!isExcludedCMethod(functionName)) {
      analysis.functionName = functionName;
      analysis.returnType = returnType.trim();
      analysis.parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      
      const signature = `${returnType} ${params}`;
      detectDataStructures(signature, analysis);
      detectAlgorithmPattern(functionName, signature, code, analysis);
      
      console.log(`✅ C function detected:`, analysis);
      return analysis;
    }
  }
  
  console.log(`❌ No valid C function found in code`);
  return analysis;
}

// Enhanced Go analysis
function analyzeGoCode(code: string, analysis: CodeAnalysis): CodeAnalysis {
  const functionPattern = /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]*?)\s*\{/g;
  
  const match = functionPattern.exec(code);
  if (match) {
    const [, functionName, params, returnType] = match;
    
    console.log(`🎯 Found Go function: ${functionName}`, { params, returnType });
    
    if (!isExcludedGoMethod(functionName)) {
      analysis.functionName = functionName;
      analysis.returnType = returnType?.trim() || "";
      analysis.parameters = params ? params.split(',').map(p => p.trim()).filter(p => p) : [];
      
      const signature = `${returnType} ${params}`;
      detectDataStructures(signature, analysis);
      detectAlgorithmPattern(functionName, signature, code, analysis);
      
      console.log(`✅ Go function detected:`, analysis);
      return analysis;
    }
  }
  
  console.log(`❌ No valid Go function found in code`);
  return analysis;
}

// Helper functions for exclusion lists
function isExcludedJavaMethod(name: string): boolean {
  const excluded = ['main', 'toString', 'equals', 'hashCode', 'compareTo', 'clone', 'class', 'if', 'for', 'while'];
  return excluded.includes(name.toLowerCase());
}

function isExcludedPythonMethod(name: string): boolean {
  const excluded = ['main', '__init__', '__str__', '__repr__', '__eq__'];
  return excluded.includes(name.toLowerCase()) || (name.startsWith('__') && name.endsWith('__'));
}

function isExcludedCppMethod(name: string): boolean {
  const excluded = ['main', 'operator', 'if', 'for', 'while', 'class'];
  return excluded.includes(name.toLowerCase()) || name.startsWith('~');
}

function isExcludedCMethod(name: string): boolean {
  const excluded = ['main', 'if', 'for', 'while'];
  return excluded.includes(name.toLowerCase());
}

function isExcludedGoMethod(name: string): boolean {
  const excluded = ['main', 'init', 'if', 'for', 'switch'];
  return excluded.includes(name.toLowerCase());
}

// Data structure detection
function detectDataStructures(signature: string, analysis: CodeAnalysis): void {
  const sigLower = signature.toLowerCase();
  
  if (sigLower.includes('listnode')) {
    analysis.dataStructures.add('ListNode');
    analysis.needsConversion = true;
  }
  if (sigLower.includes('treenode')) {
    analysis.dataStructures.add('TreeNode');
    analysis.needsConversion = true;
  }
  if (sigLower.includes('graphnode')) {
    analysis.dataStructures.add('GraphNode');
    analysis.needsConversion = true;
  }
}

// Algorithm pattern detection
function detectAlgorithmPattern(funcName: string, signature: string, code: string, analysis: CodeAnalysis): void {
  const name = funcName.toLowerCase();
  const sig = signature.toLowerCase();
  const codeStr = code.toLowerCase();
  
  if (name.includes('twosum') || name.includes('two_sum')) {
    analysis.algorithmPattern = 'two_sum';
  } else if (name.includes('search') || codeStr.includes('binary search')) {
    analysis.algorithmPattern = 'binary_search';
  } else if (analysis.dataStructures.has('ListNode')) {
    analysis.algorithmPattern = 'linked_list';
  } else if (analysis.dataStructures.has('TreeNode')) {
    analysis.algorithmPattern = 'binary_tree';
  } else if (name.includes('dp') || name.includes('dynamic')) {
    analysis.algorithmPattern = 'dynamic_programming';
  } else if (sig.includes('matrix') || sig.includes('grid')) {
    analysis.algorithmPattern = 'matrix';
  } else {
    analysis.algorithmPattern = 'standard';
  }
}

// Simplified wrapper prompt that's more reliable
function buildWrapperPrompt({ userCode, language, testCase, analysis }: {
  userCode: string;
  language: string;
  testCase: { input: any[]; output: any };
  analysis: CodeAnalysis;
}): string {
  const lang = language.toLowerCase();
  const funcName = analysis.functionName || 'solution';
  
  // Simplified, more reliable prompt
  return `Create EXECUTABLE ${lang.toUpperCase()} code that tests the user's function.

REQUIREMENTS:
1. Include user's code EXACTLY as provided
2. Do not modify the user's code even if the logic or syntax is incorrect
3. Dont change input or output format and dont change input value use the same input as provided
4. Add main/test execution that calls the function
5. Handle input: ${JSON.stringify(testCase.input)}
6. Print the result (no extra text, just the result)
7. Main Rule Never ever change a single word of the user's code ,especially function code even if the logic or syntax is incorrect

USER CODE:
${userCode}

TARGET FUNCTION: ${funcName}
INPUT: ${JSON.stringify(testCase.input)}
EXPECTED OUTPUT: ${JSON.stringify(testCase.output)}

${getSimpleLanguageInstructions(lang, testCase.input, funcName)}

Generate complete executable code:`;
}

function getSimpleLanguageInstructions(language: string, input: any[], funcName: string): string {
  switch (language) {
    case 'java':
      return `Create a Main class with main method that:
- Creates input variables from: ${JSON.stringify(input)}
- Calls ${funcName} function
- Prints result with System.out.println()`;
    
    case 'python':
      return `Add main execution that:
- Creates variables from: ${JSON.stringify(input)}  
- Calls ${funcName} function
- Prints result with print()`;
    
    case 'cpp':
      return `Add main() function that:
- Creates variables from: ${JSON.stringify(input)}
- Calls ${funcName} function  
- Prints result with cout`;
    
    case 'c':
      return `Add main() function that:
- Creates variables from: ${JSON.stringify(input)}
- Calls ${funcName} function
- Prints result with printf`;
    
    case 'go':
      return `Add main() function that:
- Creates variables from: ${JSON.stringify(input)}
- Calls ${funcName} function
- Prints result with fmt.Println`;
    
    default:
      return '';
  }
}

// Simplified code extraction
function extractCode(aiResponse: string, language: string = ''): string {
  // Normalize language name
  const lang = language.toLowerCase();
  
  // Language-specific patterns
  const patterns = [
    // Exact language match (case insensitive)
    new RegExp(`\`\`\`${lang}\\s*([\\s\\S]*?)\`\`\``, 'i'),
    // Common language aliases
    lang === 'cpp' ? /``````/i : null,
    lang === 'javascript' ? /``````/i : null,
    lang === 'python' ? /``````/i : null,
    // Generic code block
    /``````/
  ].filter(Boolean) as RegExp[];

  // Try each pattern
  for (const pattern of patterns) {
    const match = pattern.exec(aiResponse);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Final fallback: clean up any remaining backticks
  return aiResponse
    .replace(/```language/g, '')
    .replace(/```/g, '')
    .trim();
}




// More reliable wrapper code generation
async function buildExecutableCode(userCode: string, language: string, testCase: any, analysis: CodeAnalysis): Promise<string> {
  try {
    console.log(`🤖 Generating wrapper code for ${language}...`);
    
    const prompt = buildWrapperPrompt({ userCode, language, testCase, analysis });
    
    const ai = await generateText({
      model: gemini("gemini-2.0-flash"),
      prompt,
      temperature: 0.0,
      maxTokens: 2000
    });
    
    let code = extractCode(ai.text,language);
    
    console.log(`📝 Generated code (${code.length} chars):`, code.substring(0, 300) + "...");
    
    // Basic validation that user code is included
    if (!code.toLowerCase().includes(analysis.functionName.toLowerCase())) {
      console.warn("⚠️ AI didn't include function name, using fallback");
      return generateSimpleFallback(userCode, language, testCase, analysis);
    }
    
    return code;
  } catch (err) {
    console.error("❌ AI generation failed:", err);
    return generateSimpleFallback(userCode, language, testCase, analysis);
  }
}

// Simple, reliable fallback code generator
function generateSimpleFallback(userCode: string, language: string, testCase: any, analysis: CodeAnalysis): string {
  const funcName = analysis.functionName || 'solution';
  const input = testCase.input;
  
  console.log(`🔧 Using fallback generator for ${language}`);
  
  switch (language.toLowerCase()) {
    case 'java':
      return `
public class Main {
    ${userCode.replace(/public class Main \{/, '').replace(/}\s*$/, '')}
    
    public static void main(String[] args) {
        Main instance = new Main();
        // Simple input handling
        ${generateJavaInputs(input)}
        Object result = instance.${funcName}(${input.map((_, i) => `param${i}`).join(', ')});
        System.out.println(result);
    }
}`.trim();
    
    case 'python':
      return `
${userCode}

if __name__ == "__main__":
    # Simple input handling
    ${generatePythonInputs(input)}
    result = ${funcName}(${input.map((_, i) => `param${i}`).join(', ')})
    print(result)
`.trim();
    
    case 'cpp':
      return `
#include <iostream>
#include <vector>
#include <string>
using namespace std;

${userCode}

int main() {
    ${generateCppInputs(input)}
    auto result = ${funcName}(${input.map((_, i) => `param${i}`).join(', ')});
    cout << result << endl;
    return 0;
}`.trim();
    
    case 'c':
      return `
#include <stdio.h>
#include <stdlib.h>

${userCode}

int main() {
    ${generateCInputs(input)}
    int result = ${funcName}(${input.map((_, i) => `param${i}`).join(', ')});
    printf("%d\\n", result);
    return 0;
}`.trim();
    
    case 'go':
      return `
package main
import "fmt"

${userCode}

func main() {
    ${generateGoInputs(input)}
    result := ${funcName}(${input.map((_, i) => `param${i}`).join(', ')})
    fmt.Println(result)
}`.trim();
    
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

function generateJavaInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    if (Array.isArray(value)) {
      const elements = value.map((v: any) => typeof v === 'string' ? `"${v}"` : v).join(', ');
      return `int[] ${varName} = {${elements}};`;
    }
    if (typeof value === 'string') return `String ${varName} = "${value}";`;
    if (typeof value === 'number') return `int ${varName} = ${value};`;
    return `Object ${varName} = ${JSON.stringify(value)};`;
  }).join('\n        ');
}

function generatePythonInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    return `    ${varName} = ${JSON.stringify(value)}`;
  }).join('\n');
}

function generateCppInputs(input: any[]): string {
  return input.map((value, i) => {
    const varName = `param${i}`;
    if (Array.isArray(value)) {
      const elements = value.join(', ');
      return `    vector<int> ${varName} = {${elements}};`;
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
      return `    ${varName} := []int{${value.join(', ')}}`;
    }
    if (typeof value === 'number') return `    ${varName} := ${value}`;
    if (typeof value === 'string') return `    ${varName} := "${value}"`;
    return `    ${varName} := ${value}`;
  }).join('\n');
}

// Enhanced Judge0 execution with better error handling
async function executeCode({ code, language }: { code: string; language: string }) {
  const langId = LANGUAGE_MAP[language.toLowerCase()];
  if (!langId) throw new Error("Unsupported language");

  console.log(`🚀 Executing ${language} code on Judge0...`);
  console.log(`📝 Code to execute (${code.length} chars):`, code.substring(0, 500) + "...");

  try {
    const res = await fetch(JUDGE0_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: "",
        expected_output: ""
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Judge0 API Error: ${res.status} - ${errorText}`);
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
    console.error(`💥 Judge0 execution failed:`, error);
    throw error;
  }
}

function compareOutputs(actual: string, expected: any): boolean {
  try {
    const actualTrim = actual.trim();
    const expectedStr = Array.isArray(expected) ? JSON.stringify(expected) : String(expected);
    
    console.log(`🔍 Comparing outputs:`);
    console.log(`  Actual: "${actualTrim}"`);
    console.log(`  Expected: "${expectedStr}"`);
    
    if (actualTrim === expectedStr.trim()) return true;
    
    // Handle array outputs like [1,2,3] vs [1, 2, 3]
    if (actualTrim.startsWith('[') && actualTrim.endsWith(']')) {
      const normalizedActual = actualTrim.replace(/\s+/g, '');
      const normalizedExpected = expectedStr.replace(/\s+/g, '');
      return normalizedActual === normalizedExpected;
    }
    
    try {
      const actualParsed = JSON.parse(actualTrim);
      return JSON.stringify(actualParsed) === JSON.stringify(expected);
    } catch {
      return actualTrim === expectedStr;
    }
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log(`🎯 Starting code execution request...`);
    
    const { code, language = 'java', testCase } = await req.json();
    
    // Enhanced validation with detailed logging
    if (!LANGUAGE_MAP[language.toLowerCase()]) {
      console.log(`❌ Unsupported language: ${language}`);
      return NextResponse.json({
        error: `Unsupported language: ${language}`,
        supported: Object.keys(LANGUAGE_MAP),
        details: `Language '${language}' is not supported. Please use one of: ${Object.keys(LANGUAGE_MAP).join(', ')}`
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
        details: "Please provide code and testCase with input and output fields"
      }, { status: 400 });
    }

    console.log(`✅ Processing code execution:`, {
      language,
      codeLength: code.length,
      testInput: testCase.input,
      expectedOutput: testCase.output
    });

    // Enhanced code analysis with detailed logging
    const analysis = analyzeUserCode(code, language);
    
    if (!analysis.functionName) {
      console.log(`❌ No function detected in code`);
      return NextResponse.json({
        error: "No valid function found in the code",
        details: `Could not detect a testable function in ${language} code. Make sure your code contains a complete function definition.`,
        suggestions: [
          "Ensure your function has proper syntax for the language",
          "Check that the function is not named 'main' or other excluded names",
          "Verify the function has a complete signature with parameters and body"
        ]
      }, { status: 400 });
    }
    
    console.log(`🎉 Function Analysis Complete:`, {
      name: analysis.functionName,
      language: analysis.language,
      parameters: analysis.parameters.length,
      dataStructures: Array.from(analysis.dataStructures),
      algorithmPattern: analysis.algorithmPattern,
      needsConversion: analysis.needsConversion
    });

    // Generate wrapper code
    const executableCode = await buildExecutableCode(code, language, testCase, analysis);
    console.log(`✅ Generated wrapper code successfully`);
    console.log("Executable code:", executableCode);

    // Execute code on Judge0
    const result = await executeCode({ code: executableCode, language });
    console.log(`🎊 Judge0 execution completed:`, {
      status: result.status?.description,
      time: result.time,
      memory: result.memory,
      hasOutput: !!result.stdout
    });

    // Process execution results
    let actualOutput = "";
    let error = null;

    if (result.compile_output?.trim()) {
      error = `Compilation Error: ${result.compile_output}`;
      console.log(`❌ Compilation Error:`, result.compile_output);
    } else if (result.stderr?.trim()) {
      error = `Runtime Error: ${result.stderr}`;
      console.log(`❌ Runtime Error:`, result.stderr);
    } else if (result.stdout) {
      actualOutput = result.stdout.trim();
      console.log(`✅ Got output:`, actualOutput);
    } else {
      error = "No output produced";
      console.log(`❌ No output produced`);
    }

    const passed = !error && compareOutputs(actualOutput, testCase.output);
    const processingTime = Date.now() - startTime;

    console.log(`🏁 Final Result:`, {
      passed,
      actualOutput: actualOutput?.substring(0, 100),
      processingTime,
      error: error?.substring(0, 100)
    });

    return NextResponse.json({
      actualOutput,
      expectedOutput: testCase.output,
      passed,
      error,
      language,
      executionTime: result.time,
      memoryUsage: result.memory,
      status: result.status?.description || 'Unknown',
      functionTested: analysis.functionName,
      algorithmPattern: analysis.algorithmPattern,
      dataStructuresUsed: Array.from(analysis.dataStructures),
      processingTime,
      executableCode: process.env.NODE_ENV === 'development' ? executableCode : undefined,
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("💥 System Error:", error);
    
    return NextResponse.json({
      error: `System Error: ${error.message}`,
      details: error.stack || "Unknown error occurred",
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
