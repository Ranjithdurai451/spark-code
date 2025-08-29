# SparkCode: Your AI-Powered DSA Companion

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Technologies](https://img.shields.io/badge/tech-Next.js%2C%20AI%20SDK%2C%20Monaco%20Editor-orange)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-sparkcode.fun-blueviolet)](https://sparkcode.fun)

SparkCode is an innovative AI-powered coding platform specifically designed for Data Structures and Algorithms (DSA) learners and developers. It provides powerful tools to help you practice coding, analyze your code's quality, generate comprehensive test cases, and execute solutions with real-time feedback. This platform aims to significantly enhance your programming skills and prepare you to excel in technical interviews through intelligent AI assistance and multi-language support.

## ✨ Why SparkCode?

Solving Data Structures and Algorithms (DSA) problems can be frustrating, especially when seeking detailed analysis, generating comprehensive tests, or ensuring your code is well-documented and persistently saved. Traditional methods often involve inefficient manual prompting on chat apps or the risk of losing valuable solutions. SparkCode is built to be your ultimate AI-powered companion, offering:

- **One-Click AI Code Analysis**: Go beyond simple pass/fail. Get instant, in-depth AI-driven insights into your code's Time Complexity (TC), Space Complexity (SC), optimal solutions, alternative approaches, and logical improvements. Understand _why_ your code works or doesn't, with unparalleled clarity.
- **AI-Powered Test Case Generation**: Stop manually crafting test cases. SparkCode intelligently analyzes your code and automatically generates relevant, comprehensive test cases, helping you identify edge cases and validate your solutions with real-time execution across multiple languages.
- **Seamless GitHub Integration & Code Persistence**: Never lose your solutions again. Easily log in with GitHub to save your code directly to your repositories or import existing code, ensuring version control and effortless access.
- **AI-Generated Documentation**: Automatically generate professional, concise explanations and insights for your code with a single click, replacing tedious manual commenting and ensuring perfect documentation for future reference.
- **Multi-Language Mastery**: Seamlessly switch between popular programming languages like Java, Python, C++, C, Go, JavaScript, and TypeScript, expanding your versatility.
- **Interview Readiness**: Practice with confidence, knowing you have an AI mentor to refine your solutions and prepare you for technical assessments.

## 🚀 Features

SparkCode offers a rich set of features to supercharge your DSA learning:

- **One-Click AI Code Analysis**: Instantly receive in-depth analysis of your code's functionality, algorithm patterns, Time Complexity (TC), Space Complexity (SC), optimal solutions, and overall quality with a single click.
- **AI-Powered Test Case Generation & Execution**: The platform intelligently analyzes your code to understand the problem you're solving and automatically generates relevant, comprehensive test cases. Execute these tests directly to get real-time feedback and identify edge cases.
- **Multi-Language Code Execution**: Execute your code in various popular programming languages (Java, Python, C++, C, Go, JavaScript, TypeScript) with real-time output and error reporting.
- **Interactive Code Editor**: A feature-rich Monaco Editor offering syntax highlighting, customizable settings (Vim mode, relative line numbers, word wrap, formatting on save), and a focus mode for distraction-free coding.
- **AI Chatbot (DSA Expert)**: An integrated AI assistant specialized in DSA, competitive programming, and interview preparation, offering explanations, debugging, and optimization strategies.
- **Single-Click AI Documentation Generation**: Automatically generates professional, concise, and insightful documentation for your code with just one click, ensuring perfect explanations for future reference.
- **GitHub Integration**: Seamlessly save your code to your GitHub repositories and import existing code from GitHub, ensuring version control and easy access to your solutions.
- **Theme Support**: Customizable light and dark themes for a personalized and comfortable coding environment.
- **Secure API Key Management**: Your Google Gemini and Judge0 API keys are securely handled through encryption, ensuring your credentials remain private.

## 🛠️ Technologies Used

- **Frontend**: Next.js, React, Shadcn UI, Tailwind CSS, Framer Motion, Monaco Editor, Zustand.
- **Backend**: Next.js API Routes, AI SDK (Google Gemini), Judge0 API, GitHub API, NextAuth.js.
- **Languages**: TypeScript (primary), JavaScript.
- **Package Manager**: Bun.

## 🌐 Live Demo

Experience SparkCode live at [https://sparkcode.fun](https://sparkcode.fun).

## 🏁 Getting Started

To get started with SparkCode, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/spark-code.git # Replace with your actual repository URL
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
    NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET # Generate a strong secret
    GITHUB_ID=YOUR_GITHUB_CLIENT_ID
    GITHUB_SECRET=YOUR_GITHUB_CLIENT_SECRET
    ```

    - You can obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
    - For Judge0, you can sign up for an API key on [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce).
    - For GitHub OAuth, register an OAuth App in your GitHub Developer Settings to get `GITHUB_ID` and `GITHUB_SECRET`.
    - Generate a strong `NEXTAUTH_SECRET` (e.g., using `openssl rand -base64 32`).

4.  **Run the development server:**
    ```bash
    bun dev
    # or npm run dev
    # or yarn dev
    # or pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📚 Learn More

To learn more about the technologies used in this project, refer to the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/learn)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
