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
  Activity,
  Database,
  Cpu,
  Network,
  Layers,
  FileCode2,
  WrapText,
  CopyIcon,
  AlignLeft,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tab, useEditorStore } from "@/components/features/editor/editorStore";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Codeblock } from "@/components/mardown-render/CodeBlock";
// BYOK removed: no credentials store for keys needed

interface TestCase {
  id: string;
  input: any[];
  output: any;
  expectedOutput?: any;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  actualOutput?: any;
  error?: string;
  explanation?: string;
  executionTime?: number;
  memoryUsage?: number;
  isCustom?: boolean;
  fullCode?: string;
  // New fields from updated endpoint
  functionTested?: string;
  algorithmPattern?: string;
  dataStructuresUsed?: string[];
  processingTime?: number;
}

interface TestCasesPanelProps {
  tab: Tab | undefined;
  error: ApiError | null; // Updated to use ApiError interface
  latestTests: any;
  isGeneratingTests: boolean;
  status: string;
  onClear: () => void;
  onReload: () => void;
}

// Update the ApiError interface at the top of TestCasesPanel
interface ApiError {
  error?: string;
  message: string;
  details?: string;
  suggestions?: string[];
  supportedLanguages?: string[];
  retryable?: boolean;
  category?: string;
  suggestion?: string;
}

interface ErrorDetails {
  type:
    | "validation"
    | "network"
    | "parsing"
    | "execution"
    | "api"
    | "timeout"
    | "compilation"
    | "function_not_found";
  title: string;
  description: string;
  suggestion?: string;
  retryable: boolean;
  category?: string;
}

