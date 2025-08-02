// components/PracticeInterface.tsx
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Monitor, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { QuestionGenerator } from "./QuestionGenerator";
import { PracticeEditor } from "./PracticeEditor";
import { TestCaseRunner } from "./TestCaseRunner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const SUPPORTED_LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', ext: 'js' },
    { id: 'python', name: 'Python', ext: 'py' },
    { id: 'java', name: 'Java', ext: 'java' },
    { id: 'cpp', name: 'C++', ext: 'cpp' }
];

export function PracticeInterface() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [currentProblem, setCurrentProblem] = useState(null);
    const [code, setCode] = useState("");
    const [testResults, setTestResults] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleBackToEditor = () => {
        router.push("/");
    };

    const handleLanguageChange = (language: string) => {
        setSelectedLanguage(language);
        if (currentProblem?.functionSignature?.[language]) {
            setCode(currentProblem.functionSignature[language]);
        }
        setTestResults([]);
    };

    const cycleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    };

    const getThemeIcon = () => {
        if (!mounted) return <Monitor size={16} />;

        switch (theme) {
            case 'light':
                return <Sun size={16} />;
            case 'dark':
                return <Moon size={16} />;
            default:
                return <Monitor size={16} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleBackToEditor}
                        className="flex items-center gap-2 text-base"
                    >
                        <ArrowLeft size={16} />
                        Back to Editor
                    </Button>

                    <div className="h-6 w-px bg-border" />

                    <h1 className="text-xl font-bold text-foreground">Practice Mode</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Language:</span>
                        <div className="flex border rounded-lg p-1 bg-muted/50">
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <Button
                                    key={lang.id}
                                    variant={selectedLanguage === lang.id ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => handleLanguageChange(lang.id)}
                                    className="h-7 px-3 text-xs font-medium"
                                >
                                    {lang.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="h-6 w-px bg-border" />

                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={cycleTheme}
                        className="w-9 h-9 p-0"
                    >
                        {getThemeIcon()}
                    </Button>

                    <Badge variant="outline" className="text-xs">
                        {currentProblem ? 'Problem Selected' : 'No Problem'}
                    </Badge>
                </div>
            </div>

            {/* Resizable Main Content - Seamless */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Left Panel - Question Generator */}
                    <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
                        <QuestionGenerator
                            onProblemSelect={setCurrentProblem}
                            currentProblem={currentProblem}
                        />
                    </ResizablePanel>

                    <ResizableHandle className="w-0.5 bg-border hover:bg-border/80 transition-colors" />

                    {/* Right Panel - Code Editor and Test Cases */}
                    <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
                        <ResizablePanelGroup direction="vertical" className="h-full">
                            {/* Code Editor Panel */}
                            <ResizablePanel defaultSize={65} minSize={30} maxSize={80}>
                                <PracticeEditor
                                    currentProblem={currentProblem}
                                    code={code}
                                    onCodeChange={setCode}
                                    onTestResults={setTestResults}
                                    selectedLanguage={selectedLanguage}
                                />
                            </ResizablePanel>

                            <ResizableHandle className="h-0.5 bg-border hover:bg-border/80 transition-colors" />

                            {/* Test Cases Panel */}
                            <ResizablePanel defaultSize={35} minSize={20} maxSize={70}>
                                <TestCaseRunner
                                    testResults={testResults}
                                    currentProblem={currentProblem}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
