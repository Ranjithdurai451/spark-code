import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const conciseAnalysisPrompt = `
You are a senior software engineer. Provide a concise but comprehensive analysis of this {language} code.

\`\`\`{language}
{user_code}
\`\`\`

## 🎯 **Problem & Solution**
Brief explanation of what this code does and the problem it solves.

## ⚡ **Complexity Analysis**
- **Time:** O(?) - Why?
- **Space:** O(?) - Why?

## 🏆 **Quality Score: [X/10]**
### ✅ **Strengths** (2-3 points max)
- Key good practices identified

### ⚠️ **Issues** (2-3 points max)
- Critical problems or improvements needed

## 🚀 **Best Optimization**
\`\`\`{language}
// Show ONE key optimization with explanation
\`\`\`
**Impact:** Specific improvement gained

## 🔄 **Better Approach** (if applicable)
- **Algorithm:** Alternative solution name
- **Complexity:** O(?) time, O(?) space
- **When to use:** Brief scenario

## 💡 **Key Insight**
One crucial takeaway that makes this code/pattern click.

---
Keep it concise, actionable, and focused on the most important insights.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, code, language, type } = await req.json();

    // Extract the latest user message for analysis
    const userMessage = messages[messages.length - 1];
    
    let codeToAnalyze = code;
    let languageToAnalyze = language;
    
    if (!codeToAnalyze && userMessage) {
      const codePatterns = [
        /``````/,
        /`([^`]+)`/
      ];
      
      for (const pattern of codePatterns) {
        const match = userMessage.content.match(pattern);
        if (match) {
          if (match[2]) {
            languageToAnalyze = match[1] || language || 'javascript';
            codeToAnalyze = match[2].trim();
          } else {
            codeToAnalyze = match[1].trim();
          }
          break;
        }
      }
    }

    if (!codeToAnalyze || !languageToAnalyze) {
      return new Response(
        JSON.stringify({ error: "Code and language are required for analysis" }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const validation = validateCodeForAnalysis(codeToAnalyze, languageToAnalyze);
    
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: validation.error,
          suggestion: validation.suggestion 
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const prompt = conciseAnalysisPrompt
      .replace(/\{user_code\}/g, codeToAnalyze)
      .replace(/\{language\}/g, languageToAnalyze);

    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt,
      maxTokens: 2048, // Reduced for more concise output
      temperature: 0.2, // Lower temperature for more focused responses
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Analysis API Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze code" }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

function validateCodeForAnalysis(code: string, language: string): { isValid: boolean; error?: string; suggestion?: string } {
  const trimmedCode = code.trim();
  
  if (trimmedCode.length < 15) {
    return {
      isValid: false,
      error: "Code is too short for meaningful analysis",
      suggestion: "Please provide a more substantial code snippet with at least one function or method"
    };
  }

  const isEmptyClass = /^(public\s+)?class\s+\w+\s*\{\s*\}?\s*$/i.test(trimmedCode.replace(/\n/g, ' '));
  if (isEmptyClass) {
    return {
      isValid: false,
      error: "Empty class detected",
      suggestion: "Please provide a class with methods or algorithmic logic to analyze"
    };
  }

  const functionPatterns = {
    javascript: [
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}/,
      /\w+\s*=\s*\([^)]*\)\s*=>\s*[\{\[][\s\S]*[\}\]]/,
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*[\{\[][\s\S]*[\}\]]/
    ],
    python: [
      /def\s+\w+\s*\([^)]*\):\s*[\s\S]*\S/,
      /class\s+\w+.*:\s*[\s\S]*def\s+/
    ],
    java: [
      /(?:public|private|protected)?\s*(?:static\s+)?[\w<>\[\]]+\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}/,
      /class\s+\w+[\s\S]*\{[\s\S]*(?:public|private|protected)[\s\S]*\w+\s*\([^)]*\)\s*\{/
    ],
    cpp: [
      /(?:int|void|bool|char|double|float|string|auto)[\s\*&]*\w+\s*\([^)]*\)\s*\{[\s\S]*\}/,
      /class\s+\w+[\s\S]*\{[\s\S]*(?:public|private|protected):[\s\S]*\w+\s*\(/
    ]
  };

  const patterns = functionPatterns[language.toLowerCase() as keyof typeof functionPatterns] || functionPatterns.javascript;
  
  const hasFunction = patterns.some(pattern => pattern.test(trimmedCode));
  
  if (!hasFunction) {
    return {
      isValid: false,
      error: `No analyzable function found in the ${language} code`,
      suggestion: `Please provide ${language} code with at least one complete function or method implementation`
    };
  }

  const hasLogic = /(?:if|for|while|switch|try|catch|return\s+\w|=.*[+\-*/]|\.(?:push|pop|add|remove|get|set)|new\s+\w)/i.test(trimmedCode);
  
  if (!hasLogic) {
    return {
      isValid: false,
      error: "Code contains only basic declarations without logic",
      suggestion: "Please provide code with conditional statements, loops, or data manipulation for analysis"
    };
  }

  return { isValid: true };
}
