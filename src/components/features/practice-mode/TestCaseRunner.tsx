// components/practice/TestCaseRunner.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Play } from "lucide-react";

interface TestResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime: string;
    error?: string;
}

interface TestCaseRunnerProps {
    testResults: TestResult[];
    currentProblem: any;
}

export function TestCaseRunner({ testResults, currentProblem }: TestCaseRunnerProps) {
    if (!currentProblem) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <div className="text-center p-8">
                    <Play size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Test Results</h3>
                    <p className="text-base text-muted-foreground">Run your code to see test results</p>
                </div>
            </div>
        );
    }

    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;

    return (
        <div className="h-full bg-background flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b bg-background">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-foreground">Test Results</h3>
                    {testResults.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {passedTests}/{totalTests} Passed
                        </span>
                    )}
                </div>
            </div>

            {/* Test Results Content */}
            <div className="flex-1 overflow-hidden">
                {testResults.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center p-8">
                            <Play size={32} className="mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Click "Run Code" to execute your solution</p>
                        </div>
                    </div>
                ) : (
                    <Tabs defaultValue="case-0" className="h-full flex flex-col">
                        {/* Test Case Tabs - LeetCode Style */}
                        <div className="flex-shrink-0 border-b bg-background">
                            <TabsList className="h-auto p-0 bg-transparent w-full justify-start rounded-none">
                                {testResults.map((result, index) => (
                                    <TabsTrigger
                                        key={index}
                                        value={`case-${index}`}
                                        className="relative px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent hover:bg-muted/50 flex items-center gap-2 text-sm"
                                    >
                                        <span>Case {index + 1}</span>
                                        {result.passed ? (
                                            <CheckCircle size={12} className="text-green-600" />
                                        ) : (
                                            <XCircle size={12} className="text-red-600" />
                                        )}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {/* Test Case Content */}
                        <div className="flex-1 overflow-hidden">
                            {testResults.map((result, index) => (
                                <TabsContent
                                    key={index}
                                    value={`case-${index}`}
                                    className="h-full m-0 overflow-y-auto"
                                >
                                    <div className="p-4 space-y-4">
                                        {/* Test Case Status */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {result.passed ? (
                                                    <CheckCircle size={16} className="text-green-600" />
                                                ) : (
                                                    <XCircle size={16} className="text-red-600" />
                                                )}
                                                <span className="text-sm font-medium">
                                                    {result.passed ? "Accepted" : "Wrong Answer"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock size={12} />
                                                {result.executionTime}
                                            </div>
                                        </div>

                                        {/* Test Details - Clean LeetCode Style */}
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                                                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                                                    {result.input}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Expected</div>
                                                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                                                    {result.expectedOutput}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                                                <div className="bg-muted p-3 rounded-md text-sm font-mono">
                                                    {result.actualOutput}
                                                </div>
                                            </div>

                                            {result.error && (
                                                <div>
                                                    <div className="text-xs font-medium text-red-600 mb-1">Runtime Error</div>
                                                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md text-sm text-red-600">
                                                        {result.error}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                )}
            </div>
        </div>
    );
}
