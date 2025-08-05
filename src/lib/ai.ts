import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const promptTemplate = `
Analyze the following {language} code and provide a comprehensive breakdown:

\`\`\`{language}
{user_code}
\`\`\`

## 🎯 Problem Understanding
Explain what this code is trying to solve in simple terms.

## ⏱️ Complexity Analysis
- **Time Complexity:** O(?) - Detailed explanation with step-by-step reasoning
- **Space Complexity:** O(?) - Include auxiliary space and input space analysis

## 🔍 Code Quality & Issues
### Current Approach Evaluation
- Strengths of the current implementation
- Potential bugs, edge cases, or logical errors
- Code style and readability suggestions
- Best practices compliance

### Security Considerations
- Input validation issues
- Potential vulnerabilities
- Safe coding practices

## 🚀 Optimizations
### Performance Improvements
\`\`\`{language}
// Example optimized code snippet
\`\`\`

### Memory Usage Improvements
- Specific memory optimization techniques
- Data structure recommendations

## 🔄 Alternative Approaches
### Approach 1: [Algorithm Name]
- **Description:** Brief explanation
- **Time Complexity:** O(?)
- **Space Complexity:** O(?)
- **Pros & Cons:** When to use this approach

### Approach 2: [Algorithm Name]
- **Description:** Brief explanation  
- **Time Complexity:** O(?)
- **Space Complexity:** O(?)
- **Pros & Cons:** Trade-offs comparison

## 📚 Concepts & Patterns
- **Data Structures Used:** Arrays, Hash Maps, Trees, etc.
- **Algorithmic Patterns:** Two pointers, sliding window, divide & conquer, etc.
- **Problem Category:** Searching, sorting, dynamic programming, graph algorithms, etc.
- **Design Patterns:** If applicable (Strategy, Observer, etc.)

## 🧪 Test Cases & Edge Cases
### Generated Test Cases
1. **Basic Case:** \`input\` → \`expected_output\`
2. **Edge Case 1:** \`input\` → \`expected_output\`
3. **Edge Case 2:** \`input\` → \`expected_output\`
4. **Large Input:** \`input\` → \`expected_output\`
5. **Invalid Input:** \`input\` → \`expected_behavior\`

### Testing Strategy
- Unit testing recommendations
- Integration testing considerations

## 📖 Learning Path
### Related Problems
- Similar LeetCode/CodeForces problems with difficulty ratings
- Progressive difficulty recommendations

### Concepts to Master
- Prerequisites for understanding this code
- Advanced topics to explore next

### Recommended Resources
- Documentation links
- Tutorial recommendations
- Practice platforms

## 💡 Additional Insights
- Industry applications of this algorithm
- Real-world use cases
- Scalability considerations
`;

export async function analyzeCodeStream({ code, language }: { code: string; language: string }) {
  const prompt = promptTemplate
    .replace(/\{user_code\}/g, code)
    .replace(/\{language\}/g, language);

  try {
    const result = await streamText({
      model: gemini("gemini-2.0-flash-exp"),
      prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to analyze code. Please try again.");
  }
}
