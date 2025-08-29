# SparkCode: Your AI-Powered DSA Companion

## 1. What the Project/App Is and What It Does

SparkCode is an innovative AI-powered coding platform specifically designed for Data Structures and Algorithms (DSA) learners and developers. It serves as an intelligent companion to help users practice coding, analyze code quality, generate comprehensive test cases, and execute solutions with real-time feedback. The platform aims to significantly enhance programming skills and prepare users for technical interviews through intelligent AI assistance and multi-language support. Essentially, it's an interactive online IDE with integrated AI features for learning and practicing DSA.

## 2. All Features and Capabilities

SparkCode offers a rich set of features:

- **AI-Powered Code Analysis**: Provides in-depth analysis of code's functionality, algorithm patterns, time and space complexity, and overall quality, offering actionable feedback and optimization suggestions.
- **Automated Test Case Generation**: Automatically generates relevant and comprehensive test cases for user-provided code, helping to identify edge cases and ensure solution robustness.
- **Multi-Language Code Execution**: Allows execution of code in various popular programming languages (Java, Python, C++, C, Go, JavaScript, TypeScript) with real-time feedback on correctness, execution time, and memory usage.
- **Interactive Code Editor**: A feature-rich Monaco Editor with syntax highlighting, customizable settings (font size, Vim mode, relative line numbers, word wrap, tab size, insert spaces, format on save), and code formatting capabilities.
- **AI Chatbot (DSA Expert)**: An integrated AI assistant specialized in Data Structures & Algorithms, competitive programming, and interview preparation. It offers explanations of concepts, debugging help, optimization strategies, and complexity analysis.
- **GitHub Integration**:
  - Browse and select user's GitHub repositories.
  - View the file tree of selected repositories.
  - Fetch and load file content directly into the editor.
  - Save modified or new code files directly to GitHub repositories (can create a new repository if it doesn't exist, or update an existing file).
- **Code Documentation Generation**: Generates professional and concise documentation for code, including method-level descriptions (purpose, algorithm, complexity) and strategic inline comments for complex logic.
- **Theme Support**: Customizable light and dark themes for a personalized coding environment.
- **User Authentication**: Secure authentication via GitHub OAuth using NextAuth.js.
- **API Key Management**: Secure handling of external API keys (Google Gemini, Judge0) through encryption and storage in HTTP-only session cookies for authenticated users, or local validation for unauthenticated users.
- **Responsive UI**: Designed primarily for desktop use, with a clear indication for mobile users that the platform is not supported on smaller screens.
- **Dynamic Layout Controls**: Features draggable floating controls for toggling the side panel, switching between "Normal View" (editor + side panel) and "Code Mode" (fullscreen editor), with smooth animations.
- **Resizable Side Panel**: The side panel, which houses analysis, output, and test case results, is horizontally resizable via a draggable handle.

## 3. Technologies and Tools Used

- **Programming Languages**: TypeScript (primary), JavaScript, HTML, CSS.
- **Frontend Framework/Libraries**:
  - **Next.js**: Full-stack React framework for building the application.
  - **React**: UI library for building interactive user interfaces.
  - **Shadcn UI**: A collection of beautifully designed, accessible, and customizable UI components.
  - **Framer Motion**: For declarative animations and interactive components.
  - **Monaco Editor (`@monaco-editor/react`)**: The code editor component.
  - **Zustand**: A small, fast, and scalable bear-bones state-management solution.
  - **Next-themes**: For managing light/dark mode themes.
  - **Tailwind CSS**: A utility-first CSS framework for styling, processed via PostCSS.
  - **Prettier**: Code formatter, dynamically loaded with plugins for Babel, Estree, TypeScript, and Java.
  - **Monaco-Vim**: Provides Vim keybindings for the Monaco Editor.
- **Backend Technologies (Next.js API Routes)**:
  - **Next.js API Routes**: Serverless functions for handling backend logic.
  - **AI SDK (`ai`, `@ai-sdk/google`)**: For integrating with Google Gemini models for AI functionalities.
  - **Judge0 (External API)**: A robust online code execution system used for running user code in various languages.
  - **GitHub API**: Used for all GitHub-related operations (fetching repos, files, saving content).
  - **NextAuth.js**: Authentication library, specifically using GitHub OAuth provider.
  - **`apiKeyCrypto.ts`**: Custom utility for AES-256-GCM encryption of sensitive API keys.
- **Package Manager**: Bun (indicated by `bun.lock` and `bun run` scripts).
- **Linting**: ESLint (`eslint-config-next`, `next/typescript` configurations).
- **Type Checking**: TypeScript (`tsconfig.json` with `strict: true`).

## 4. How It Works (Architecture/Workflow)

SparkCode operates as a full-stack Next.js application, leveraging both client-side and server-side capabilities:

- **Frontend (Client-Side)**:
  - The user interface is built with React components and styled with Tailwind CSS and Shadcn UI.
  - The core interaction happens within the Monaco Editor, where users write and edit code.
  - Client-side state (e.g., editor tabs, settings) is managed using Zustand.
  - Animations and interactive elements are powered by Framer Motion.
  - User actions (e.g., running code, requesting analysis, chatting) trigger API calls to the Next.js backend.
- **Backend (Next.js API Routes)**:
  - All server-side logic is handled by Next.js API routes located in `src/app/api/`.
  - **Authentication**: NextAuth.js manages user sessions and GitHub OAuth. User GitHub access tokens are securely stored.
  - **API Key Management**: Gemini and Judge0 API keys are either validated locally or, for authenticated users, encrypted using AES-256-GCM and stored in HTTP-only session cookies.
  - **AI Services**: API routes (e.g., `/api/analyze`, `/api/generate-tests`, `/api/chatbot`, `/api/generate-documentation`) construct detailed prompts based on user input and code context. These prompts are then sent to Google Gemini models via the `@ai-sdk/google` library. The AI's responses are processed and returned to the frontend.
  - **Code Execution**: The `/api/execute` route receives user code and language. It then sends this code to the external Judge0 API for compilation and execution. Judge0 returns the output, errors, and performance metrics, which the API route formats and sends back.
  - **GitHub Integration**: Routes like `/api/github-repos`, `/api/github-tree`, `/api/github-file`, and `/api/github-save` interact with the GitHub API using the user's authenticated token to fetch repository information, file contents, and commit changes.
- **Overall Workflow**:
  1.  A user accesses the SparkCode web application.
  2.  They can optionally sign in with GitHub to enable GitHub integration and secure API key storage.
  3.  They write or import code into the Monaco Editor.
  4.  They can then use various features:
      - **Run Code**: Sends code to `/api/execute`, which forwards to Judge0, and displays results.
      - **Analyze Code**: Sends code to `/api/analyze`, which prompts Gemini for a detailed review, and displays the analysis.
      - **Generate Tests**: Sends code to `/api/generate-tests`, which prompts Gemini to create test cases, and displays them.
      - **Generate Documentation**: Sends code to `/api/generate-documentation`, which prompts Gemini to add comments, and updates the editor.
      - **Chat with AI**: Interacts with the `/api/chatbot` route, which uses Gemini as a DSA expert.
      - **GitHub Operations**: Interacts with GitHub API routes to browse, fetch, and save files.

## 5. Target Users and Use Cases

- **Target Users**:
  - **Students**: Learning Data Structures and Algorithms in academic settings.
  - **Job Seekers**: Preparing for technical interviews (especially for software engineering roles).
  - **Developers**: Looking for AI-assisted tools to improve code quality, generate tests, or understand complex algorithms.
  - **Educators**: Teaching programming and DSA concepts.
- **Use Cases**:
  - **DSA Practice**: Solving algorithmic problems and getting instant feedback on solutions.
  - **Interview Preparation**: Practicing coding challenges with an AI mentor providing insights and optimizations.
  - **Code Review & Refactoring**: Submitting code for AI analysis to identify bugs, inefficiencies, and style issues.
  - **Test-Driven Development (TDD)**: Automatically generating initial test cases for a function before writing the implementation.
  - **Learning New Languages/Algorithms**: Experimenting with different languages and understanding how various algorithms are implemented and perform.
  - **Documentation**: Quickly generating initial documentation for functions or code snippets.
  - **GitHub Integration**: Easily pulling code from personal repositories to work on, and saving solutions back.

## 6. Pricing/Availability

- **Availability**: SparkCode is an open-source project, implying it is freely available for anyone to clone, run, and modify from its GitHub repository.
- **Pricing**: The application itself does not have a direct pricing model. However, it relies on external third-party API services:
  - **Google Gemini API**: Requires a `GEMINI_API_KEY`, obtainable from Google AI Studio. Usage may be subject to Google's pricing and free tier limits.
  - **Judge0 API**: Requires a `JUDGE0_KEY`, obtainable from RapidAPI. Usage may be subject to RapidAPI's and Judge0's pricing tiers (which often include a free tier with usage limits).
  - **GitHub API**: Used for integration, subject to GitHub's API rate limits.

Users are responsible for obtaining and managing their own API keys for these services.

## 7. Pros and Cons

**Pros**:

- **Comprehensive AI Assistance**: Integrates multiple AI capabilities (analysis, test generation, documentation, chatbot) specifically tailored for DSA.
- **Multi-Language Support**: Supports a wide range of popular programming languages for both execution and AI analysis.
- **Interactive & Customizable Editor**: Provides a modern, feature-rich coding environment with extensive customization options.
- **Seamless GitHub Integration**: Facilitates easy import, export, and version control of code directly from the platform.
- **Real-time Feedback**: Offers immediate execution results and AI insights, accelerating the learning and debugging process.
- **Modern Tech Stack**: Built with Next.js, React, and other contemporary tools, ensuring a performant and scalable application.
- **Secure API Key Handling**: Employs encryption for API keys when users are authenticated.

**Cons**:

- **External API Dependency**: Requires users to obtain and manage API keys for Gemini and Judge0, which might involve external costs or usage limits.
- **No Mobile Support**: Explicitly designed for desktop, limiting accessibility on mobile devices.
- **Initial Setup**: Requires environment variable configuration for API keys, which might be a barrier for absolute beginners.
- **Performance Variability**: Relies on external API response times, which can introduce latency.
- **No Integrated Testing Framework for Itself**: While it generates tests for user code, the project itself doesn't explicitly mention an internal testing framework for its own codebase in the `package.json` scripts.

## 8. Competitors or Alternatives

SparkCode operates in a competitive landscape of coding education and AI development tools:

- **AI Coding Assistants**:
  - **GitHub Copilot**: Provides AI-powered code suggestions and completions directly in the IDE.
  - **Amazon CodeWhisperer**: Similar to Copilot, offering AI code generation.
  - **Google Gemini Code Assistant**: Google's own AI for code generation and assistance.
  - **ChatGPT / Large Language Models**: Can be used for code explanation, debugging, and generation, though often less integrated.
- **Online Coding Platforms**:
  - **LeetCode, HackerRank, Codeforces**: Dedicated platforms for competitive programming and interview preparation, offering problem sets, online judges, and community features.
  - **Replit, CodeSandbox**: Online IDEs for collaborative coding and rapid prototyping.
- **Code Analysis Tools**:
  - **SonarQube, ESLint, Prettier**: Static code analysis and formatting tools (SparkCode's analysis is AI-driven).
- **Documentation Generators**:
  - **Javadoc, Sphinx, Doxygen**: Traditional tools for generating API documentation (SparkCode's is AI-driven).

SparkCode differentiates itself by integrating a comprehensive suite of AI-powered DSA-specific features within a single, interactive editor environment, with a strong focus on learning and interview preparation.

## 9. Recent Updates or Developments

Based on the codebase analysis:

- **Next.js 15.4.5 & React 19.1.0**: The project utilizes very recent versions of core frameworks, indicating a modern and actively maintained tech stack.
- **UI/UX Refinements**: Recent changes in `src/app/page.tsx` (e.g., renaming "Focus Mode" to "Code Mode", dynamic panel animations) suggest continuous improvement in user interface and experience.
- **Enhanced API Key Handling**: The `src/app/api/validate-keys/route.ts` file shows recent additions like a `skipVerification` parameter, indicating ongoing work on robust and flexible API key management.
- **Improved AI Prompts and Logic**: Files like `src/app/api/generate-tests/route.ts` and `src/app/api/execute/route.ts` contain "Enhanced" prompts and functions for AI interaction and code execution, demonstrating continuous efforts to improve the accuracy and effectiveness of AI-driven features.
- **Dynamic Prettier Plugin Loading**: The `CodeEditor.tsx` dynamically loads Prettier plugins, including a Java plugin, indicating support for formatting across multiple languages.
- **Vim Mode Integration**: The editor now supports Vim keybindings, catering to a broader range of developer preferences.
