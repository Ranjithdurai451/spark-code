"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    TestTube,
    RotateCcw,
    X,
    AlertCircle,
    Plus,
    Trash2,
    Bot,
    Eye,
    Zap,
    Brain,
    Code,
    Timer,
    Target,
    Loader2,
    PlayCircle,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    ChevronDown,
    ChevronRight,
    Copy,
    ExternalLink,
    AlertTriangle,
    Info,
    Pause,
    SkipForward,
    TrendingUp,
    Activity
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tab } from "@/components/features/editor/editorStore";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TestCase {
    id: string;
    input: any[];
    output: any;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    actualOutput?: any;
    error?: string;
    explanation?: string;
    executionTime?: number;
    isCustom?: boolean;
}

interface TestCasesPanelProps {
    tab: Tab | undefined;
    error: { message: string; suggestion?: string; category?: string } | null;
    latestTests: any;
    isGeneratingTests: boolean;
    status: string;
    onClear: () => void;
    onReload: () => void;
}

interface ErrorDetails {
    type: 'validation' | 'network' | 'parsing' | 'execution' | 'api' | 'timeout';
    title: string;
    description: string;
    suggestion?: string;
    retryable: boolean;
}

export function TestCasesPanel({
    tab,
    error,
    latestTests,
    isGeneratingTests,
    status,
    onClear,
    onReload
}: TestCasesPanelProps) {
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [runningTests, setRunningTests] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
    const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
    const [newTestInput, setNewTestInput] = useState("");
    const [newTestOutput, setNewTestOutput] = useState("");
    const [apiError, setApiError] = useState<ErrorDetails | null>(null);
    const [progress, setProgress] = useState(0);
    const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
    const [runningTestId, setRunningTestId] = useState<string | null>(null);
    const [pauseRequested, setPauseRequested] = useState(false);
    const [currentTestIndex, setCurrentTestIndex] = useState(0);

    // Scroll management refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isUserScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastContentLengthRef = useRef(0);

    // Enhanced error categorization
    const categorizeError = useCallback((errorMessage: string, context: string = 'general'): ErrorDetails => {
        const message = errorMessage.toLowerCase();

        if (message.includes('no function found') || message.includes('no_function_found')) {
            return {
                type: 'validation',
                title: 'No Function Detected',
                description: 'The code does not contain a recognizable function that can be tested.',
                suggestion: 'Ensure your code includes a complete function definition with proper syntax.',
                retryable: true
            };
        }

        if (message.includes('insufficient_code') || message.includes('too short')) {
            return {
                type: 'validation',
                title: 'Incomplete Code',
                description: 'The provided code is too short or incomplete for analysis.',
                suggestion: 'Include a complete function implementation with proper structure.',
                retryable: true
            };
        }

        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return {
                type: 'network',
                title: 'Network Error',
                description: 'Unable to connect to the testing service.',
                suggestion: 'Check your internet connection and try again.',
                retryable: true
            };
        }

        if (message.includes('timeout') || message.includes('time out')) {
            return {
                type: 'timeout',
                title: 'Request Timeout',
                description: 'The request took too long to complete.',
                suggestion: 'Try again with simpler test cases or check your code complexity.',
                retryable: true
            };
        }

        if (message.includes('parse') || message.includes('json') || message.includes('invalid format')) {
            return {
                type: 'parsing',
                title: 'Parsing Error',
                description: 'Unable to parse the test case data or AI response.',
                suggestion: 'Check your input format and ensure it follows JSON syntax.',
                retryable: false
            };
        }

        if (message.includes('api') || message.includes('service unavailable')) {
            return {
                type: 'api',
                title: 'Service Unavailable',
                description: 'The AI testing service is temporarily unavailable.',
                suggestion: 'Please try again in a few moments.',
                retryable: true
            };
        }

        if (message.includes('compilation') || message.includes('syntax')) {
            return {
                type: 'execution',
                title: 'Code Compilation Error',
                description: 'Your code has syntax or compilation errors.',
                suggestion: 'Review your code syntax and fix any compilation errors.',
                retryable: false
            };
        }

        return {
            type: 'execution',
            title: 'Execution Error',
            description: errorMessage || 'An unexpected error occurred during execution.',
            suggestion: 'Review your code and try again.',
            retryable: true
        };
    }, []);

    // Handle user scroll detection
    const handleScroll = useCallback(() => {
        isUserScrollingRef.current = true;

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            isUserScrollingRef.current = false;
        }, 1500);
    }, []);

    // Enhanced test case parsing with better error handling
    const parseTestCases = useCallback((content: string): TestCase[] => {
        const cases: TestCase[] = [];

        if (!content || content.includes("ERROR:") || content.trim().length === 0) {
            return cases;
        }

        try {
            if (content.includes('"error"') && content.includes('NO_FUNCTION_FOUND')) {
                const errorDetails = categorizeError('no_function_found', 'ai_generation');
                setApiError(errorDetails);
                return cases;
            }

            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.map((testCase, index) => {
                        if (!testCase.input || testCase.output === undefined) {
                            console.warn(`Test case ${index + 1} has invalid structure:`, testCase);
                            return null;
                        }

                        return {
                            id: `ai-test-${index + 1}`,
                            input: Array.isArray(testCase.input) ? testCase.input : [testCase.input],
                            output: testCase.output,
                            status: 'pending' as const,
                            isCustom: false
                        };
                    }).filter(Boolean) as TestCase[];
                }
            }

            const pattern = /\*\*Input:\*\*\s*([^\n*]+)\s*\*\*(?:Expected\s*)?Output:\*\*\s*([^\n*]+)/gi;
            let match;
            let index = 0;

            while ((match = pattern.exec(content)) !== null && index < 10) {
                const input = match[1]?.trim().replace(/[`*]/g, '');
                const expectedOutput = match[2]?.trim().replace(/[`*]/g, '');

                if (input && expectedOutput) {
                    cases.push({
                        id: `test-${++index}`,
                        input: [input],
                        output: expectedOutput,
                        status: 'pending',
                        isCustom: false
                    });
                }
            }

            return cases;
        } catch (parseError) {
            console.error("Error parsing test cases:", parseError);
            const errorDetails = categorizeError('Failed to parse AI response', 'parsing');
            setApiError(errorDetails);
            return cases;
        }
    }, [categorizeError]);

    // Parse test cases when AI response comes
    useEffect(() => {
        if (latestTests?.content && !isGeneratingTests) {
            const parsed = parseTestCases(latestTests.content);
            if (parsed.length > 0) {
                setTestCases(parsed);
                setApiError(null);
                toast.success(`Generated ${parsed.length} test cases successfully`, {
                    description: `Ready to run ${parsed.length} test case${parsed.length > 1 ? 's' : ''}`
                });
            } else if (!apiError) {
                const errorDetails = categorizeError('No valid test cases found in AI response', 'parsing');
                setApiError(errorDetails);
            }
        }
    }, [latestTests, isGeneratingTests, parseTestCases, apiError]);

    // Handle external errors - Updated to use the same format as AnalysisPanel
    useEffect(() => {
        if (error) {
            setApiError({
                type: 'execution',
                title: 'Test Generation Failed',
                description: error.message,
                suggestion: error.suggestion,
                retryable: true
            });
        } else {
            if (apiError?.type === 'network' || apiError?.type === 'api') {
                setApiError(null);
            }
        }
    }, [error, apiError]);

    // Smart auto-scroll for streaming content
    useEffect(() => {
        if (isGeneratingTests && latestTests?.content) {
            const currentLength = latestTests.content.length;

            if (!isUserScrollingRef.current &&
                currentLength > lastContentLengthRef.current &&
                scrollContainerRef.current) {

                requestAnimationFrame(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                            top: scrollContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                });
            }

            lastContentLengthRef.current = currentLength;
        }
    }, [latestTests?.content, isGeneratingTests]);

    // Reset scroll tracking when generation starts
    useEffect(() => {
        if (isGeneratingTests) {
            isUserScrollingRef.current = false;
            lastContentLengthRef.current = 0;
            setApiError(null);
        }
    }, [isGeneratingTests]);

    // Enhanced run single test with better error handling
    const runTest = useCallback(async (testCase: TestCase) => {
        if (!tab?.code) {
            const errorDetails = categorizeError('No code available to test', 'validation');
            setApiError(errorDetails);
            return;
        }

        setTestCases(prev => prev.map(tc =>
            tc.id === testCase.id ? { ...tc, status: 'running' } : tc
        ));
        setRunningTestId(testCase.id);

        const startTime = Date.now();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch("/api/ai-execute", {
                method: "POST",
                body: JSON.stringify({
                    code: tab.code,
                    language: tab.language,
                    input: testCase.input,
                    expectedOutput: testCase.output
                }),
                headers: { "Content-Type": "application/json" },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            const executionTime = Date.now() - startTime;

            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? {
                    ...tc,
                    status: data.passed ? 'passed' : 'failed',
                    actualOutput: data.actualOutput,
                    error: data.error || null,
                    explanation: data.explanation || "",
                    executionTime
                } : tc
            ));

            if (!data.passed) {
                setExpandedTests(prev => new Set([...prev, testCase.id]));
                toast.error(`Test ${testCase.id.replace(/.*-/, '')} failed`, {
                    description: data.explanation || 'Output did not match expected result'
                });
            } else {
                toast.success(`Test ${testCase.id.replace(/.*-/, '')} passed`, {
                    description: `Completed in ${executionTime}ms`
                });
            }

        } catch (error: any) {
            const executionTime = Date.now() - startTime;

            let errorMessage = 'Execution failed';
            if (error.name === 'AbortError') {
                errorMessage = 'Test execution timed out';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? {
                    ...tc,
                    status: 'failed',
                    error: errorMessage,
                    actualOutput: 'Execution failed',
                    executionTime
                } : tc
            ));

            setExpandedTests(prev => new Set([...prev, testCase.id]));

            const errorDetails = categorizeError(errorMessage, 'execution');
            toast.error(`Test execution failed: ${errorDetails.title}`, {
                description: errorDetails.description
            });
        } finally {
            setRunningTestId(null);
        }
    }, [tab, categorizeError]);

    // Enhanced run all tests with pause/resume capability
    const runAllTests = useCallback(async () => {
        if (testCases.length === 0) return;

        setRunningTests(true);
        setProgress(0);
        setExpandedTests(new Set());
        setPauseRequested(false);
        setCurrentTestIndex(0);

        let passedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < testCases.length; i++) {
            if (pauseRequested) {
                toast.info('Test execution paused');
                break;
            }

            setCurrentTestIndex(i);
            await runTest(testCases[i]);

            const updatedTestCase = testCases[i];
            if (updatedTestCase.status === 'passed') passedCount++;
            else if (updatedTestCase.status === 'failed') failedCount++;

            setProgress(((i + 1) / testCases.length) * 100);

            if (i < testCases.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        setRunningTests(false);
        setCurrentTestIndex(0);

        if (!pauseRequested) {
            const totalRun = passedCount + failedCount;
            if (passedCount === totalRun && totalRun > 0) {
                toast.success(`All ${totalRun} tests passed! 🎉`, {
                    description: 'Your solution works correctly for all test cases'
                });
            } else if (failedCount > 0) {
                toast.error(`${failedCount} of ${totalRun} tests failed`, {
                    description: 'Check the failed tests for more details'
                });
            }
        }
    }, [testCases, runTest, pauseRequested]);

    // Pause test execution
    const pauseTests = useCallback(() => {
        setPauseRequested(true);
        setRunningTests(false);
        toast.info('Stopping test execution...');
    }, []);

    // Skip current test
    const skipTest = useCallback((testId: string) => {
        setTestCases(prev => prev.map(tc =>
            tc.id === testId ? { ...tc, status: 'skipped' } : tc
        ));
        toast.info('Test skipped');
    }, []);

    // Enhanced add test with validation
    const addTest = () => {
        if (!newTestInput.trim() || !newTestOutput.trim()) {
            const errorDetails = categorizeError('Both input and output are required', 'validation');
            setApiError(errorDetails);
            return;
        }

        try {
            let parsedInput;
            try {
                parsedInput = JSON.parse(newTestInput.trim());
                if (!Array.isArray(parsedInput)) {
                    parsedInput = [parsedInput];
                }
            } catch {
                parsedInput = [newTestInput.trim()];
            }

            let parsedOutput;
            try {
                parsedOutput = JSON.parse(newTestOutput.trim());
            } catch {
                parsedOutput = newTestOutput.trim();
            }

            const newTest: TestCase = {
                id: `custom-${Date.now()}`,
                input: parsedInput,
                output: parsedOutput,
                status: 'pending',
                isCustom: true
            };

            setTestCases(prev => [...prev, newTest]);
            setShowAddDialog(false);
            setNewTestInput("");
            setNewTestOutput("");
            setApiError(null);
            toast.success("Custom test case added successfully");
        } catch (error) {
            const errorDetails = categorizeError('Invalid JSON format in input or output', 'parsing');
            setApiError(errorDetails);
        }
    };

    // Remove test with confirmation for custom tests
    const removeTest = (id: string) => {
        const testCase = testCases.find(tc => tc.id === id);
        setTestCases(prev => prev.filter(tc => tc.id !== id));
        setExpandedTests(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });

        const isCustom = testCase?.isCustom;
        toast.success(`${isCustom ? 'Custom' : 'Generated'} test case removed`);
    };

    // Copy test case data
    const copyTestCase = useCallback((testCase: TestCase) => {
        const data = {
            input: testCase.input,
            output: testCase.output,
            ...(testCase.actualOutput && { actualOutput: testCase.actualOutput }),
            ...(testCase.error && { error: testCase.error })
        };

        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        toast.success('Test case data copied to clipboard');
    }, []);

    // Toggle test expansion
    const toggleExpanded = (id: string) => {
        setExpandedTests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Format display values
    const formatValue = (value: any): string => {
        if (typeof value === 'string') return value;
        return JSON.stringify(value);
    };

    const formatLeetCodeInput = (input: any[]): string => {
        if (!Array.isArray(input)) return formatValue(input);
        if (input.length === 1) return formatValue(input[0]);
        return input.map(param => formatValue(param)).join(', ');
    };

    // Enhanced status display using only shadcn colors
    const getStatusDisplay = (testCase: TestCase) => {
        switch (testCase.status) {
            case 'running':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    badge: <Badge variant="secondary" className="animate-pulse">Running</Badge>,
                    color: 'border-border hover:border-muted-foreground/50'
                };
            case 'passed':
                return {
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    badge: <Badge variant="secondary">Passed</Badge>,
                    color: 'border-border bg-muted/30'
                };
            case 'failed':
                return {
                    icon: <XCircle className="w-4 h-4" />,
                    badge: <Badge variant="outline">Failed</Badge>,
                    color: 'border-muted-foreground/30 bg-muted/20'
                };
            case 'skipped':
                return {
                    icon: <SkipForward className="w-4 h-4 text-muted-foreground" />,
                    badge: <Badge variant="secondary">Skipped</Badge>,
                    color: 'border-muted-foreground/20 bg-muted/10'
                };
            default:
                return {
                    icon: <Clock className="w-4 h-4 text-muted-foreground" />,
                    badge: <Badge variant="outline">Pending</Badge>,
                    color: 'border-border'
                };
        }
    };

    // Clear errors and reset
    const handleClearError = () => {
        setApiError(null);
        onClear();
    };

    // Handle retry with proper error clearing
    const handleRetry = () => {
        setApiError(null);
        onReload();
    };

    const passedTests = testCases.filter(tc => tc.status === 'passed').length;
    const failedTests = testCases.filter(tc => tc.status === 'failed').length;
    const skippedTests = testCases.filter(tc => tc.status === 'skipped').length;
    const totalTests = testCases.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return (
        <TooltipProvider>
            <div className="h-full flex flex-col min-w-0">
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
                    onScroll={handleScroll}
                >
                    <div className="p-4 space-y-4 max-w-full">
                        {/* Enhanced Header with improved spacing and hierarchy */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-muted border shadow-sm">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">AI Test Runner</h2>
                                    <p className="text-sm text-muted-foreground">Intelligent code testing with analysis</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-mono">
                                    <Code className="w-3 h-3 mr-1" />
                                    {tab?.language?.toUpperCase() || 'CODE'}
                                </Badge>
                                {totalTests > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        <Activity className="w-3 h-3 mr-1" />
                                        {totalTests} test{totalTests !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Error Display - Updated to match AnalysisPanel styling */}
                        {(error || apiError) && (
                            <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">Test Generation Failed</h3>

                                            {/* User-friendly error message */}
                                            <p className="text-sm text-red-700 dark:text-red-200 mb-2 break-words">
                                                {apiError?.description || error?.message || 'An unexpected error occurred during test generation'}
                                            </p>

                                            {/* Show suggestion if available */}
                                            {(apiError?.suggestion || error?.suggestion) && (
                                                <div className="mb-3 p-2 bg-red-100 dark:bg-red-800/30 rounded border border-red-200 dark:border-red-700">
                                                    <p className="text-xs text-red-800 dark:text-red-200">
                                                        <strong>💡 Suggestion:</strong> {apiError?.suggestion || error?.suggestion}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Show category if available */}
                                            {(apiError?.category || error?.category) && (
                                                <div className="mb-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200">
                                                        {apiError?.category || error?.category}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={handleRetry}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
                                                    disabled={isGeneratingTests}
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    {isGeneratingTests ? 'Retrying...' : 'Retry Generation'}
                                                </Button>
                                                <Button
                                                    onClick={handleClearError}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20"
                                                >
                                                    Clear Error
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {!error && !apiError && (
                            <>
                                {/* Enhanced Stats Dashboard with better visual hierarchy */}
                                {totalTests > 0 && (
                                    <Card className="border-2 shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="grid grid-cols-4 gap-3 mb-5">
                                                <div className="text-center p-3 rounded-lg bg-muted/50 border">
                                                    <div className="text-2xl font-bold">{totalTests}</div>
                                                    <div className="text-xs text-muted-foreground font-medium">Total</div>
                                                </div>
                                                <div className="text-center p-3 rounded-lg bg-background border-2 shadow-sm">
                                                    <div className="text-2xl font-bold">{passedTests}</div>
                                                    <div className="text-xs text-muted-foreground font-medium">Passed</div>
                                                </div>
                                                <div className="text-center p-3 rounded-lg bg-muted/30 border">
                                                    <div className="text-2xl font-bold">{failedTests}</div>
                                                    <div className="text-xs text-muted-foreground font-medium">Failed</div>
                                                </div>
                                                <div className="text-center p-3 rounded-lg bg-background border shadow-sm">
                                                    <div className="text-2xl font-bold">{Math.round(successRate)}%</div>
                                                    <div className="text-xs text-muted-foreground font-medium">Success</div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        Progress
                                                    </span>
                                                    <span className="font-mono">{passedTests}/{totalTests}</span>
                                                </div>
                                                <Progress value={successRate} className="h-2.5" />
                                            </div>

                                            {passedTests === totalTests && totalTests > 0 && (
                                                <div className="mt-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                        <span className="text-sm font-semibold">All tests passed! 🎉</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Your solution works correctly for all test cases
                                                    </p>
                                                </div>
                                            )}

                                            {failedTests > 0 && (
                                                <div className="mt-4 p-4 bg-muted/20 rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="w-5 h-5" />
                                                        <span className="text-sm font-semibold">{failedTests} test{failedTests > 1 ? 's' : ''} failed</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Review the failed tests below for detailed analysis
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Enhanced Action Controls with better grouping */}
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                onClick={() => setShowAddDialog(true)}
                                                variant="outline"
                                                size="sm"
                                                className="h-9 shadow-sm"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Test
                                            </Button>

                                            {totalTests > 0 && (
                                                <>
                                                    <Button
                                                        onClick={runningTests ? pauseTests : runAllTests}
                                                        disabled={isGeneratingTests}
                                                        size="sm"
                                                        className="h-9 shadow-sm"
                                                    >
                                                        {runningTests ? (
                                                            <>
                                                                <Pause className="w-4 h-4 mr-2" />
                                                                Pause
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Zap className="w-4 h-4 mr-2" />
                                                                Run All ({totalTests})
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Separator orientation="vertical" className="h-6" />

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                onClick={() => setExpandedTests(new Set(testCases.map(tc => tc.id)))}
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={totalTests === 0}
                                                                className="h-9"
                                                            >
                                                                <ChevronDown className="w-4 h-4 mr-2" />
                                                                Expand All
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Expand all test cases to show details</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                onClick={() => setExpandedTests(new Set())}
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={totalTests === 0}
                                                                className="h-9"
                                                            >
                                                                <ChevronRight className="w-4 h-4 mr-2" />
                                                                Collapse All
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Collapse all test cases to hide details</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )}

                                            {latestTests && (
                                                <>
                                                    <div className="flex-1" />
                                                    <Button
                                                        onClick={handleClearError}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="w-4 h-4 mr-2" />
                                                        Clear All
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Enhanced Progress Indicator */}
                                {runningTests && (
                                    <Card className="border-2 bg-muted/20 shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-2 text-sm font-medium">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Running test {currentTestIndex + 1} of {totalTests}
                                                    </span>
                                                    <span className="font-mono text-sm">{Math.round(progress)}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2.5" />
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="font-medium">
                                                        {passedTests} passed • {failedTests} failed • {skippedTests} skipped
                                                    </span>
                                                    <Button
                                                        onClick={pauseTests}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                    >
                                                        <Pause className="w-3 h-3 mr-1" />
                                                        Stop
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Enhanced Test Cases Display with improved visual hierarchy */}
                                {!isGeneratingTests && (
                                    <div className="space-y-3">
                                        {testCases.map((testCase, index) => {
                                            const { icon, badge, color } = getStatusDisplay(testCase);
                                            const isExpanded = expandedTests.has(testCase.id);
                                            const isRunning = runningTestId === testCase.id;

                                            return (
                                                <Card
                                                    key={testCase.id}
                                                    className={`transition-all duration-300 hover:shadow-md ${color} ${isRunning ? 'ring-2 ring-offset-2 ring-muted-foreground/20' : ''} ${isExpanded ? 'shadow-lg' : 'shadow-sm'}`}
                                                >
                                                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(testCase.id)}>
                                                        <CollapsibleTrigger asChild>
                                                            <CardHeader className="py-5 cursor-pointer hover:bg-muted/20 transition-colors duration-200 rounded-t-lg">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="p-2 rounded-lg bg-background border shadow-sm">
                                                                            {icon}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <CardTitle className="text-sm flex items-center gap-3">
                                                                                Test Case {index + 1}
                                                                                {testCase.isCustom && (
                                                                                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                                                                                        <Target className="w-3 h-3 mr-1" />
                                                                                        Custom
                                                                                    </Badge>
                                                                                )}
                                                                            </CardTitle>
                                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                                                                {testCase.executionTime && (
                                                                                    <span className="flex items-center gap-1 font-mono">
                                                                                        <Timer className="w-3 h-3" />
                                                                                        {testCase.executionTime}ms
                                                                                    </span>
                                                                                )}
                                                                                <span className="truncate max-w-[250px] font-mono">
                                                                                    Input: {formatLeetCodeInput(testCase.input)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                                        {badge}
                                                                        <div className="p-1 rounded hover:bg-muted/50 transition-colors">
                                                                            {isExpanded ? (
                                                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                                            ) : (
                                                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                        </CollapsibleTrigger>

                                                        <CollapsibleContent>
                                                            <CardContent className="pt-0 pb-5">
                                                                <Separator className="mb-5" />

                                                                <div className="space-y-5">
                                                                    {/* Enhanced Input/Output Display with better spacing */}
                                                                    <div className="space-y-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                                                <FileText className="w-4 h-4" />
                                                                                Input Parameters
                                                                            </Label>
                                                                            <div className="p-4 bg-muted/30 rounded-lg border shadow-inner">
                                                                                <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                                                                                    {formatLeetCodeInput(testCase.input)}
                                                                                </pre>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid md:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-semibold flex items-center gap-2">
                                                                                    <Target className="w-4 h-4" />
                                                                                    Expected Output
                                                                                </Label>
                                                                                <div className="p-4 bg-background border-2 border-dashed rounded-lg shadow-inner">
                                                                                    <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                                                                                        {formatValue(testCase.output)}
                                                                                    </pre>
                                                                                </div>
                                                                            </div>

                                                                            {testCase.actualOutput !== undefined && (
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-sm font-semibold flex items-center gap-2">
                                                                                        <Activity className="w-4 h-4" />
                                                                                        Actual Output
                                                                                    </Label>
                                                                                    <div className={`p-4 rounded-lg border-2 shadow-inner ${testCase.status === 'passed'
                                                                                        ? 'bg-background border-border'
                                                                                        : 'bg-muted/30 border-muted-foreground/30'
                                                                                        }`}>
                                                                                        <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                                                                                            {formatValue(testCase.actualOutput)}
                                                                                        </pre>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Enhanced Error Display */}
                                                                    {testCase.error && (
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                                                <AlertCircle className="w-4 h-4" />
                                                                                Error Details
                                                                            </Label>
                                                                            <div className="p-4 bg-muted/20 border-2 border-muted-foreground/30 rounded-lg shadow-inner">
                                                                                <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                                                                                    {testCase.error}
                                                                                </pre>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Enhanced AI Analysis */}
                                                                    {testCase.explanation && (
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-semibold flex items-center gap-2">
                                                                                <Brain className="w-4 h-4" />
                                                                                AI Analysis
                                                                            </Label>
                                                                            <div className="p-4 bg-background border-2 border-dashed rounded-lg shadow-inner">
                                                                                <p className="text-sm break-words leading-relaxed">
                                                                                    {testCase.explanation}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Enhanced Action Buttons */}
                                                                    <div className="flex items-center gap-3 pt-3 border-t">
                                                                        <Button
                                                                            onClick={() => runTest(testCase)}
                                                                            disabled={testCase.status === 'running' || runningTests}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-8 shadow-sm"
                                                                        >
                                                                            {testCase.status === 'running' ? (
                                                                                <>
                                                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                                                    Running...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <PlayCircle className="w-4 h-4 mr-2" />
                                                                                    Run Test
                                                                                </>
                                                                            )}
                                                                        </Button>

                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    onClick={() => copyTestCase(testCase)}
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0"
                                                                                >
                                                                                    <Copy className="w-4 h-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Copy test case data</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>

                                                                        {testCase.status === 'running' && (
                                                                            <Button
                                                                                onClick={() => skipTest(testCase.id)}
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 text-muted-foreground"
                                                                            >
                                                                                <SkipForward className="w-4 h-4 mr-2" />
                                                                                Skip
                                                                            </Button>
                                                                        )}

                                                                        <div className="flex-1" />

                                                                        <Button
                                                                            onClick={() => removeTest(testCase.id)}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                                            Remove
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Enhanced Empty State */}
                                {testCases.length === 0 && !isGeneratingTests && (
                                    <Card className="text-center border-2 border-dashed shadow-sm">
                                        <CardContent className="p-10">
                                            <div className="mx-auto w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                                <TestTube className="w-10 h-10 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-3">No Test Cases</h3>
                                            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                                                Create custom test cases or let AI generate them based on your code to get started.
                                            </p>
                                            <div className="flex gap-4 justify-center">
                                                <Button onClick={() => setShowAddDialog(true)} className="shadow-sm">
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Custom Test
                                                </Button>
                                                <Button
                                                    onClick={handleRetry}
                                                    variant="outline"
                                                    className="shadow-sm"
                                                    disabled={isGeneratingTests}
                                                >
                                                    {isGeneratingTests ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Bot className="w-4 h-4 mr-2" />
                                                            Generate with AI
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Enhanced Loading State */}
                                {isGeneratingTests && (
                                    <Card className="text-center border-2 bg-muted/20 shadow-sm">
                                        <CardContent className="p-10">
                                            <div className="mx-auto w-20 h-20 bg-background border shadow-inner rounded-full flex items-center justify-center mb-6">
                                                <Loader2 className="w-10 h-10 animate-spin" />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-3">Generating Test Cases</h3>
                                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                                AI is analyzing your code and creating appropriate test cases...
                                            </p>
                                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Enhanced Add Test Dialog */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-xl">
                                <div className="p-2 rounded-lg bg-muted border">
                                    <Plus className="w-5 h-5" />
                                </div>
                                Add Custom Test Case
                            </DialogTitle>
                        </DialogHeader>

                        <Tabs defaultValue="simple" className="w-full mt-4">
                            <TabsList className="grid w-full grid-cols-2 p-1">
                                <TabsTrigger value="simple" className="flex items-center gap-2 data-[state=active]:shadow-sm">
                                    <FileText className="w-4 h-4" />
                                    Simple Format
                                </TabsTrigger>
                                <TabsTrigger value="json" className="flex items-center gap-2 data-[state=active]:shadow-sm">
                                    <Code className="w-4 h-4" />
                                    JSON Format
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="simple" className="space-y-6 mt-6">
                                <div className="grid gap-5">
                                    <div className="space-y-3">
                                        <Label htmlFor="simple-input" className="text-sm font-semibold flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Input Parameters
                                        </Label>
                                        <Input
                                            id="simple-input"
                                            value={newTestInput}
                                            onChange={(e) => setNewTestInput(e.target.value)}
                                            placeholder='Example: [2,7,11,15], 9'
                                            className="font-mono h-12 shadow-sm"
                                        />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Enter function parameters separated by commas. Arrays and objects should be in JSON format.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="simple-output" className="text-sm font-semibold flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Expected Output
                                        </Label>
                                        <Input
                                            id="simple-output"
                                            value={newTestOutput}
                                            onChange={(e) => setNewTestOutput(e.target.value)}
                                            placeholder='Example: [0,1]'
                                            className="font-mono h-12 shadow-sm"
                                        />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Enter the expected result from your function. Use JSON format for complex data types.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="json" className="space-y-6 mt-6">
                                <div className="grid gap-5">
                                    <div className="space-y-3">
                                        <Label htmlFor="json-input" className="text-sm font-semibold flex items-center gap-2">
                                            <Code className="w-4 h-4" />
                                            Input Parameters (JSON Array)
                                        </Label>
                                        <Textarea
                                            id="json-input"
                                            value={newTestInput}
                                            onChange={(e) => setNewTestInput(e.target.value)}
                                            placeholder='[[2, 7, 11, 15], 9]'
                                            className="font-mono h-12 resize-none shadow-sm"
                                        />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Each function parameter should be an element in the JSON array. Complex data structures are supported.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="json-output" className="text-sm font-semibold flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Expected Output (JSON)
                                        </Label>
                                        <Textarea
                                            id="json-output"
                                            value={newTestOutput}
                                            onChange={(e) => setNewTestOutput(e.target.value)}
                                            placeholder='[0, 1]'
                                            className="font-mono h-12 resize-none shadow-sm"
                                        />
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            The expected return value in JSON format. Supports all data types including nested objects and arrays.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {apiError && (
                            <Alert className="border-muted-foreground/30 bg-muted/20 mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    <strong>{apiError.title}:</strong> {apiError.description}
                                </AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter className="gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddDialog(false);
                                    setNewTestInput("");
                                    setNewTestOutput("");
                                    setApiError(null);
                                }}
                                className="shadow-sm"
                            >
                                Cancel
                            </Button>
                            <Button onClick={addTest} className="shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Test Case
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
