// app/api/execute/route.ts
import { NextRequest, NextResponse } from "next/server";

const LANGUAGE_MAP: Record<string, number> = {
    python: 71,
    javascript: 63,
    cpp: 54,
    java: 62,
    c: 50,
    go: 60,
    rust: 73,
    typescript: 74
};

const JUDGE0_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const JUDGE0_KEY = process.env.JUDGE0_KEY;

if (!JUDGE0_KEY) {
    throw new Error("JUDGE0_KEY environment variable is required");
}

export async function POST(req: NextRequest) {
    try {
        const { code, language, input } = await req.json();

        // Validate inputs
        if (!code || !language) {
            return NextResponse.json(
                { error: "Code and language are required" }, 
                { status: 400 }
            );
        }

        const languageId = LANGUAGE_MAP[language.toLowerCase()];
        if (!languageId) {
            return NextResponse.json(
                { 
                    error: `Unsupported language: ${language}`, 
                    supportedLanguages: Object.keys(LANGUAGE_MAP) 
                }, 
                { status: 400 }
            );
        }

        // Execute code
        const result = await executeCode({
            code,
            languageId,
            input: input || ""
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Execution error:", error);
        return NextResponse.json(
            { error: "Internal server error" }, 
            { status: 500 }
        );
    }
}

async function executeCode({ 
    code, 
    languageId, 
    input 
}: { 
    code: string; 
    languageId: number; 
    input: string; 
}) {
    const response = await fetch(`${JUDGE0_URL}?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": JUDGE0_KEY!,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: input,
        }),
    });

    if (!response.ok) {
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Format the output
    let output = data.stdout || "";
    
    if (data.stderr) {
        output += output ? `\n\nErrors:\n${data.stderr}` : data.stderr;
    }
    
    if (data.compile_output) {
        output += output ? `\n\nCompile Output:\n${data.compile_output}` : data.compile_output;
    }
    
    if (!output && data.message) {
        output = data.message;
    }
    
    if (!output) {
        output = "No output generated";
    }

    return {
        output,
        status: data.status?.description || "completed",
        time: data.time,
        memory: data.memory,
        exitCode: data.exit_code
    };
}
