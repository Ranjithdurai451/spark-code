# SparkCode: Your AI-Powered DSA Companion

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Technologies](https://img.shields.io/badge/tech-Next.js%2C%20AI%20SDK%2C%20Monaco%20Editor-orange)

SparkCode is an innovative AI-powered coding platform specifically designed for Data Structures and Algorithms (DSA) learners. It provides powerful tools to help you practice coding, analyze your code's quality, generate comprehensive test cases, and execute solutions with real-time feedback. This platform aims to significantly enhance your programming skills and prepare you to excel in technical interviews through intelligent AI assistance and multi-language support.

## ✨ Why SparkCode?

Navigating the world of Data Structures and Algorithms can be challenging. SparkCode is built to be your ultimate companion, offering:

- **Intelligent Feedback**: Go beyond simple pass/fail. Understand _why_ your code works or doesn't, with AI-driven insights into complexity, logic, and edge cases.
- **Accelerated Learning**: Spend less time debugging and more time learning. Instantly generate test cases and get real-time execution results across multiple languages.
- **Interview Readiness**: Practice with confidence, knowing you have an AI mentor to refine your solutions and prepare you for technical assessments.
- **Multi-Language Mastery**: Seamlessly switch between popular programming languages like Java, Python, C++, C, Go, JavaScript, and TypeScript, expanding your versatility.

## Features

- **AI-Powered Code Analysis**: Get in-depth analysis of your code's functionality, algorithm patterns, time and space complexity, and overall quality.
- **Automated Test Case Generation**: Automatically generate relevant test cases for your code, ensuring comprehensive coverage and helping identify edge cases.
- **Multi-Language Code Execution**: Execute code in various programming languages (Java, Python, C++, C, Go, JavaScript, TypeScript) with real-time feedback on correctness and performance.
- **Interactive Code Editor**: A feature-rich code editor with syntax highlighting and other developer-friendly features.
- **Responsive UI**: A modern and responsive user interface built with Next.js and Shadcn UI components.
- **Theme Support**: Customizable themes for a personalized coding environment.

## Project Structure

The project is a Next.js application with a clear separation of concerns:

- `public/`: Static assets like images and icons.
- `src/app/`: Contains the main application pages and API routes.
  - `api/`: Backend API endpoints for AI execution, analysis, chatbot, and test generation.
  - `favicon.ico`, `globals.css`, `layout.tsx`, `page.tsx`: Core Next.js application files.
- `src/components/`: Reusable React components.
  - `features/`: Components related to specific features like the code editor, side panel, and theme management.
  - `markdown-render/`: Components for rendering markdown content, including code blocks.
  - `root/`: Root-level components like the chatbot, header, and providers.
  - `ui/`: Shadcn UI components used throughout the application.
- `src/lib/`: Utility functions.
- `bun.lock`, `package.json`: Dependency management files.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`: Configuration files for Next.js, TypeScript, ESLint, and PostCSS.

## Getting Started

To get started with SparkCode, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd spark-code
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    # or npm install
    # or yarn install
    # or pnpm install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add your API keys:

    ```
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    JUDGE0_KEY=YOUR_JUDGE0_API_KEY
    ```

    You can obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
    For Judge0, you can sign up for an API key on [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce).

4.  **Run the development server:**
    ```bash
    bun dev
    # or npm run dev
    # or yarn dev
    # or pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Learn More

To learn more about the technologies used in this project, refer to the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/learn)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
