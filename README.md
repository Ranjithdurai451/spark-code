# SparkCode: Your AI-Powered DSA Companion

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Technologies](https://img.shields.io/badge/tech-Next.js%2C%20AI%20SDK%2C%20Monaco%20Editor-orange)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-sparkcode.fun-blueviolet)](https://sparkcode.fun)

SparkCode is an innovative AI-powered coding platform designed to revolutionize how you learn and solve Data Structures and Algorithms (DSA) problems. Get instant, in-depth analysis, generate smart test cases, auto-document your code, and seamlessly save to GitHub – all with the power of AI.

## ✨ Why SparkCode?

Tired of manual analysis, fragmented feedback, and losing your hard-earned solutions? SparkCode is your all-in-one AI coding mentor:

- **One-Click AI Code Analysis**: Get instant insights into Time Complexity (TC), Space Complexity (SC), optimal solutions, and improvements for your code.
- **AI-Powered Test Case Generation**: Automatically generate comprehensive test cases tailored to your code, and execute them in real-time.
- **Seamless GitHub Integration**: Save your solutions directly to GitHub and import code effortlessly, ensuring persistence and version control.
- **AI-Generated Documentation**: Auto-generate clear, concise explanations and insights for your code with a single click.
- **Multi-Language Support**: Practice in Java, Python, C++, C, Go, JavaScript, and TypeScript.
- **Enhanced Editor**: Enjoy a feature-rich Monaco Editor with themes, Vim mode, and focus mode.

## 🚀 Features

- **AI Code Analysis**: Deep dive into your code's performance and logic.
- **Automated Test Generation & Execution**: Validate your solutions with AI-generated tests.
- **GitHub Sync**: Easy saving and loading of code from your repositories.
- **AI Documentation**: Instant, perfect explanations for your code.
- **Multi-Language Environment**: Support for popular programming languages.
- **Interactive Editor**: Customizable coding experience with advanced features.
- **AI Chatbot**: Your personal DSA expert for explanations and debugging.
- **Secure API Key Management**: Your credentials are encrypted and secure.

## 🛠️ Technologies Used

- **Frontend**: Next.js, React, Shadcn UI, Tailwind CSS, Framer Motion, Monaco Editor, Zustand.
- **Backend**: Next.js API Routes, AI SDK (Google Gemini), Judge0 API, GitHub API, NextAuth.js.
- **Languages**: TypeScript (primary), JavaScript.
- **Package Manager**: Bun.

## 🌐 Live Demo

Experience SparkCode live at [https://sparkcode.fun](https://sparkcode.fun).

## 🏁 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/spark-code.git # Replace with your actual repository URL
    cd spark-code
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add the following:

    ```
    AUTH_SECRET=YOUR_AUTH_SECRET_HERE # Generate a strong secret
    GITHUB_ID=YOUR_GITHUB_CLIENT_ID_HERE
    GITHUB_SECRET=YOUR_GITHUB_CLIENT_SECRET_HERE
    NEXTAUTH_URL=http://localhost:3000 # Important for local development
    ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_HERE

    # Supabase (for user credits system)
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

    # Razorpay (for payments)
    NEXT_PUBLIC_RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID_HERE
    RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET_HERE
    ```

    - Register a GitHub OAuth App in your GitHub Developer Settings to get `GITHUB_ID` and `GITHUB_SECRET`.
    - Generate `AUTH_SECRET` (e.g., `openssl rand -base64 32`).
    - Set `NEXTAUTH_URL` to your local development URL (http://localhost:3000).
    - Generate `ENCRYPTION_KEY` for API key encryption (e.g., a random 64-character string).

    **Note:** Gemini and Judge0 API keys are provided by users through the app's settings when they first use the analysis features.
    - Set up a Supabase project and add the URL and service role key.
    - Register with Razorpay to get your API keys for payment processing.

4.  **Run the development server:**
    ```bash
    bun run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🤝 Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/learn)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