// Supported languages - updated to match the new endpoint
const SUPPORTED_LANGUAGES = [
  "java",
  "python",
  "javascript",
  "typescript",
  "cpp",
  "c",
  "go",
] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function TestCasesPanel({
  tab,
  error,
  latestTests,
  isGeneratingTests,
  status,
  onClear,
  onReload,
}: TestCasesPanelProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(
    null,
  );
  const [newTestInput, setNewTestInput] = useState("");
  const [newTestOutput, setNewTestOutput] = useState("");
  const [apiError, setApiError] = useState<ErrorDetails | null>(null);
  const [progress, setProgress] = useState(0);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [pauseRequested, setPauseRequested] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // New state for enhanced analytics
  const [executionStats, setExecutionStats] = useState({
    totalExecutionTime: 0,
    averageExecutionTime: 0,
    totalMemoryUsage: 0,
    averageMemoryUsage: 0,
    detectedAlgorithm: "",
    dataStructures: [] as string[],
  });

  // Scroll management refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentLengthRef = useRef(0);

  // Enhanced error categorization for new endpoint responses
  const categorizeError = useCallback(
    (errorMessage: string, context: string = "general"): ErrorDetails => {
      const message = errorMessage.toLowerCase();

      if (
        message.includes("no function found") ||
        message.includes("no_function_found") ||
        message.includes("no valid function found") ||
        message.includes("no callable function detected")
      ) {
        return {
          type: "function_not_found",
          title: "No Function Detected",
          description:
            "The code does not contain a recognizable function that can be tested.",
          suggestion:
            "Ensure your code includes a complete function definition with proper syntax for the selected language.",
          retryable: true,
          category: "Code Structure",
        };
      }

      if (message.includes("unsupported language")) {
        return {
          type: "validation",
          title: "Unsupported Language",
          description: "The selected programming language is not supported.",
          suggestion: `Please use one of the supported languages: ${SUPPORTED_LANGUAGES.join(", ")}.`,
          retryable: false,
          category: "Language Support",
        };
      }

      if (
        message.includes("compilation error") ||
        message.includes("syntax error") ||
        message.includes("compile_output")
      ) {
        return {
          type: "compilation",
          title: "Compilation Error",
          description:
            "Your code has syntax or compilation errors that prevent execution.",
          suggestion:
            "Review your code syntax and fix any compilation errors before testing.",
          retryable: false,
          category: "Code Quality",
        };
      }

      if (
        message.includes("runtime error") ||
        message.includes("execution failed") ||
        message.includes("stderr")
      ) {
        return {
          type: "execution",
          title: "Runtime Error",
          description:
            "Your code compiled successfully but encountered a runtime error.",
          suggestion:
            "Check your logic for edge cases, null references, or array bounds issues.",
          retryable: false,
          category: "Logic Error",
        };
      }

      if (
        message.includes("timeout") ||
        message.includes("time limit") ||
        message.includes("timed out")
      ) {
        return {
          type: "timeout",
          title: "Execution Timeout",
          description: "Code execution took too long and was terminated.",
          suggestion:
            "Optimize your algorithm or reduce input complexity to improve performance.",
          retryable: true,
          category: "Performance",
        };
      }

      if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("connection") ||
        message.includes("judge0 error")
      ) {
        return {
          type: "network",
          title: "Network Error",
          description: "Unable to connect to the code execution service.",
          suggestion: "Check your internet connection and try again.",
          retryable: true,
          category: "Infrastructure",
        };
      }

      if (
        message.includes("system error") ||
        message.includes("internal error") ||
        message.includes("service unavailable")
      ) {
        return {
          type: "api",
          title: "Service Error",
          description: "The code execution service is temporarily unavailable.",
          suggestion: "Please try again in a few moments.",
          retryable: true,
          category: "System",
        };
      }

      return {
        type: "execution",
        title: "Execution Error",
        description:
          errorMessage || "An unexpected error occurred during code execution.",
        suggestion: "Review your code and test inputs, then try again.",
        retryable: true,
        category: "General",
      };
    },
    [],
  );

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
  const parseTestCases = useCallback(
    (content: string): TestCase[] => {
      const cases: TestCase[] = [];

      if (
        !content ||
        content.includes("ERROR:") ||
        content.trim().length === 0
      ) {
        return cases;
      }

      try {
        if (
          content.includes('"error"') &&
          content.includes("NO_FUNCTION_FOUND")
        ) {
          const errorDetails = categorizeError(
            "no_function_found",
            "ai_generation",
          );
          setApiError(errorDetails);
          return cases;
        }

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            return parsed
              .map((testCase, index) => {
                if (!testCase.input || testCase.output === undefined) {
                  console.warn(
                    `Test case ${index + 1} has invalid structure:`,
                    testCase,
                  );
                  return null;
                }

                return {
                  id: `ai-test-${index + 1}`,
                  input: Array.isArray(testCase.input)
                    ? testCase.input
                    : [testCase.input],
                  output: testCase.output,
                  status: "pending" as const,
                  isCustom: false,
                };
              })
              .filter(Boolean) as TestCase[];
          }
        }

        const pattern =
          /\*\*Input:\*\*\s*([^\n*]+)\s*\*\*(?:Expected\s*)?Output:\*\*\s*([^\n*]+)/gi;
        let match;
        let index = 0;

        while ((match = pattern.exec(content)) !== null && index < 10) {
          const input = match[1]?.trim().replace(/[`*]/g, "");
          const expectedOutput = match[2]?.trim().replace(/[`*]/g, "");

          if (input && expectedOutput) {
            cases.push({
              id: `test-${++index}`,
              input: [input],
              output: expectedOutput,
              status: "pending",
              isCustom: false,
            });
          }
        }

        return cases;
      } catch (parseError) {
        console.error("Error parsing test cases:", parseError);
        return cases;
      }
    },
    [categorizeError],
  );

  // Parse test cases when AI response comes
  useEffect(() => {
    if (latestTests?.content && !isGeneratingTests) {
      const parsed = parseTestCases(latestTests.content);
      if (parsed.length > 0) {
        setTestCases(parsed);
        setApiError(null);
        toast.success(`Generated ${parsed.length} test cases successfully`, {
          description: `Ready to run ${parsed.length} test case${parsed.length > 1 ? "s" : ""}`,
        });
      } else {
        setApiError(null);
      }
    }
  }, [latestTests, isGeneratingTests, parseTestCases]);

  // Handle external errors
  useEffect(() => {
    if (error) {
      setApiError({
        type: "execution",
        title: "Test Generation Failed",
        description: error.message,
        suggestion: error.suggestion,
        retryable: true,
        category: error.category || "General",
      });
    } else {
      if (apiError?.type === "network" || apiError?.type === "api") {
        setApiError(null);
      }
    }
  }, [error, apiError]);

  // Smart auto-scroll for streaming content
  useEffect(() => {
    if (isGeneratingTests && latestTests?.content) {
      const currentLength = latestTests.content.length;

      if (
        !isUserScrollingRef.current &&
        currentLength > lastContentLengthRef.current &&
        scrollContainerRef.current
      ) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
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

  // Update execution stats
  const updateExecutionStats = useCallback((testCases: TestCase[]) => {
    const completedTests = testCases.filter(
      (tc) => tc.executionTime !== undefined,
    );
    const totalExecTime = completedTests.reduce(
      (sum, tc) => sum + (tc.executionTime || 0),
      0,
    );
    const totalMemory = completedTests.reduce(
      (sum, tc) => sum + (tc.memoryUsage || 0),
      0,
    );

    // Get unique algorithm patterns and data structures
    const algorithms = [
      ...new Set(
        completedTests.map((tc) => tc.algorithmPattern).filter(Boolean),
      ),
    ];
    const dataStructures = [
      ...new Set(completedTests.flatMap((tc) => tc.dataStructuresUsed || [])),
    ];

    setExecutionStats({
      totalExecutionTime: totalExecTime,
      averageExecutionTime:
        completedTests.length > 0 ? totalExecTime / completedTests.length : 0,
      totalMemoryUsage: totalMemory,
      averageMemoryUsage:
        completedTests.length > 0 ? totalMemory / completedTests.length : 0,
      detectedAlgorithm: algorithms[0] || "",
      dataStructures: dataStructures,
    });
  }, []);

  // Enhanced run single test with new endpoint structure
  const runTest = useCallback(
    async (testCase: TestCase) => {
      if (!tab?.code) {
        const errorDetails = categorizeError(
          "No code available to test",
          "validation",
        );
        setApiError(errorDetails);
        return;
      }

      // Check if language is supported
      if (!SUPPORTED_LANGUAGES.includes(tab.language as SupportedLanguage)) {
        const errorDetails = categorizeError(
          `Unsupported language: ${tab.language}`,
          "validation",
        );
        setApiError(errorDetails);
        return;
      }

      setTestCases((prev) =>
        prev.map((tc) =>
          tc.id === testCase.id ? { ...tc, status: "running" } : tc,
        ),
      );
      setRunningTestId(testCase.id);

      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased timeout for complex operations

        const res = await fetch("/api/ai-execute", {
          method: "POST",
          body: JSON.stringify({
            code: tab.code,
            language: tab.language,
            testCase: {
              input: testCase.input,
              output: testCase.output,
            },
          }),
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorText = await res.text();
          let errorMessage = `HTTP ${res.status}: ${res.statusText}`;

          try {
            const errorData = JSON.parse(errorText);

            // Handle new unified error response format
            if (errorData.success === false && errorData.error) {
              errorMessage =
                errorData.error.message || errorData.error.code || errorMessage;
            } else if (errorData.error) {
              // Fallback for old format during transition
              errorMessage = errorData.error;
            }

            // Provide user-friendly messages for common errors
            if (
              res.status === 400 ||
              errorData.error?.code === "INVALID_REQUEST"
            ) {
              errorMessage =
                "Invalid test case or code. Please check your input.";
            } else if (
              res.status === 429 ||
              errorData.error?.code === "RATE_LIMIT_EXCEEDED"
            ) {
              errorMessage = "Too many requests. Please wait and try again.";
            } else if (
              res.status === 500 ||
              errorData.error?.code === "INTERNAL_ERROR"
            ) {
              errorMessage =
                "Test execution service is temporarily unavailable.";
            } else if (
              res.status === 401 ||
              errorData.error?.code === "UNAUTHENTICATED"
            ) {
              errorMessage = "Authentication required. Please sign in again.";
            }
          } catch {
            // Use the raw error text if JSON parsing fails
            if (errorText) errorMessage = errorText;
          }

          throw new Error(errorMessage);
        }

        const responseData = await res.json();
        const executionTime = Date.now() - startTime;

        // Handle unified API response format
        let data = responseData;
        if (responseData.success === true && responseData.data) {
          data = responseData.data;
        } else if (responseData.success === false) {
          // This shouldn't happen for successful HTTP status
          throw new Error(responseData.error?.message || "API returned error");
        }

        // Enhanced test case update with new fields
        setTestCases((prev) =>
          prev.map((tc) =>
            tc.id === testCase.id
              ? {
                  ...tc,
                  status: data.passed ? "passed" : "failed",
                  actualOutput: data.actualOutput,
                  expectedOutput: data.expectedOutput || tc.output,
                  error: data.error || null,
                  explanation: data.explanation || "",
                  executionTime: data.executionTime || executionTime,
                  memoryUsage: data.memoryUsage,
                  functionTested: data.functionTested,
                  algorithmPattern: data.algorithmPattern,
                  dataStructuresUsed: data.dataStructuresUsed,
                  processingTime: data.processingTime,
                  fullCode: data.fullCode,
                }
              : tc,
          ),
        );

        if (!data.passed) {
          setExpandedTests((prev) => new Set([...prev, testCase.id]));
          toast.error(`Test ${testCase.id.replace(/.*-/, "")} failed`, {
            description:
              data.explanation || "Output did not match expected result",
          });
        } else {
          toast.success(`Test ${testCase.id.replace(/.*-/, "")} passed`, {
            description: `Completed in ${data.executionTime || executionTime}ms${data.memoryUsage ? ` • ${data.memoryUsage}KB memory` : ""}`,
          });
        }
      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        let errorMessage = "Execution failed";
        if (error.name === "AbortError") {
          errorMessage = "Test execution timed out (45s limit exceeded)";
        } else if (error.message) {
          errorMessage = error.message;
        }

        setTestCases((prev) =>
          prev.map((tc) =>
            tc.id === testCase.id
              ? {
                  ...tc,
                  status: "failed",
                  error: errorMessage,
                  actualOutput: "Execution failed",
                  executionTime,
                }
              : tc,
          ),
        );

        setExpandedTests((prev) => new Set([...prev, testCase.id]));

        const errorDetails = categorizeError(errorMessage, "execution");
        toast.error(`Test execution failed: ${errorDetails.title}`, {
          description: errorDetails.description,
        });
      } finally {
        setRunningTestId(null);
        // Update stats after each test
        updateExecutionStats(testCases);
      }
    },
    [tab, categorizeError, testCases, updateExecutionStats],
  );

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
        toast.info("Test execution paused");
        break;
      }

      setCurrentTestIndex(i);
      await runTest(testCases[i]);

      const updatedTestCase = testCases[i];
      if (updatedTestCase.status === "passed") passedCount++;
      else if (updatedTestCase.status === "failed") failedCount++;

      setProgress(((i + 1) / testCases.length) * 100);

      if (i < testCases.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // Slightly longer delay for better UX
      }
    }

    setRunningTests(false);
    setCurrentTestIndex(0);

    if (!pauseRequested) {
      const totalRun = passedCount + failedCount;
      if (passedCount === totalRun && totalRun > 0) {
        toast.success(`All ${totalRun} tests passed! 🎉`, {
          description: `Function: ${executionStats.detectedAlgorithm || "Unknown"} • Avg: ${Math.round(executionStats.averageExecutionTime)}ms`,
        });
      } else if (failedCount > 0) {
        toast.error(`${failedCount} of ${totalRun} tests failed`, {
          description: "Check the failed tests for detailed analysis",
        });
      }
    }
  }, [testCases, runTest, pauseRequested, executionStats]);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [codeToShow, setCodeToShow] = useState<string>("");
  const [wrapPreview, setWrapPreview] = useState(false);
  const openCodeDialog = (tc: TestCase) => {
    if (!tc.fullCode) return;
    setCodeToShow(tc.fullCode);
    setWrapPreview(false); // reset wrap
    setShowCodeDialog(true);
  };

  const { updateTab } = useEditorStore();

  const embedCode = () => {
    if (tab && codeToShow) {
      updateTab(tab.id, { code: codeToShow });
      toast.success("Code embedded in editor");
      setShowCodeDialog(false);
    }
  };

  // Pause test execution
  const pauseTests = useCallback(() => {
    setPauseRequested(true);
    setRunningTests(false);
    toast.info("Stopping test execution...");
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(codeToShow);
    toast.success("Code copied to clipboard");
  };

  // Skip current test
  const skipTest = useCallback((testId: string) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === testId ? { ...tc, status: "skipped" } : tc)),
    );
    toast.info("Test skipped");
  }, []);

  // Enhanced add test with validation
  const addTest = () => {
    if (!newTestInput.trim() || !newTestOutput.trim()) {
      const errorDetails = categorizeError(
        "Both input and output are required",
        "validation",
      );
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
        status: "pending",
        isCustom: true,
      };

      setTestCases((prev) => [...prev, newTest]);
      setShowAddDialog(false);
      setNewTestInput("");
      setNewTestOutput("");
      setApiError(null);
      toast.success("Custom test case added successfully");
    } catch (error) {
      const errorDetails = categorizeError(
        "Invalid JSON format in input or output",
        "parsing",
      );
      setApiError(errorDetails);
    }
  };

  // Remove test with confirmation for custom tests
  const removeTest = (id: string) => {
    const testCase = testCases.find((tc) => tc.id === id);
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    setExpandedTests((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    const isCustom = testCase?.isCustom;
    toast.success(`${isCustom ? "Custom" : "Generated"} test case removed`);

    // Update stats after removal
    updateExecutionStats(testCases.filter((tc) => tc.id !== id));
  };

  // Copy test case data
  const copyTestCase = useCallback((testCase: TestCase) => {
    const data = {
      input: testCase.input,
      output: testCase.output,
      ...(testCase.expectedOutput && {
        expectedOutput: testCase.expectedOutput,
      }),
      ...(testCase.actualOutput && { actualOutput: testCase.actualOutput }),
      ...(testCase.error && { error: testCase.error }),
      ...(testCase.functionTested && {
        functionTested: testCase.functionTested,
      }),
      ...(testCase.algorithmPattern && {
        algorithmPattern: testCase.algorithmPattern,
      }),
      ...(testCase.dataStructuresUsed && {
        dataStructuresUsed: testCase.dataStructuresUsed,
      }),
    };

    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Test case data copied to clipboard");
  }, []);

  // Toggle test expansion
  const toggleExpanded = (id: string) => {
    setExpandedTests((prev) => {
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
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  };

  const formatLeetCodeInput = (input: any[]): string => {
    if (!Array.isArray(input)) return formatValue(input);
    if (input.length === 1) return formatValue(input[0]);
    return input.map((param) => formatValue(param)).join(", ");
  };

  // Enhanced status display with new categories
  const getStatusDisplay = (testCase: TestCase) => {
    switch (testCase.status) {
      case "running":
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          badge: (
            <Badge variant="secondary" className="animate-pulse">
              Running
            </Badge>
          ),
          color: "border-border hover:border-muted-foreground/50",
        };
      case "passed":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          badge: <Badge className="bg-green-600 text-white">Passed</Badge>,
          color: "border-green-600/30 bg-green-50 dark:bg-green-900/20",
        };
      case "failed":
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          badge: <Badge className="bg-red-600 text-white">Failed</Badge>,
          color: "border-red-600/30 bg-red-50 dark:bg-red-900/20",
        };
      case "skipped":
        return {
          icon: <SkipForward className="w-4 h-4 text-muted-foreground" />,
          badge: <Badge variant="secondary">Skipped</Badge>,
          color: "border-muted-foreground/20 bg-muted/10",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-muted-foreground" />,
          badge: <Badge variant="outline">Pending</Badge>,
          color: "border-border",
        };
    }
  };

  // Get algorithm pattern icon
  const getAlgorithmIcon = (pattern: string) => {
    switch (pattern?.toLowerCase()) {
      case "linked_list":
        return <Layers className="w-4 h-4" />;
      case "binary_tree":
        return <Network className="w-4 h-4" />;
      case "dynamic_programming":
        return <Brain className="w-4 h-4" />;
      case "two_sum":
        return <Target className="w-4 h-4" />;
      case "binary_search":
        return <Eye className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
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

  const passedTests = testCases.filter((tc) => tc.status === "passed").length;
  const failedTests = testCases.filter((tc) => tc.status === "failed").length;
  const skippedTests = testCases.filter((tc) => tc.status === "skipped").length;
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
            {/* Enhanced Header with language support indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-muted border shadow-sm">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    AI Test Runner
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Multi-language code testing with analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  <Code className="w-3 h-3 mr-1" />
                  {tab?.language?.toUpperCase() || "CODE"}
                </Badge>
                {SUPPORTED_LANGUAGES.includes(
                  tab?.language as SupportedLanguage,
                ) && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Supported
                  </Badge>
                )}
                {totalTests > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Activity className="w-3 h-3 mr-1" />
                    {totalTests} test{totalTests !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Enhanced Error Display */}
            {!isGeneratingTests && (error || apiError) && (
              <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">
                        {apiError?.title || "Test Execution Failed"}
                      </h3>

                      <p className="text-sm text-red-700 dark:text-red-200 mb-2 break-words">
                        {apiError?.description ||
                          error?.message ||
                          "An unexpected error occurred during test execution"}
                      </p>

                      {(apiError?.suggestion || error?.suggestion) && (
                        <div className="mb-3 p-2 bg-red-100 dark:bg-red-800/30 rounded border border-red-200 dark:border-red-700">
                          <p className="text-xs text-red-800 dark:text-red-200">
                            <strong>💡 Suggestion:</strong>{" "}
                            {apiError?.suggestion || error?.suggestion}
                          </p>
                        </div>
                      )}

                      {(apiError?.category || error?.category) && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200">
                            {apiError?.category || error?.category}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {apiError?.retryable !== false && (
                          <Button
                            onClick={handleRetry}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
                            disabled={isGeneratingTests}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            {isGeneratingTests ? "Retrying..." : "Retry"}
                          </Button>
                        )}
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
                {/* Enhanced Stats Dashboard with algorithm detection */}
                {totalTests > 0 && (
                  <Card className="border-2 shadow-sm">
                    <CardContent className="p-5">
                      <div className="grid grid-cols-4 gap-3 mb-5">
                        <div className="text-center p-3 rounded-lg bg-muted/50 border">
                          <div className="text-2xl font-bold">{totalTests}</div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Total
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background border-2 shadow-sm">
                          <div className="text-2xl font-bold text-green-600">
                            {passedTests}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Passed
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/30 border">
                          <div className="text-2xl font-bold text-red-600">
                            {failedTests}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Failed
                          </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background border shadow-sm">
                          <div className="text-2xl font-bold">
                            {Math.round(successRate)}%
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Success
                          </div>
                        </div>
                      </div>

                      {/* Enhanced analytics */}
                      {executionStats.detectedAlgorithm && (
                        <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            {getAlgorithmIcon(executionStats.detectedAlgorithm)}
                            <span className="text-sm font-medium">
                              Detected Pattern
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {executionStats.detectedAlgorithm
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                            {executionStats.dataStructures.length > 0 && (
                              <span className="ml-2">
                                • Uses:{" "}
                                {executionStats.dataStructures.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Performance metrics */}
                      {executionStats.averageExecutionTime > 0 && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="text-center p-2 rounded-lg bg-background border">
                            <div className="text-lg font-bold">
                              {Math.round(executionStats.averageExecutionTime)}
                              ms
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Avg Time
                            </div>
                          </div>
                          {executionStats.averageMemoryUsage > 0 && (
                            <div className="text-center p-2 rounded-lg bg-background border">
                              <div className="text-lg font-bold">
                                {Math.round(executionStats.averageMemoryUsage)}
                                KB
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Avg Memory
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Progress
                          </span>
                          <span className="font-mono">
                            {passedTests}/{totalTests}
                          </span>
                        </div>
                        <Progress value={successRate} className="h-2.5" />
                      </div>

                      {passedTests === totalTests && totalTests > 0 && (
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold">
                              All tests passed! 🎉
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Your solution works correctly for all test cases
                            {executionStats.averageExecutionTime > 0 &&
                              ` with an average execution time of ${Math.round(executionStats.averageExecutionTime)}ms`}
                          </p>
                        </div>
                      )}

                      {failedTests > 0 && (
                        <div className="mt-4 p-4 rounded-lg border border-red-600/30 bg-red-50 dark:bg-red-900/20">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-semibold">
                              {failedTests} test{failedTests > 1 ? "s" : ""}{" "}
                              failed
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Review the failed tests below for detailed analysis
                            and error information
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Action Controls */}
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
                            disabled={
                              isGeneratingTests ||
                              !SUPPORTED_LANGUAGES.includes(
                                tab?.language as SupportedLanguage,
                              )
                            }
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
                                onClick={() =>
                                  setExpandedTests(
                                    new Set(testCases.map((tc) => tc.id)),
                                  )
                                }
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

                    {/* Language support warning */}
                    {!SUPPORTED_LANGUAGES.includes(
                      tab?.language as SupportedLanguage,
                    ) && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Language Not Supported
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          {tab?.language
                            ? `${tab.language} is not supported yet. `
                            : ""}
                          Supported languages: {SUPPORTED_LANGUAGES.join(", ")}
                        </p>
                      </div>
                    )}
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
                          <span className="font-mono text-sm">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">
                            {passedTests} passed • {failedTests} failed •{" "}
                            {skippedTests} skipped
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

                {/* Enhanced Test Cases Display with algorithm info */}
                {!isGeneratingTests && (
                  <div className="space-y-3">
                    {testCases.map((testCase, index) => {
                      const { icon, badge, color } = getStatusDisplay(testCase);
                      const isExpanded = expandedTests.has(testCase.id);
                      const isRunning = runningTestId === testCase.id;

                      return (
                        <Card
                          key={testCase.id}
                          className={`transition-all duration-300 hover:shadow-md ${color} ${isRunning ? "ring-2 ring-offset-2 ring-muted-foreground/20" : ""} ${isExpanded ? "shadow-lg" : "shadow-sm"}`}
                        >
                          <Collapsible
                            open={isExpanded}
                            onOpenChange={() => toggleExpanded(testCase.id)}
                          >
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
                                          <Badge
                                            variant="outline"
                                            className="text-xs px-2 py-0.5"
                                          >
                                            <Target className="w-3 h-3 mr-1" />
                                            Custom
                                          </Badge>
                                        )}
                                        {testCase.algorithmPattern && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5"
                                          >
                                            {getAlgorithmIcon(
                                              testCase.algorithmPattern,
                                            )}
                                            <span className="ml-1">
                                              {testCase.algorithmPattern.replace(
                                                /_/g,
                                                " ",
                                              )}
                                            </span>
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
                                        {testCase.memoryUsage && (
                                          <span className="flex items-center gap-1 font-mono">
                                            <Database className="w-3 h-3" />
                                            {testCase.memoryUsage}KB
                                          </span>
                                        )}
                                        <span className="truncate max-w-[250px] font-mono">
                                          Input:{" "}
                                          {formatLeetCodeInput(testCase.input)}
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
                                  {/* Enhanced Input/Output Display */}
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
                                            {formatValue(
                                              testCase.expectedOutput ||
                                                testCase.output,
                                            )}
                                          </pre>
                                        </div>
                                      </div>

                                      {testCase.actualOutput !== undefined && (
                                        <div className="space-y-2">
                                          <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            Actual Output
                                          </Label>
                                          <div
                                            className={`p-4 rounded-lg border-2 shadow-inner ${
                                              testCase.status === "passed"
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-600/30"
                                                : "bg-red-50 dark:bg-red-900/20 border-red-600/30"
                                            }`}
                                          >
                                            <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                                              {formatValue(
                                                testCase.actualOutput,
                                              )}
                                            </pre>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Enhanced Function Analysis */}
                                  {testCase.functionTested && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-semibold flex items-center gap-2">
                                        <Code className="w-4 h-4" />
                                        Function Analysis
                                      </Label>
                                      <div className="p-4 bg-background border-2 border-dashed rounded-lg shadow-inner">
                                        <div className="text-sm space-y-2">
                                          <p>
                                            <strong>Function:</strong>{" "}
                                            {testCase.functionTested}
                                          </p>
                                          {testCase.algorithmPattern && (
                                            <p>
                                              <strong>Pattern:</strong>{" "}
                                              {testCase.algorithmPattern
                                                .replace(/_/g, " ")
                                                .replace(/\b\w/g, (l) =>
                                                  l.toUpperCase(),
                                                )}
                                            </p>
                                          )}
                                          {testCase.dataStructuresUsed &&
                                            testCase.dataStructuresUsed.length >
                                              0 && (
                                              <p>
                                                <strong>
                                                  Data Structures:
                                                </strong>{" "}
                                                {testCase.dataStructuresUsed.join(
                                                  ", ",
                                                )}
                                              </p>
                                            )}
                                          {testCase.processingTime && (
                                            <p>
                                              <strong>Processing Time:</strong>{" "}
                                              {testCase.processingTime}ms
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

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
                                      disabled={
                                        testCase.status === "running" ||
                                        runningTests ||
                                        !SUPPORTED_LANGUAGES.includes(
                                          tab?.language as SupportedLanguage,
                                        )
                                      }
                                      variant="outline"
                                      size="sm"
                                      className="h-8 shadow-sm"
                                    >
                                      {testCase.status === "running" ? (
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

                                    {testCase.status === "running" && (
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
                                    {testCase.fullCode && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() =>
                                              openCodeDialog(testCase)
                                            }
                                          >
                                            <FileCode2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View generated code</p>
                                        </TooltipContent>
                                      </Tooltip>
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
                      <h3 className="text-lg font-semibold mb-3">
                        No Test Cases
                      </h3>
                      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                        Create custom test cases or let AI generate them based
                        on your {tab?.language || "code"} to get started.
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button
                          onClick={() => setShowAddDialog(true)}
                          className="shadow-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Custom Test
                        </Button>
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          className="shadow-sm"
                          disabled={
                            isGeneratingTests ||
                            !SUPPORTED_LANGUAGES.includes(
                              tab?.language as SupportedLanguage,
                            )
                          }
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
                      <h3 className="text-lg font-semibold mb-3">
                        Generating Test Cases
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        AI is analyzing your {tab?.language || "code"} and
                        creating appropriate test cases...
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <div
                          className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Enhanced Add Test Dialog with language-specific examples */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted border">
                  <Plus className="w-5 h-5" />
                </div>
                Add Custom Test Case
                {tab?.language && (
                  <Badge variant="outline" className="text-xs">
                    {tab.language}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="simple" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2 p-1">
                <TabsTrigger
                  value="simple"
                  className="flex items-center gap-2 data-[state=active]:shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Simple Format
                </TabsTrigger>
                <TabsTrigger
                  value="json"
                  className="flex items-center gap-2 data-[state=active]:shadow-sm"
                >
                  <Code className="w-4 h-4" />
                  JSON Format
                </TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-6 mt-6">
                <div className="grid gap-5">
                  <div className="space-y-3">
                    <Label
                      htmlFor="simple-input"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Input Parameters
                    </Label>
                    <Input
                      id="simple-input"
                      value={newTestInput}
                      onChange={(e) => setNewTestInput(e.target.value)}
                      placeholder={`Example: [2,7,11,15], 9`}
                      className="font-mono h-12 shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter function parameters separated by commas. Arrays and
                      objects should be in JSON format.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="simple-output"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Expected Output
                    </Label>
                    <Input
                      id="simple-output"
                      value={newTestOutput}
                      onChange={(e) => setNewTestOutput(e.target.value)}
                      placeholder={`Example: [0,1]`}
                      className="font-mono h-12 shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter the expected result from your function. Use JSON
                      format for complex data types.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-6 mt-6">
                <div className="grid gap-5">
                  <div className="space-y-3">
                    <Label
                      htmlFor="json-input"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <Code className="w-4 h-4" />
                      Input Parameters (JSON Array)
                    </Label>
                    <Textarea
                      id="json-input"
                      value={newTestInput}
                      onChange={(e) => setNewTestInput(e.target.value)}
                      placeholder="[[2, 7, 11, 15], 9]"
                      className="font-mono h-16 resize-none shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Each function parameter should be an element in the JSON
                      array. Complex data structures are supported.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="json-output"
                      className="text-sm font-semibold flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Expected Output (JSON)
                    </Label>
                    <Textarea
                      id="json-output"
                      value={newTestOutput}
                      onChange={(e) => setNewTestOutput(e.target.value)}
                      placeholder="[0, 1]"
                      className="font-mono h-16 resize-none shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The expected return value in JSON format. Supports all
                      data types including nested objects and arrays.
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
        <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
          <DialogContent className=" min-w-[min(95dvw,900px)] max-w-[900px] p-0 flex flex-col overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5" />
                <span className="font-semibold text-sm">Generated Code</span>
                <Badge variant="secondary" className="text-xxs ml-2">
                  {tab?.language?.toUpperCase() ?? "TXT"}
                </Badge>
              </div>
            </div>

            {/* BODY */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[60dvh]">
              {" "}
              {/* ← was overflow-hidden */}
              <Codeblock
                className={`language-${tab?.language ?? "plaintext"}`}
                default={{ expand: true, wrap: wrapPreview }}
              >
                {codeToShow}
              </Codeblock>
            </div>
            {/* FOOTER */}
            <div className="flex justify-end border-t px-4 py-3">
              <Button onClick={embedCode}>
                <Cpu className="w-4 h-4 mr-2" />
                Embed in Editor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
