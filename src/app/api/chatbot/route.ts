// app/api/chatbot/route.ts
import { NextRequest } from "next/server";
import { createGeminiClient } from "@/lib/model";
import { requireCredits } from "@/lib/credits";
import { streamText } from "ai";
import { createErrorResponse } from "@/lib/responses/errorResponse";
import { APIError } from "@/lib/errors/errorHandler";
import { ErrorCode } from "@/lib/errors/errorCodes";
import { logger } from "@/lib/logging/logger";
// BYOK removed: gemini client is created from env

const dsaChatbotPrompt = `
You are an elite DSA (Data Structures & Algorithms) Expert and Coding Mentor with deep expertise in competitive programming and software engineering interviews.

## Your Core Identity:
- **Name**: DSA Expert Assistant
- **Expertise**: Advanced algorithms, data structures, competitive programming, interview preparation
- **Teaching Style**: Clear, practical, encouraging, and results-oriented
- **Goal**: Help developers become exceptional problem solvers

## Your Specialized Knowledge Areas:

### 🧠 Data Structures (Master Level):
- **Linear**: Arrays, Linked Lists, Stacks, Queues, Deques
- **Trees**: Binary Trees, BST, AVL, Red-Black, B-Trees, Segment Trees, Fenwick Trees
- **Graphs**: Adjacency Lists/Matrix, Directed/Undirected, Weighted graphs
- **Advanced**: Heaps, Hash Tables, Tries, Disjoint Sets (Union-Find)

### ⚡ Algorithms (Expert Level):
- **Search & Sort**: Binary Search variants, QuickSort, MergeSort, HeapSort, Counting Sort
- **Graph Algorithms**: DFS, BFS, Dijkstra, Bellman-Ford, Floyd-Warshall, MST (Kruskal, Prim)
- **Dynamic Programming**: 1D/2D DP, Memoization, Tabulation, Space optimization
- **Greedy**: Activity Selection, Huffman Coding, Fractional Knapsack
- **Advanced**: String algorithms (KMP, Rabin-Karp), Computational geometry

### 🎯 Problem-Solving Patterns:
- **Two Pointers**: Fast/Slow, Left/Right, Sliding Window
- **Backtracking**: N-Queens, Sudoku, Permutations, Combinations
- **Divide & Conquer**: Merge Sort, Quick Sort, Binary Search
- **Tree Traversals**: In/Pre/Post-order, Level-order, Morris Traversal

## Response Guidelines:

### 🚀 When analyzing code:
1. **First Impression**: Quick assessment of approach and correctness
2. **Detailed Analysis**: 
   - Time complexity (with explanation)
   - Space complexity (with explanation)
   - Edge cases handling
   - Code quality and style
3. **Optimization Opportunities**: Alternative approaches with better complexity
4. **Test Cases**: Suggest comprehensive test scenarios

### 💡 When explaining concepts:
1. **Intuitive Explanation**: Start with real-world analogies
2. **Technical Details**: Formal definitions and properties
3. **Code Examples**: Clean, well-commented implementations
4. **Visual Description**: Describe how the algorithm "moves" through data
5. **Common Pitfalls**: What beginners usually get wrong

### 🎯 When debugging:
1. **Error Identification**: Spot syntax, logic, and runtime errors
2. **Root Cause Analysis**: Explain why the error occurs
3. **Fix Suggestions**: Multiple ways to resolve the issue
4. **Prevention**: How to avoid similar issues in future

### 📈 For optimization requests:
1. **Current Analysis**: Assess existing solution complexity
2. **Bottleneck Identification**: Where the performance issues lie
3. **Alternative Approaches**: 2-3 different optimization strategies
4. **Trade-offs**: Memory vs Time, Readability vs Performance

## Response Format:
- Use **clear headings** with emojis for visual appeal
- Provide **working code examples** with proper syntax highlighting
- Always mention **time/space complexity** using Big O notation
- Include **step-by-step explanations** for complex algorithms
- Suggest **related problems** or **follow-up questions**
- Use **encouraging language** to build confidence

## Code Style Preferences:
- Clean, readable variable names
- Comprehensive comments for complex logic
- Handle edge cases explicitly
- Show both brute force and optimized solutions when relevant
- Include dry runs for complex algorithms

## Special Instructions:
- **Keep responses focused and practical**
- **Provide actionable insights**
- **Be concise but thorough**
- **Always include complexity analysis when code is involved**
- **Suggest improvements and next steps**
- **Use encouraging and supportive tone**

## Tone & Personality:
- **Encouraging**: "Great question! Let's break this down..."
- **Confident**: Provide definitive answers backed by expertise
- **Patient**: Explain concepts at the user's level
- **Practical**: Focus on applicable knowledge and real scenarios
- **Motivating**: Help users feel capable of solving any problem

Remember: Every interaction should leave the user feeling more confident and knowledgeable than before!
`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest("POST", req.url);

    const credit = await requireCredits(req, 1, "chatbot");
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
    const { messages, currentTab } = await req.json();
    const gemini = createGeminiClient();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      logger.apiResponse("POST", req.url, 400, Date.now() - startTime, {
        error: "messages_required",
      });
      throw APIError.create(
        ErrorCode.INVALID_REQUEST,
        {},
        "Messages array is required",
      );
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];

    // Build conversation context (all messages for full context)
    const conversationHistory = messages
      .map((msg) => {
        const role = msg.role === "user" ? "Human" : "DSA Assistant";
        return `${role}: ${msg.content}`;
      })
      .join("\n\n");

    // Add current tab context if available
    let codeContext = "";
    if (currentTab && currentTab.code && currentTab.code.trim()) {
      codeContext = `

**Current Code Context:**
File: ${currentTab.name} (${currentTab.language})
\`\`\`${currentTab.language}
${currentTab.code}
\`\`\`
`;
    }

    // Enhanced context analysis
    const messageContent = userMessage.content.toLowerCase();

    const isCodeAnalysisRequest =
      messageContent.includes("analyze") ||
      messageContent.includes("review") ||
      messageContent.includes("check");

    const isOptimizationRequest =
      messageContent.includes("optimize") ||
      messageContent.includes("improve") ||
      messageContent.includes("performance") ||
      messageContent.includes("faster") ||
      messageContent.includes("better");

    const isDebuggingRequest =
      messageContent.includes("debug") ||
      messageContent.includes("error") ||
      messageContent.includes("fix") ||
      messageContent.includes("bug") ||
      messageContent.includes("wrong") ||
      messageContent.includes("issue");

    const isComplexityRequest =
      messageContent.includes("complexity") ||
      messageContent.includes("big o") ||
      messageContent.includes("time") ||
      messageContent.includes("space");

    const isExplanationRequest =
      messageContent.includes("explain") ||
      messageContent.includes("how") ||
      messageContent.includes("understand") ||
      messageContent.includes("step by step");

    // Check if there's code context available
    const hasCodeContext =
      currentTab && currentTab.code && currentTab.code.trim();

    // Check if any message in the conversation contains code (for fallback/general context)
    const hasCodeInConversation = messages.some(
      (msg) =>
        typeof msg.content === "string" && /```[\s\S]*?```/.test(msg.content),
    );

    // Create specialized context based on request type
    let contextualPrompt = "";

    if (isCodeAnalysisRequest && hasCodeContext) {
      contextualPrompt = `
🔍 **CODE ANALYSIS REQUEST**
The user wants code analysis. Analyze the current code context provided:
1. **Correctness**: Does this code work for all cases?
2. **Time Complexity**: O(?) with detailed explanation
3. **Space Complexity**: O(?) with detailed explanation
4. **Edge Cases**: What scenarios might break this?
5. **Code Quality**: Style, readability, best practices
6. **Optimization Ideas**: How can this be improved?
`;
    } else if (isOptimizationRequest && hasCodeContext) {
      contextualPrompt = `
⚡ **OPTIMIZATION REQUEST**
Focus on performance improvements for the current code:
1. **Current Approach**: Analyze existing complexity
2. **Bottlenecks**: Identify performance limitations
3. **Better Approaches**: 2-3 alternative algorithms/data structures
4. **Trade-offs**: Time vs Space considerations
5. **Implementation**: Show optimized code
`;
    } else if (isDebuggingRequest && hasCodeContext) {
      contextualPrompt = `
🔧 **DEBUGGING REQUEST**
Help identify and fix issues in the current code:
1. **Problem Identification**: What's wrong?
2. **Root Cause**: Why is this happening?
3. **Solutions**: Multiple ways to fix
4. **Testing**: How to verify the fix
5. **Prevention**: Avoid similar issues in future
`;
    } else if (isComplexityRequest && hasCodeContext) {
      contextualPrompt = `
📊 **COMPLEXITY ANALYSIS REQUEST**
Provide detailed complexity breakdown for the current code:
1. **Time Complexity**: Step-by-step Big O analysis
2. **Space Complexity**: Memory usage analysis
3. **Best/Average/Worst Cases**: Different scenarios
4. **Comparison**: How it compares to alternatives
5. **Optimization Potential**: Can complexity be improved?
`;
    } else if (isExplanationRequest && hasCodeContext) {
      contextualPrompt = `
💡 **EXPLANATION REQUEST**
Break down the current code clearly:
1. **Intuitive Explanation**: Real-world analogy
2. **Technical Details**: How it works step-by-step
3. **Code Walkthrough**: Line-by-line explanation
4. **Visual Description**: How data flows/transforms
5. **Common Pitfalls**: What to watch out for
`;
    } else if (isDebuggingRequest && hasCodeInConversation) {
      contextualPrompt = `
🔧 **DEBUGGING REQUEST**
Help identify and fix issues in any code from the conversation:
1. **Problem Identification**: What's wrong?
2. **Root Cause**: Why is this happening?
3. **Solutions**: Multiple ways to fix
4. **Testing**: How to verify the fix
5. **Prevention**: Avoid similar issues in future
`;
    } else if (isComplexityRequest && hasCodeInConversation) {
      contextualPrompt = `
📊 **COMPLEXITY ANALYSIS REQUEST**
Provide detailed complexity breakdown:
1. **Time Complexity**: Step-by-step Big O analysis
2. **Space Complexity**: Memory usage analysis
3. **Best/Average/Worst Cases**: Different scenarios
4. **Comparison**: How it compares to alternatives
5. **Optimization Potential**: Can complexity be improved?
`;
    } else if (isExplanationRequest && hasCodeInConversation) {
      contextualPrompt = `
💡 **EXPLANATION REQUEST**
Break down the concept clearly:
1. **Intuitive Explanation**: Real-world analogy
2. **Technical Details**: How it works step-by-step
3. **Code Walkthrough**: Line-by-line if code is provided
4. **Visual Description**: How data flows/transforms
5. **Common Pitfalls**: What to watch out for
`;
    } else {
      contextualPrompt = `
🚀 **GENERAL DSA ASSISTANCE**
Provide comprehensive help with clear explanations and practical insights.
Focus on being encouraging, educational, and actionable.
${hasCodeContext ? "Reference the current code context when relevant." : ""}
`;
    }

    const fullPrompt = `${dsaChatbotPrompt}

${contextualPrompt}

**Previous Conversation:**
${conversationHistory}

${codeContext}

**Current Question:** ${userMessage.content}

**Instructions for Response:**
- Be encouraging and supportive
- Use clear headings with emojis
- Include code examples when relevant
- Always provide complexity analysis for algorithms
- Give actionable next steps
- Keep response focused and practical
- End with a helpful follow-up question or suggestion
${hasCodeContext ? "- Reference the current code context when answering" : ""}

Please provide a detailed, helpful response that demonstrates expertise while being accessible and encouraging.`;

    console.log("DSA Chatbot Request:", {
      messageCount: messages.length,
      requestType: isCodeAnalysisRequest
        ? "Code Analysis"
        : isOptimizationRequest
          ? "Optimization"
          : isDebuggingRequest
            ? "Debugging"
            : isComplexityRequest
              ? "Complexity Analysis"
              : isExplanationRequest
                ? "Explanation"
                : "General",
      hasCodeContext: hasCodeContext,
      hasCodeInConversation: hasCodeInConversation,
      currentFile: currentTab
        ? `${currentTab.name} (${currentTab.language})`
        : "None",
      userQuery: userMessage.content.substring(0, 100) + "...",
    });

    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt: fullPrompt,
    });

    logger.apiResponse("POST", req.url, 200, Date.now() - startTime, {
      messageCount: messages.length,
      hasCodeContext: !!codeContext,
    });

    return result.toDataStreamResponse();
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
