import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Enhanced prompt templates based on analysis type
const ANALYSIS_PROMPTS = {
  comprehensive: `
You are a senior software engineer and code review expert. Provide a comprehensive analysis of this {language} code.

\`\`\`{language}
{user_code}
\`\`\`

## 🎯 **Problem & Solution**
{problem_context}

## 📊 **Algorithm Analysis**
- **Pattern/Approach:** [Two Pointers/Dynamic Programming/Graph Traversal/etc.]
- **Core Strategy:** Brief explanation of the algorithmic approach
- **Time Complexity:** O(?) - Detailed reasoning
- **Space Complexity:** O(?) - Including auxiliary space analysis

## 🏆 **Code Quality Assessment: [X/10]**

### ✅ **Strengths**
- Readability and code organization
- Proper variable naming and structure
- Good practices identified
- Efficient algorithms or data structures used

### ⚠️ **Areas for Improvement**
- **Edge Cases:** Missing handling for empty inputs, null values, boundary conditions
- **Error Handling:** Missing try-catch blocks or input validation
- **Performance:** Potential bottlenecks or inefficient operations
- **Code Style:** Naming conventions, formatting, or architectural issues

## 🚀 **Optimization Opportunities**

### **Primary Optimization:**
\`\`\`{language}
// Show the most impactful optimization
{optimization_placeholder}
\`\`\`
**Impact:** Specific performance/readability improvement

### **Alternative Approaches:**
- **Approach 1:** [Algorithm name] - O(?) time, O(?) space
- **Approach 2:** [Algorithm name] - O(?) time, O(?) space
- **When to use each:** Context-specific recommendations

## 🛡️ **Robustness Check**
- **Input Validation:** What's missing?
- **Boundary Conditions:** Edge cases to consider
- **Error Scenarios:** Potential failure points
- **Memory Management:** Leaks or inefficient usage

## 💡 **Key Insights**
- **Main Takeaway:** The crucial concept that makes this solution work
- **Learning Opportunity:** What developers can learn from this code
- **Real-world Application:** Where this pattern is commonly used

## 🔧 **Quick Wins** (Easy improvements)
1. [Specific actionable improvement]
2. [Another quick fix]
3. [Performance tweak]

---
**Overall Assessment:** [Novice/Intermediate/Advanced] level implementation with [specific strengths/weaknesses].
`,

  concise: `
You are a senior software engineer. Provide a focused, actionable analysis of this {language} code.

\`\`\`{language}
{user_code}
\`\`\`

## 🎯 **What it does:** {problem_context}

## ⚡ **Complexity**
- **Time:** O(?) - {brief_reason}
- **Space:** O(?) - {brief_reason}

## 🏆 **Score: [X/10]**
**✅ Good:** {top_strengths}
**⚠️ Issues:** {main_concerns}

## 🚀 **Best Fix**
\`\`\`{language}
// Single most impactful improvement
{improvement_code}
\`\`\`

## 💡 **Key Insight:** {main_takeaway}
`,

  optimization: `
You are a performance optimization expert. Focus on improving this {language} code's efficiency.

\`\`\`{language}
{user_code}
\`\`\`

## 🔍 **Performance Analysis**
- **Current Complexity:** Time O(?), Space O(?)
- **Bottlenecks:** Identify the slowest operations
- **Memory Usage:** Analyze space efficiency

## 🚀 **Optimization Strategies**

### **Strategy 1: [Name]**
\`\`\`{language}
// Optimized version
{optimization_code}
\`\`\`
**Improvement:** O(?) → O(?) | **Gain:** [specific benefit]

### **Strategy 2: [Alternative approach]**
- **Method:** [Brief description]
- **Complexity:** O(?) time, O(?) space
- **Trade-offs:** [What you gain vs what you sacrifice]

## 📊 **Benchmark Expectations**
- **Small input (n<100):** [Performance expectation]
- **Medium input (n<10k):** [Performance expectation]  
- **Large input (n>10k):** [Performance expectation]

## 💡 **Pro Tip:** {advanced_optimization_insight}
`,

  review: `
You are conducting a professional code review for this {language} code.

\`\`\`{language}
{user_code}
\`\`\`

## 📋 **Code Review Summary**

### 🟢 **Approved Elements**
- Clean, readable implementations
- Proper error handling
- Good algorithmic choices

### 🟡 **Needs Attention**
- Minor improvements or style issues
- Missing edge case handling
- Documentation gaps

### 🔴 **Must Fix**
- Critical bugs or security issues
- Performance problems
- Architectural concerns

## 🛠️ **Recommended Changes**

### **High Priority:**
\`\`\`{language}
// Critical fix with explanation
{critical_fix}
\`\`\`

### **Medium Priority:**
- [Improvement suggestion 1]
- [Improvement suggestion 2]

### **Nice to Have:**
- [Style/documentation improvements]

## ✅ **Approval Status:** [Approved/Needs Changes/Rejected]
**Reason:** {review_decision_reasoning}
`
};

