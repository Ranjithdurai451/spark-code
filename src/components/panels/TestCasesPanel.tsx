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
    SkipForward
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tab } from "@/store/editorStore";
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
    error: Error | null;
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

        // Default generic error
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
            // Check for AI error responses first
            if (content.includes('"error"') && content.includes('NO_FUNCTION_FOUND')) {
                const errorDetails = categorizeError('no_function_found', 'ai_generation');
                setApiError(errorDetails);
                return cases;
            }

            // Try to parse as JSON array
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.map((testCase, index) => {
                        // Validate test case structure
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

            // Fallback parsing for markdown format
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

    // Handle external errors
    useEffect(() => {
        if (error) {
            const errorDetails = categorizeError(error.message?.message || error.message || 'Unknown error');
            setApiError(errorDetails);
        } else {
            // Only clear API error if it matches the external error
            if (apiError?.type === 'network' || apiError?.type === 'api') {
                setApiError(null);
            }
        }
    }, [error, apiError, categorizeError]);

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
            setApiError(null); // Clear errors when starting new generation
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
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

            // Auto-expand failed tests and show detailed feedback
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

            // Update counters based on result
            const updatedTestCase = testCases[i];
            if (updatedTestCase.status === 'passed') passedCount++;
            else if (updatedTestCase.status === 'failed') failedCount++;

            setProgress(((i + 1) / testCases.length) * 100);

            // Small delay between tests to improve UX
            if (i < testCases.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        setRunningTests(false);
        setCurrentTestIndex(0);

        // Enhanced completion feedback
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
        // return JSON.stringify(value, null, 2);
        return JSON.stringify(value);
    };

    // const formatLeetCodeInput = (input: any[]): string => {
    //     if (!Array.isArray(input)) return formatValue(input);
    //     if (input.length === 1) return formatValue(input[0]);
    //     return input.map(param => formatValue(param)).join(', ');
    // };
    const formatLeetCodeInput = (input: any[]): string => {
        if (!Array.isArray(input)) return formatValue(input);
        if (input.length === 1) return formatValue(input[0]);
        // Join parameters with compact formatting
        return input.map(param => formatValue(param)).join(', ');
    };

    // Enhanced status display with animations
    const getStatusDisplay = (testCase: TestCase) => {
        switch (testCase.status) {
            case 'running':
                return {
                    icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
                    badge: <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 animate-pulse">Running</Badge>,
                    color: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                };
            case 'passed':
                return {
                    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                    badge: <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">Passed</Badge>,
                    color: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                };
            case 'failed':
                return {
                    icon: <XCircle className="w-4 h-4 text-red-500" />,
                    badge: <Badge variant="destructive">Failed</Badge>,
                    color: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                };
            case 'skipped':
                return {
                    icon: <SkipForward className="w-4 h-4 text-yellow-500" />,
                    badge: <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Skipped</Badge>,
                    color: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
                };
            default:
                return {
                    icon: <Clock className="w-4 h-4 text-gray-400" />,
                    badge: <Badge variant="outline">Pending</Badge>,
                    color: 'border-border'
                };
        }
    };

    // Enhanced error display component
    const ErrorDisplay = ({ error: errorDetails }: { error: ErrorDetails }) => {
        const getErrorIcon = () => {
            switch (errorDetails.type) {
                case 'validation': return <AlertTriangle className="h-4 w-4" />;
                case 'network': return <ExternalLink className="h-4 w-4" />;
                case 'timeout': return <Clock className="h-4 w-4" />;
                case 'parsing': return <FileText className="h-4 w-4" />;
                case 'api': return <Bot className="h-4 w-4" />;
                default: return <AlertCircle className="h-4 w-4" />;
            }
        };

        const getErrorColor = () => {
            switch (errorDetails.type) {
                case 'validation': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30';
                case 'network': return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30';
                case 'timeout': return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30';
                default: return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30';
            }
        };

        return (
            <Alert className={`${getErrorColor()} border`}>
                <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                        {getErrorIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <AlertDescription>
                            <div className="space-y-2">
                                <div>
                                    <h4 className="font-medium text-sm">{errorDetails.title}</h4>
                                    <p className="text-sm text-muted-foreground">{errorDetails.description}</p>
                                </div>

                                {errorDetails.suggestion && (
                                    <div className="flex items-start gap-2 p-2 bg-background/50 rounded border border-border/50">
                                        <Info className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                                        <p className="text-xs text-muted-foreground">{errorDetails.suggestion}</p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    {errorDetails.retryable && (
                                        <Button onClick={onReload} variant="outline" size="sm" className="h-7 text-xs">
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            Retry
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => setApiError(null)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                    >
                                        <X className="w-3 h-3 mr-1" />
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
        );
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
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgb(156 163 175) transparent',
                        scrollBehavior: 'smooth'
                    }}
                    onScroll={handleScroll}
                >
                    <div className="p-3 space-y-3 max-w-full">
                        {/* Enhanced Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                    <Brain className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold">AI Test Runner</h2>
                                    <p className="text-xs text-muted-foreground">Intelligent code testing with analysis</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    <Code className="w-3 h-3 mr-1" />
                                    {tab?.language?.toUpperCase() || 'CODE'}
                                </Badge>
                                {totalTests > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {totalTests} test{totalTests !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Error Display */}
                        {(error || apiError) && (
                            <ErrorDisplay error={apiError || categorizeError(error?.message?.message || error?.message || 'Unknown error')} />
                        )}

                        {!error && !apiError && (
                            <>
                                {/* Enhanced Stats Dashboard */}
                                {totalTests > 0 && (
                                    <Card className="border-2">
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-4 gap-4 mb-4">
                                                <div className="text-center p-2 rounded-lg bg-muted/50">
                                                    <div className="text-lg font-bold text-primary">{totalTests}</div>
                                                    <div className="text-xs text-muted-foreground">Total</div>
                                                </div>
                                                <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                                                    <div className="text-lg font-bold text-green-600">{passedTests}</div>
                                                    <div className="text-xs text-muted-foreground">Passed</div>
                                                </div>
                                                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                                                    <div className="text-lg font-bold text-red-600">{failedTests}</div>
                                                    <div className="text-xs text-muted-foreground">Failed</div>
                                                </div>
                                                <div className="text-center p-2 rounded-lg bg-primary/10">
                                                    <div className="text-lg font-bold">{Math.round(successRate)}%</div>
                                                    <div className="text-xs text-muted-foreground">Success</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">Progress</span>
                                                    <span>{passedTests}/{totalTests} passed</span>
                                                </div>
                                                <Progress value={successRate} className="h-2" />
                                            </div>

                                            {passedTests === totalTests && totalTests > 0 && (
                                                <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-sm font-medium">All tests passed! 🎉</span>
                                                    </div>
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                        Your solution works correctly for all test cases
                                                    </p>
                                                </div>
                                            )}

                                            {failedTests > 0 && (
                                                <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 rounded-lg border border-red-200 dark:border-red-800">
                                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                                        <XCircle className="w-4 h-4" />
                                                        <span className="text-sm font-medium">{failedTests} test{failedTests > 1 ? 's' : ''} failed</span>
                                                    </div>
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                        Review the failed tests below for detailed analysis
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Enhanced Action Controls */}
                                <Card>
                                    <CardContent className="p-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                onClick={() => setShowAddDialog(true)}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs"
                                            >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add Test
                                            </Button>

                                            {totalTests > 0 && (
                                                <>
                                                    <Button
                                                        onClick={runningTests ? pauseTests : runAllTests}
                                                        disabled={isGeneratingTests}
                                                        size="sm"
                                                        className="h-8 text-xs"
                                                    >
                                                        {runningTests ? (
                                                            <>
                                                                <Pause className="w-3 h-3 mr-1" />
                                                                Pause
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Zap className="w-3 h-3 mr-1" />
                                                                Run All ({totalTests})
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                onClick={() => setExpandedTests(new Set(testCases.map(tc => tc.id)))}
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={totalTests === 0}
                                                                className="h-8 text-xs"
                                                            >
                                                                <ChevronDown className="w-3 h-3 mr-1" />
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
                                                                className="h-8 text-xs"
                                                            >
                                                                <ChevronRight className="w-3 h-3 mr-1" />
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
                                                <Button
                                                    onClick={onClear}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="w-3 h-3 mr-1" />
                                                    Clear All
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Enhanced Progress Indicator */}
                                {runningTests && (
                                    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                                        <CardContent className="p-3">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                                        Running test {currentTestIndex + 1} of {totalTests}
                                                    </span>
                                                    <span className="font-medium">{Math.round(progress)}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2" />
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        {passedTests} passed • {failedTests} failed • {skippedTests} skipped
                                                    </span>
                                                    <Button
                                                        onClick={pauseTests}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                    >
                                                        <Pause className="w-2 h-2 mr-1" />
                                                        Stop
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Enhanced Test Cases Display */}
                                {!isGeneratingTests && (
                                    <div className="space-y-3">
                                        {testCases.map((testCase, index) => {
                                            const { icon, badge, color } = getStatusDisplay(testCase);
                                            const isExpanded = expandedTests.has(testCase.id);
                                            const isRunning = runningTestId === testCase.id;

                                            return (
                                                <Card
                                                    key={testCase.id}
                                                    className={`transition-all py-0 duration-200 hover:shadow-md ${color} ${isRunning ? 'ring-2 ring-blue-500/50' : ''}`}
                                                >
                                                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(testCase.id)}>
                                                        <CollapsibleTrigger asChild>
                                                            <CardHeader className="py-6 cursor-pointer hover:bg-muted/50 transition-colors">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        {icon}
                                                                        <div className="min-w-0">
                                                                            <CardTitle className="text-sm flex items-center gap-2">
                                                                                Test Case {index + 1}
                                                                                {testCase.isCustom && (
                                                                                    <Badge variant="outline" className="text-xs px-1">Custom</Badge>
                                                                                )}
                                                                            </CardTitle>
                                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                                                {testCase.executionTime && (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Timer className="w-3 h-3" />
                                                                                        {testCase.executionTime}ms
                                                                                    </span>
                                                                                )}
                                                                                <span className="truncate max-w-[200px]">
                                                                                    Input: {formatLeetCodeInput(testCase.input)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        {badge}
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                        </CollapsibleTrigger>

                                                        <CollapsibleContent>
                                                            <CardContent className="pt-0">
                                                                <Separator className="mb-4" />

                                                                <div className="space-y-4 pb-4">
                                                                    {/* Enhanced Input/Output Display */}
                                                                    <div className="grid gap-3">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium text-muted-foreground">
                                                                                Input Parameters
                                                                            </Label>
                                                                            <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                                                                                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                                                                    {formatLeetCodeInput(testCase.input)}
                                                                                </pre>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid md:grid-cols-2 gap-3">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-sm font-medium text-green-700 dark:text-green-400">
                                                                                    Expected Output
                                                                                </Label>
                                                                                <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg">
                                                                                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                                                                        {formatValue(testCase.output)}
                                                                                    </pre>
                                                                                </div>
                                                                            </div>

                                                                            {testCase.actualOutput !== undefined && (
                                                                                <div className="space-y-2">
                                                                                    <Label className={`text-sm font-medium ${testCase.status === 'passed'
                                                                                        ? 'text-green-700 dark:text-green-400'
                                                                                        : 'text-red-700 dark:text-red-400'
                                                                                        }`}>
                                                                                        Actual Output
                                                                                    </Label>
                                                                                    <div className={`p-3 rounded-lg border ${testCase.status === 'passed'
                                                                                        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                                                                                        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                                                                                        }`}>
                                                                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
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
                                                                            <Label className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                                                                                <AlertCircle className="w-4 h-4" />
                                                                                Error Details
                                                                            </Label>
                                                                            <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded-lg">
                                                                                <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                                                                                    {testCase.error}
                                                                                </pre>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Enhanced AI Analysis */}
                                                                    {testCase.explanation && (
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                                                                <Brain className="w-4 h-4" />
                                                                                AI Analysis
                                                                            </Label>
                                                                            <div className="p-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-lg">
                                                                                <p className="text-xs text-blue-700 dark:text-blue-300 break-words">
                                                                                    {testCase.explanation}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Enhanced Action Buttons */}
                                                                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                                                        <Button
                                                                            onClick={() => runTest(testCase)}
                                                                            disabled={testCase.status === 'running' || runningTests}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-7 text-xs"
                                                                        >
                                                                            {testCase.status === 'running' ? (
                                                                                <>
                                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                                    Running...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <PlayCircle className="w-3 h-3 mr-1" />
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
                                                                                    className="h-7 text-xs"
                                                                                >
                                                                                    <Copy className="w-3 h-3" />
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
                                                                                className="h-7 text-xs text-yellow-600 hover:text-yellow-700"
                                                                            >
                                                                                <SkipForward className="w-3 h-3 mr-1" />
                                                                                Skip
                                                                            </Button>
                                                                        )}

                                                                        <div className="flex-1" />

                                                                        <Button
                                                                            onClick={() => removeTest(testCase.id)}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                        >
                                                                            <Trash2 className="w-3 h-3 mr-1" />
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
                                    <Card className="text-center border-2 border-dashed">
                                        <CardContent className="p-8">
                                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mb-4">
                                                <TestTube className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-base font-medium mb-2">No Test Cases</h3>
                                            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                                Create custom test cases or let AI generate them based on your code.
                                            </p>
                                            <div className="flex gap-3 justify-center">
                                                <Button onClick={() => setShowAddDialog(true)} className="h-9">
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Custom Test
                                                </Button>
                                                <Button
                                                    onClick={onReload}
                                                    variant="outline"
                                                    className="h-9"
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
                                    <Card className="text-center border-2 border-primary/20 bg-primary/5">
                                        <CardContent className="p-8">
                                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-4">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            </div>
                                            <h3 className="text-base font-medium mb-2">Generating Test Cases</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                AI is analyzing your code and creating appropriate test cases...
                                            </p>
                                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Plus className="w-5 h-5" />
                                Add Custom Test Case
                            </DialogTitle>
                        </DialogHeader>

                        <Tabs defaultValue="simple" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="simple" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Simple Format
                                </TabsTrigger>
                                <TabsTrigger value="json" className="flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    JSON Format
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="simple" className="space-y-4 mt-6">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="simple-input" className="text-sm font-medium">
                                            Input Parameters
                                        </Label>
                                        <Input
                                            id="simple-input"
                                            value={newTestInput}
                                            onChange={(e) => setNewTestInput(e.target.value)}
                                            placeholder='Example: [2,7,11,15], 9'
                                            className="font-mono"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter function parameters separated by commas
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="simple-output" className="text-sm font-medium">
                                            Expected Output
                                        </Label>
                                        <Input
                                            id="simple-output"
                                            value={newTestOutput}
                                            onChange={(e) => setNewTestOutput(e.target.value)}
                                            placeholder='Example: [0,1]'
                                            className="font-mono"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter the expected result from your function
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="json" className="space-y-4 mt-6">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="json-input" className="text-sm font-medium">
                                            Input Parameters (JSON Array)
                                        </Label>
                                        <Textarea
                                            id="json-input"
                                            value={newTestInput}
                                            onChange={(e) => setNewTestInput(e.target.value)}
                                            placeholder='[[2, 7, 11, 15], 9]'
                                            className="font-mono h-24 resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Each function parameter should be an element in the array
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="json-output" className="text-sm font-medium">
                                            Expected Output (JSON)
                                        </Label>
                                        <Textarea
                                            id="json-output"
                                            value={newTestOutput}
                                            onChange={(e) => setNewTestOutput(e.target.value)}
                                            placeholder='[0, 1]'
                                            className="font-mono h-24 resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            The expected return value in JSON format
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {apiError && (
                            <Alert className="border-destructive/50 bg-destructive/5 mt-4">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <AlertDescription className="text-destructive text-sm">
                                    <strong>{apiError.title}:</strong> {apiError.description}
                                </AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter className="gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddDialog(false);
                                    setNewTestInput("");
                                    setNewTestOutput("");
                                    setApiError(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={addTest}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Test Case
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enhanced Analysis Dialog */}
                <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                    <DialogContent className="max-w-5xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Brain className="w-5 h-5" />
                                Detailed Test Analysis
                            </DialogTitle>
                        </DialogHeader>

                        {selectedTestCase && (
                            <div className="max-h-[70vh] overflow-y-auto pr-2">
                                <div className="space-y-6">
                                    {/* Test Overview */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Test Overview
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                                                    <div className="flex items-center justify-center gap-2">
                                                        {getStatusDisplay(selectedTestCase).icon}
                                                        <span className="font-medium capitalize text-sm">{selectedTestCase.status}</span>
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                    <div className="text-xs text-muted-foreground mb-1">Execution Time</div>
                                                    <div className="font-medium text-sm">
                                                        {selectedTestCase.executionTime ? `${selectedTestCase.executionTime}ms` : 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                    <div className="text-xs text-muted-foreground mb-1">Output Match</div>
                                                    <div className="font-medium text-sm">
                                                        {selectedTestCase.status === 'passed' ? '✅ Yes' :
                                                            selectedTestCase.status === 'failed' ? '❌ No' : '⏳ Pending'}
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                                    <div className="text-xs text-muted-foreground mb-1">Test Type</div>
                                                    <div className="font-medium text-sm">
                                                        {selectedTestCase.isCustom ? '👤 Custom' : '🤖 AI Generated'}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Input/Output Comparison */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Input/Output Analysis
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <Label className="text-sm font-medium mb-2 block">Input Parameters</Label>
                                                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                                                        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                                            {formatValue(selectedTestCase.input)}
                                                        </pre>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 block">
                                                            Expected Output
                                                        </Label>
                                                        <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg">
                                                            <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                                                {formatValue(selectedTestCase.output)}
                                                            </pre>
                                                        </div>
                                                    </div>

                                                    {selectedTestCase.actualOutput !== undefined && (
                                                        <div>
                                                            <Label className={`text-sm font-medium mb-2 block ${selectedTestCase.status === 'passed'
                                                                ? 'text-green-700 dark:text-green-400'
                                                                : 'text-red-700 dark:text-red-400'
                                                                }`}>
                                                                Actual Output
                                                            </Label>
                                                            <div className={`p-4 rounded-lg border ${selectedTestCase.status === 'passed'
                                                                ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                                                                : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                                                                }`}>
                                                                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                                                    {formatValue(selectedTestCase.actualOutput)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* AI Analysis Section */}
                                    {selectedTestCase.explanation && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Bot className="w-4 h-4" />
                                                    AI Analysis & Insights
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-lg">
                                                    <div className="prose prose-sm max-w-none">
                                                        <p className="text-sm text-blue-900 dark:text-blue-100 break-words leading-relaxed">
                                                            {selectedTestCase.explanation}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Error Analysis */}
                                    {selectedTestCase.error && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Error Analysis
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded-lg">
                                                        <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                                                            Error Details
                                                        </h4>
                                                        <pre className="text-sm font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                                                            {selectedTestCase.error}
                                                        </pre>
                                                    </div>

                                                    <div className="p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800 rounded-lg">
                                                        <div className="flex items-start gap-2">
                                                            <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                                                    Debugging Suggestions
                                                                </h4>
                                                                <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                                                                    <li>• Check your function's return type and format</li>
                                                                    <li>• Verify input parameter handling</li>
                                                                    <li>• Look for syntax or compilation errors</li>
                                                                    <li>• Test with simpler inputs first</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Performance Metrics */}
                                    {selectedTestCase.executionTime && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Timer className="w-4 h-4" />
                                                    Performance Metrics
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-primary">{selectedTestCase.executionTime}ms</div>
                                                        <div className="text-xs text-muted-foreground">Execution Time</div>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-muted-foreground">
                                                            {selectedTestCase.executionTime < 100 ? '🚀 Fast' :
                                                                selectedTestCase.executionTime < 1000 ? '⚡ Normal' : '🐌 Slow'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">Performance</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="mt-6">
                            <Button onClick={() => setShowAnalysisDialog(false)}>
                                Close Analysis
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
} 