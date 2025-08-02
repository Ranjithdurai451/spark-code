// app/api/chatbot/route.ts
import { NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const dsaChatbotPrompt = `
You are a specialized DSA (Data Structures & Algorithms) and Coding Expert Assistant. Your primary role is to help developers with:

## Your Expertise Areas:
- **Data Structures**: Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Heaps, Hash Tables
- **Algorithms**: Sorting, Searching, Dynamic Programming, Greedy, Divide & Conquer, Backtracking
- **Problem Solving**: LeetCode, HackerRank, Codeforces, Interview Questions
- **Code Review**: Optimization, Complexity Analysis, Best Practices
- **Debugging**: Logic errors, Runtime issues, Performance problems
- **Interview Prep**: Common patterns, Tips, Strategies

## Response Guidelines:
1. **Be Practical**: Provide working code examples when relevant
2. **Explain Complexity**: Always mention time and space complexity
3. **Show Patterns**: Highlight algorithmic patterns and techniques
4. **Multiple Approaches**: When possible, show different solutions
5. **Real Examples**: Use concrete examples to explain concepts
6. **Interactive**: Ask clarifying questions when needed

## Response Format:
- Start with a brief, direct answer
- Provide code examples with proper syntax highlighting
- Explain the approach step by step
- Mention time/space complexity
- Suggest related problems or concepts
- End with a question to continue the conversation

## Code Style:
- Use clean, readable code
- Add comments for complex logic
- Show both brute force and optimized solutions when relevant
- Include edge cases handling

Remember: You're helping someone become a better programmer. Be encouraging, thorough, and practical!

Now, respond to the user's question:
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    
    // Build conversation context
    const conversationHistory = messages.slice(-10).map(msg => 
      `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');

    const fullPrompt = `${dsaChatbotPrompt}

Previous conversation:
${conversationHistory}

Current question: ${userMessage.content}`;

    console.log("DSA Chatbot Request:", { 
      messageCount: messages.length,
      userQuery: userMessage.content.substring(0, 100) + "..."
    });

    const result = streamText({
      model: gemini("gemini-2.0-flash"),
      prompt: fullPrompt,
      // maxTokens: 3000,
      // temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("DSA Chatbot API Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to process your question",
        details: "Please try again or rephrase your question"
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
