"use client";
import { Button } from "@/components/ui/button";
import { Brain, RotateCcw, AlertCircle, Maximize2, Copy, CheckCheck, Loader2 } from "lucide-react";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "../ui/card";

interface AnalysisPanelProps {
    error: Error | null;
    latestAnalysis: any;
    isAnalyzing: boolean;
    status: string;
    onClear: () => void;
    onReload: () => void;
}

export function AnalysisPanel({
    error,
    latestAnalysis,
    isAnalyzing,
    status,
    onClear,
    onReload
}: AnalysisPanelProps) {
    const [showMaximizedView, setShowMaximizedView] = useState(false);
    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Track user scrolling to prevent auto-scroll interference
    const isUserScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastContentLengthRef = useRef(0);

    // Handle user scroll detection
    const handleScroll = useCallback(() => {
        isUserScrollingRef.current = true;

        // Clear existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Reset user scrolling flag after 1.5 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
            isUserScrollingRef.current = false;
        }, 1500);
    }, []);

    // Auto-scroll during streaming (only if user isn't manually scrolling)
    useEffect(() => {
        if (isAnalyzing && latestAnalysis?.content) {
            const currentContentLength = latestAnalysis.content.length;

            // Only auto-scroll if:
            // 1. User is not manually scrolling
            // 2. Content has actually grown (new content added)
            // 3. We're still analyzing (streaming)
            if (!isUserScrollingRef.current &&
                currentContentLength > lastContentLengthRef.current) {

                requestAnimationFrame(() => {
                    if (scrollViewportRef.current) {
                        scrollViewportRef.current.scrollTo({
                            top: scrollViewportRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                });
            }

            lastContentLengthRef.current = currentContentLength;
        }
    }, [latestAnalysis?.content, isAnalyzing]);

    // Reset scroll tracking when analysis starts
    useEffect(() => {
        if (isAnalyzing) {
            isUserScrollingRef.current = false;
            lastContentLengthRef.current = 0;
        }
    }, [isAnalyzing]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const handleCopyAnalysis = async () => {
        if (latestAnalysis?.content) {
            try {
                await navigator.clipboard.writeText(latestAnalysis.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <div className="h-full flex flex-col min-w-0">
            <div className="flex-1 overflow-hidden">
                <div
                    ref={scrollViewportRef}
                    className="h-full overflow-y-auto overflow-x-hidden"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgb(156 163 175) transparent',
                        scrollBehavior: 'smooth' // Smooth scrolling for better UX
                    }}
                    onScroll={handleScroll} // Track user scrolling
                >
                    <div className="p-3 min-h-full max-w-full">
                        {error ? (
                            <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4 max-w-full overflow-hidden">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-destructive mb-1">Analysis Failed</h3>
                                        <p className="text-sm text-destructive/80 mb-3 break-words">{error.message}</p>
                                        <Button
                                            onClick={onReload}
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                        >
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            Retry
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : latestAnalysis ? (
                            <div className="space-y-3 max-w-full">
                                {/* Fixed sticky header */}
                                {!isAnalyzing && (
                                    <div className="sticky top-0 backdrop-blur-sm bg-background/90 border border-border/50 flex items-center justify-between p-2 rounded-lg z-10 shadow-sm">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Brain className="w-4 h-4 text-primary flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">Analysis Complete</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCopyAnalysis}
                                                className="h-7 px-2 text-xs"
                                            >
                                                {copied ? (
                                                    <CheckCheck className="w-3 h-3" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowMaximizedView(true)}
                                                className="h-7 px-2 text-xs"
                                            >
                                                <Maximize2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Analysis content with proper spacing */}
                                <div className="bg-muted/20 rounded-lg p-3 overflow-hidden max-w-full">
                                    <div
                                        ref={contentRef}
                                        className="max-w-full overflow-hidden break-words"
                                    >
                                        <MemoizedMarkdown
                                            content={latestAnalysis.content || ''}
                                            id={`analysis-${latestAnalysis.id || Date.now()}`}
                                        />

                                        {/* Streaming indicator */}
                                        {isAnalyzing && (
                                            <div className="flex items-center gap-2 text-muted-foreground mt-3">
                                                <div className="flex gap-1">
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                </div>
                                                <span className="text-xs">Analyzing...</span>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Minimal empty state */
                            <div className="flex flex-col items-center justify-center h-full text-center py-8 max-w-full">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Brain className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium mb-1">Ready to Analyze</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Click "Analyze" to get expert insights
                                </p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>• Code complexity & optimization</p>
                                    <p>• Best practices & improvements</p>
                                    <p>• Performance recommendations</p>
                                </div>
                            </div>
                        )}

                        {/* Compact streaming status */}

                        {isAnalyzing && !latestAnalysis && (
                            <Card className="text-center">
                                <CardContent className="p-6">
                                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    </div>
                                    <h3 className="text-sm font-medium mb-2">Generating Code Analysis</h3>
                                    <p className="text-xs text-muted-foreground">
                                        AI is analyzing your code...
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Maximized View Dialog */}
            <Dialog open={showMaximizedView} onOpenChange={setShowMaximizedView}>
                <DialogContent className="min-w-[60vw] max-h-[95vh] w-full">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary" />
                                Full Analysis
                            </DialogTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyAnalysis}
                                className="h-8 text-xs"
                            >
                                {copied ? (
                                    <>
                                        <CheckCheck className="w-3 h-3 mr-1" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogHeader>

                    <div
                        className="max-h-[calc(95vh-100px)] overflow-y-auto overflow-x-hidden"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgb(156 163 175) transparent'
                        }}
                    >
                        <div className="pr-4 max-w-full">
                            {latestAnalysis && (
                                <div className="prose prose-base max-w-none break-words
                                    prose-headings:text-foreground prose-headings:font-semibold
                                    prose-p:text-muted-foreground prose-p:leading-relaxed
                                    prose-strong:text-foreground prose-strong:font-semibold
                                    prose-code:bg-muted prose-code:text-foreground prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:break-all
                                    prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                                    prose-ul:text-muted-foreground prose-li:text-muted-foreground
                                    prose-ol:text-muted-foreground
                                    dark:prose-invert"
                                >
                                    <MemoizedMarkdown
                                        content={latestAnalysis.content}
                                        id={`analysis-maximized-${Date.now()}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
