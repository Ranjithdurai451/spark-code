# Agent Guidelines for spark-code

This document outlines the essential commands and code style guidelines for agents operating within this repository.

## Commands

- **Build:** `bun run build`
- **Lint:** `bun run lint`
- **Run Development Server:** `bun run dev`
- **Start Production Server:** `bun run start`
- **Tests:** There is no explicit test script. Look for test files (e.g., `*.test.ts`, `*.spec.ts`) and use `bun test <file_path>` if a test runner is configured, or consult `package.json` for any implicit testing setup.

## Code Style Guidelines

- **Language:** TypeScript
- **Formatting:** Adhere to `next/core-web-vitals` and `next/typescript` ESLint configurations. Use `prettier` for code formatting.
- **Imports:** Use absolute imports with `@/` prefix for internal modules (e.g., `import { foo } from '@/utils/foo';`).
- **Typing:** Strict type checking is enforced (`"strict": true` in `tsconfig.json`). Ensure all variables, function parameters, and return types are explicitly typed where possible.
- **Naming Conventions:** Follow standard TypeScript/JavaScript conventions (e.g., `camelCase` for variables and functions, `PascalCase` for components and types).
- **Error Handling:** Implement robust error handling using `try-catch` blocks for asynchronous operations and API calls.