// Enhanced code extraction with better pattern matching
class CodeExtractor {
  private static readonly CODE_BLOCK_PATTERNS = [
    // Fenced code blocks with language
    /``````/g,
    
    // Inline code
    /`([^`\n]{10,})`/g,
    
    // Indented code blocks (4+ spaces)
    /(?:^|\n)((?:    [\s\S]*?\n)*)/g,
    
    // HTML pre/code tags
    /<(?:pre|code)[^>]*>([\s\S]*?)<\/(?:pre|code)>/gi
  ];

  static extract(content: string, fallbackLanguage: string = 'javascript'): {
    code: string;
    language: string;
    confidence: number;
  } {
    let bestMatch = { code: '', language: fallbackLanguage, confidence: 0 };

    for (const pattern of this.CODE_BLOCK_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern));
      
      for (const match of matches) {
        const [, lang, code] = match;
        const cleanCode = (code || match[1] || '').trim();
        
        if (cleanCode.length < 10) continue;

        const detectedLang = lang || this.detectLanguage(cleanCode);
        const confidence = this.calculateConfidence(cleanCode, detectedLang);

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            code: cleanCode,
            language: detectedLang,
            confidence
          };
        }
      }
    }

    return bestMatch;
  }

  private static detectLanguage(code: string): string {
    const patterns = {
      python: [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /:\s*$/m, /\s{4,}\w+/],
      java: [/public\s+class/, /public\s+static\s+void/, /System\.out\./, /new\s+\w+\s*\(/, /\w+\s+\w+\s*=/],
      cpp: [/#include\s*</, /std::/, /cout\s*<</, /int\s+main\s*\(/, /using\s+namespace/],
      javascript: [/function\s+\w+/, /=>\s*{/, /console\.log/, /const\s+\w+\s*=/, /let\s+\w+/],
      typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*\w+(\[\])?/, /export\s+(interface|type|class)/],
      go: [/func\s+\w+\s*\(/, /package\s+\w+/, /import\s+\(/, /fmt\.Print/],
      rust: [/fn\s+\w+\s*\(/, /let\s+mut/, /println!/, /impl\s+\w+/, /use\s+std::/],
      php: [/<?php/, /function\s+\w+\s*\(/, /echo\s+/, /\$\w+\s*=/],
      ruby: [/def\s+\w+/, /end\s*$/, /puts\s+/, /@\w+\s*=/],
      csharp: [/using\s+System/, /public\s+class/, /Console\.WriteLine/, /int\s+Main\s*\(/]
    };

    let maxScore = 0;
    let detectedLang = 'javascript';

    for (const [lang, langPatterns] of Object.entries(patterns)) {
      const score = langPatterns.reduce((acc, pattern) => 
        acc + (pattern.test(code) ? 1 : 0), 0
      );

      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }

  private static calculateConfidence(code: string, language: string): number {
    let confidence = 0;

    // Length bonus
    confidence += Math.min(code.length / 100, 5);

    // Function/method presence
    if (/(?:function|def|public|private|func)\s+\w+/.test(code)) confidence += 3;

    // Logic complexity
    if (/(?:if|for|while|switch|try)/.test(code)) confidence += 2;

    // Language-specific syntax
    const langBonus = this.getLanguageSpecificBonus(code, language);
    confidence += langBonus;

    return Math.min(confidence, 10);
  }

  private static getLanguageSpecificBonus(code: string, language: string): number {
    const bonusPatterns: Record<string, RegExp[]> = {
      javascript: [/console\./, /=>\s*{/, /\.\w+\(/],
      python: [/def\s+/, /:\s*$/, /import\s+/],
      java: [/public\s+/, /System\./, /new\s+\w+/],
      cpp: [/#include/, /std::/, /cout/]
    };

    const patterns = bonusPatterns[language] || [];
    return patterns.reduce((acc, pattern) => 
      acc + (pattern.test(code) ? 1 : 0), 0
    );
  }
}

// Enhanced validation with more sophisticated checks
class CodeValidator {
  static validate(code: string, language: string): ValidationResult {
    const checks = [
      this.checkMinimumLength,
      this.checkHasFunction,
      this.checkHasLogic,
      this.checkNotTemplate,
      this.checkLanguageSpecific
    ];

    for (const check of checks) {
      const result = check(code, language);
      if (!result.isValid) return result;
    }

    return { isValid: true, quality: this.assessCodeQuality(code, language) };
  }

  private static checkMinimumLength(code: string): ValidationResult {
    if (code.trim().length < 20) {
      return {
        isValid: false,
        error: "Code snippet too short",
        suggestion: "Please provide a more substantial code example (at least 20 characters)",
        category: "length"
      };
    }
    return { isValid: true };
  }

  private static checkHasFunction(code: string, language: string): ValidationResult {
    const functionPatterns: Record<string, RegExp[]> = {
      javascript: [
        /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}/,
        /(?:const|let|var)\s+\w+\s*=\s*\([^)]*\)\s*=>/,
        /\w+\s*:\s*function\s*\([^)]*\)/
      ],
      python: [
        /def\s+\w+\s*\([^)]*\):\s*[\s\S]*\S/,
        /class\s+\w+.*:\s*[\s\S]*def\s+/
      ],
      java: [
        /(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+\w+\s*\([^)]*\)\s*\{/,
        /class\s+\w+[\s\S]*\{[\s\S]*\w+\s*\([^)]*\)\s*\{/
      ],
      cpp: [
        /(?:int|void|bool|char|double|float|string|auto)[\s\*&]*\w+\s*\([^)]*\)\s*\{/,
        /class\s+\w+[\s\S]*\{[\s\S]*\w+\s*\(/
      ]
    };

    const patterns = functionPatterns[language.toLowerCase()] || functionPatterns.javascript;
    const hasFunction = patterns.some(pattern => pattern.test(code));

    if (!hasFunction) {
      return {
        isValid: false,
        error: `No function or method found in ${language} code`,
        suggestion: `Please include at least one complete function or method implementation`,
        category: "structure"
      };
    }

    return { isValid: true };
  }

  private static checkHasLogic(code: string): ValidationResult {
    const logicPatterns = [
      /\b(?:if|else|elif|switch|case)\b/,
      /\b(?:for|while|do)\b/,
      /\b(?:try|catch|except|finally)\b/,
      /return\s+[^;}\n]+/,
      /[+\-*/=<>!&|]{1,2}/,
      /\w+\.\w+\s*\(/,
      /\b(?:new|delete|malloc|free)\b/
    ];

    const hasLogic = logicPatterns.some(pattern => pattern.test(code));

    if (!hasLogic) {
      return {
        isValid: false,
        error: "Code lacks algorithmic logic",
        suggestion: "Please provide code with conditional statements, loops, calculations, or data manipulation",
        category: "logic"
      };
    }

    return { isValid: true };
  }

  private static checkNotTemplate(code: string): ValidationResult {
    const templateIndicators = [
      /\{[\s\w]*\}/,
      /TODO|FIXME|PLACEHOLDER/i,
      /\/\*[\s\S]*\*\//,
      /^\s*\/\/.*$/m
    ];

    const isTemplate = templateIndicators.some(pattern => {
      const matches = code.match(pattern);
      return matches && matches.length > code.split('\n').length * 0.3;
    });

    if (isTemplate) {
      return {
        isValid: false,
        error: "Code appears to be a template or placeholder",
        suggestion: "Please provide actual implementation code rather than templates or pseudocode",
        category: "completeness"
      };
    }

    return { isValid: true };
  }

  private static checkLanguageSpecific(code: string, language: string): ValidationResult {
    const specificChecks: Record<string, (code: string) => ValidationResult> = {
      python: (code) => {
        if (!/:\s*$/m.test(code) && !/def\s+\w+/.test(code)) {
          return {
            isValid: false,
            error: "Invalid Python syntax",
            suggestion: "Ensure proper Python indentation and colon usage",
            category: "syntax"
          };
        }
        return { isValid: true };
      },
      java: (code) => {
        if (!/{[\s\S]*}/.test(code) && /class\s+\w+/.test(code)) {
          return {
            isValid: false,
            error: "Incomplete Java class definition",
            suggestion: "Provide complete class implementation with methods",
            category: "syntax"
          };
        }
        return { isValid: true };
      }
    };

    const checker = specificChecks[language.toLowerCase()];
    return checker ? checker(code) : { isValid: true };
  }

  private static assessCodeQuality(code: string, language: string): CodeQuality {
    let score = 5; // Base score
    const metrics = {
      readability: 0,
      complexity: 0,
      structure: 0,
      documentation: 0
    };

    // Readability checks
    if (/\w{3,}/.test(code)) metrics.readability += 1; // Meaningful variable names
    if (!/\w{20,}/.test(code)) metrics.readability += 1; // Not too long names
    if (/\s{2,}/.test(code)) metrics.readability += 1; // Proper spacing

    // Complexity assessment
    const cyclomaticComplexity = (code.match(/\b(?:if|while|for|case|catch)\b/g) || []).length;
    metrics.complexity = Math.max(0, 3 - Math.floor(cyclomaticComplexity / 3));

    // Structure quality
    if (/function\s+\w+|def\s+\w+|class\s+\w+/.test(code)) metrics.structure += 1;
    if (code.split('\n').length > 5) metrics.structure += 1; // Adequate length
    if (/{[\s\S]*}/.test(code)) metrics.structure += 1; // Proper bracing

    // Documentation
    if (/\/\*[\s\S]*\*\/|\/\/.*|#.*|"""[\s\S]*"""|'''[\s\S]*'''/.test(code)) {
      metrics.documentation += 2;
    }

    const totalMetrics = Object.values(metrics).reduce((a, b) => a + b, 0);
    score = Math.min(10, score + totalMetrics);

    return {
      overall: score,
      metrics,
      level: score >= 8 ? 'advanced' : score >= 6 ? 'intermediate' : 'novice'
    };
  }
}

// Enhanced API handler
export async function POST(req: NextRequest) {
  try {
    const { messages, code, language, type = 'comprehensive' } = await req.json();

    // Extract and validate code
    const extraction = extractCode(messages, code, language);
    if (!extraction.code) {
      return createErrorResponse("No code found to analyze", 400);
    }

    // Validate code quality and structure
    const validation = CodeValidator.validate(extraction.code, extraction.language);
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, 400, {
        suggestion: validation.suggestion,
        category: validation.category
      });
    }

    // Generate analysis based on type
    const analysisPrompt = createAnalysisPrompt(
      type as keyof typeof ANALYSIS_PROMPTS,
      extraction.code,
      extraction.language,
      validation.quality
    );

    // Stream the analysis
    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt: analysisPrompt,
      maxTokens: getMaxTokensForType(type),
      temperature: getTemperatureForType(type),
    });

    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error("Analysis API Error:", error);
    return createErrorResponse(
      error.message || "Failed to analyze code",
      500,
      { details: error.stack }
    );
  }
}

// Helper functions
function extractCode(messages: any[], providedCode?: string, providedLanguage?: string) {
  if (providedCode) {
    return {
      code: providedCode,
      language: providedLanguage || 'javascript',
      confidence: 10
    };
  }

  const lastMessage = messages?.[messages.length - 1];
  if (lastMessage?.content) {
    return CodeExtractor.extract(lastMessage.content, providedLanguage);
  }

  return { code: '', language: 'javascript', confidence: 0 };
}

function createAnalysisPrompt(
  type: keyof typeof ANALYSIS_PROMPTS,
  code: string,
  language: string,
  quality?: CodeQuality
): string {
  const template = ANALYSIS_PROMPTS[type] || ANALYSIS_PROMPTS.comprehensive;
  
  return template
    .replace(/\{user_code\}/g, code)
    .replace(/\{language\}/g, language)
    .replace(/\{problem_context\}/g, inferProblemContext(code, language))
    .replace(/\{optimization_placeholder\}/g, generateOptimizationHint(code, language))
    .replace(/\{quality_level\}/g, quality?.level || 'intermediate');
}

function inferProblemContext(code: string, language: string): string {
  const patterns = [
    { pattern: /sort|bubble|quick|merge/i, context: "Sorting algorithm implementation" },
    { pattern: /binary.*search|bfs|dfs/i, context: "Search algorithm implementation" },
    { pattern: /tree|node|left|right/i, context: "Tree data structure operations" },
    { pattern: /graph|vertex|edge|adj/i, context: "Graph algorithm implementation" },
    { pattern: /dp|dynamic.*prog|memo/i, context: "Dynamic programming solution" },
    { pattern: /array|list|vector/i, context: "Array/list manipulation algorithm" },
    { pattern: /string|char|substring/i, context: "String processing algorithm" },
    { pattern: /hash|map|dict/i, context: "Hash-based data structure usage" }
  ];

  for (const { pattern, context } of patterns) {
    if (pattern.test(code)) return context;
  }

  return "Algorithm implementation";
}

function generateOptimizationHint(code: string, language: string): string {
  // This could be enhanced with actual optimization suggestions
  return `// Consider optimizing the main algorithm here\n// Current approach could be improved`;
}

function getMaxTokensForType(type: string): number {
  const tokenLimits = {
    concise: 1024,
    comprehensive: 3072,
    optimization: 2048,
    review: 2560
  };
  return tokenLimits[type as keyof typeof tokenLimits] || 2048;
}

function getTemperatureForType(type: string): number {
  const temperatures = {
    concise: 0.1,
    comprehensive: 0.2,
    optimization: 0.3,
    review: 0.1
  };
  return temperatures[type as keyof typeof temperatures] || 0.2;
}

function createErrorResponse(message: string, status: number, details?: any) {
  return new Response(
    JSON.stringify({ 
      error: message,
      ...details 
    }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Type definitions
interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  category?: string;
  quality?: CodeQuality;
}

interface CodeQuality {
  overall: number;
  metrics: {
    readability: number;
    complexity: number;
    structure: number;
    documentation: number;
  };
  level: 'novice' | 'intermediate' | 'advanced';
}
