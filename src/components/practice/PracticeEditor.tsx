// components/practice/PracticeEditor.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, Code, RotateCcw } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useState } from "react";

const LANGUAGE_CONFIGS = {
    javascript: { name: 'JavaScript', monaco: 'javascript' },
    python: { name: 'Python', monaco: 'python' },
    java: { name: 'Java', monaco: 'java' },
    cpp: { name: 'C++', monaco: 'cpp' }
};

interface PracticeEditorProps {
    currentProblem: any;
    code: string;
    onCodeChange: (code: string) => void;
    onTestResults: (results: any[]) => void;
    selectedLanguage: string;
}

export function PracticeEditor({
    currentProblem,
    code,
    onCodeChange,
    onTestResults,
    selectedLanguage
}: PracticeEditorProps) {
    const { theme } = useTheme();
    const [isRunning, setIsRunning] = useState(false);

    const languageConfig = LANGUAGE_CONFIGS[selectedLanguage as keyof typeof LANGUAGE_CONFIGS] || LANGUAGE_CONFIGS.javascript;

    const runCode = async () => {
        if (!currentProblem || !code.trim()) {
            alert("Please select a problem and write some code");
            return;
        }

        setIsRunning(true);
        onTestResults([]);

        try {
            const response = await fetch('/api/execute-practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: selectedLanguage,
                    testCases: currentProblem.testCases
                })
            });

            if (!response.ok) {
                throw new Error('Execution failed');
            }

            const data = await response.json();
            onTestResults(data.results || []);
        } catch (error) {
            console.error('Execution error:', error);
            alert('Code execution failed. Please check your code.');
        } finally {
            setIsRunning(false);
        }
    };

    const resetCode = () => {
        if (currentProblem?.functionSignature?.[selectedLanguage]) {
            onCodeChange(currentProblem.functionSignature[selectedLanguage]);
        }
    };

    if (!currentProblem) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <div className="text-center p-8">
                    <Code size={64} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Ready to Code?</h3>
                    <p className="text-base text-muted-foreground">Select a problem to start coding with {languageConfig.name}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Fixed Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Code size={20} />
                        <span className="text-lg font-semibold text-foreground">Code</span>
                        <Badge variant="outline" className="text-sm font-medium">
                            {languageConfig.name}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={resetCode}
                            className="text-base"
                        >
                            <RotateCcw size={16} className="mr-2" />
                            Reset
                        </Button>

                        <Button
                            onClick={runCode}
                            disabled={isRunning}
                            className="text-base font-medium px-6 py-2"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play size={16} className="mr-2" />
                                    Run
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Monaco Editor - Takes remaining space */}
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={languageConfig.monaco}
                    value={code || currentProblem.functionSignature[selectedLanguage] || ''}
                    onChange={(value) => onCodeChange(value || '')}
                    theme={theme === "dark" ? "vs-dark" : "vs-light"}
                    options={{
                        fontSize: 16,
                        lineHeight: 24,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        lineNumbers: 'on',
                        glyphMargin: true,
                        folding: true,
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        renderWhitespace: 'none',
                        renderLineHighlight: 'all',
                        bracketPairColorization: { enabled: true },
                        guides: {
                            bracketPairs: true,
                            indentation: true
                        },
                        padding: { top: 16, bottom: 16 }
                    }}
                />
            </div>
        </div>
    );
}
