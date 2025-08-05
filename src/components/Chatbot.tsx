"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    MessageCircle,
    Send,
    Bot,
    User,
    Copy,
    RotateCcw,
    Brain,
    Loader2,
    Code2,
    Zap,
    Target,
    Lightbulb,
    ChevronDown,
    FileCode,
    Check,
    Search,
    BookOpen,
    Timer
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";
import { useEditorStore } from "@/store/editorStore";

interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DSAChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { tabs, activeTabId } = useEditorStore();
    const currentTab = tabs.find(tab => tab.id === activeTabId);

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
        reload,
        setMessages,
        append
    } = useChat({
        api: '/api/chatbot',
        body: {
            currentTab: currentTab ? {
                name: currentTab.name,
                language: currentTab.language,
                code: currentTab.code
            } : null
        },
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: `# DSA Expert Assistant

I'm your coding mentor for **Data Structures & Algorithms**.

**I can help you with:**
- Code analysis and optimization
- Algorithm design and complexity analysis
- Debugging and problem solving
- Interview preparation

${currentTab ? `**Current file:** \`${currentTab.name}\` (${currentTab.language})` : ''}

What would you like to work on?`
            }
        ]
    });

    // Improved suggestions that work with context
    const contextualSuggestions = currentTab ? [
        {
            icon: Code2,
            title: "Analyze Code",
            description: "Review for correctness & efficiency",
            prompt: "Please analyze my current code for correctness, efficiency, and potential improvements. Focus on time/space complexity and any edge cases I might have missed."
        },
        {
            icon: Zap,
            title: "Optimize Performance",
            description: "Improve time/space complexity",
            prompt: "How can I optimize my current algorithm for better performance? Please suggest alternative approaches with better time or space complexity."
        },
        {
            icon: Target,
            title: "Find Bugs",
            description: "Debug and fix issues",
            prompt: "Help me debug my current code. Are there any logical errors, edge cases not handled, or potential runtime issues?"
        },
        {
            icon: Lightbulb,
            title: "Explain Algorithm",
            description: "Step-by-step breakdown",
            prompt: "Please explain how my current algorithm works step by step. Break down the logic and help me understand the approach better."
        },
        {
            icon: Timer,
            title: "Complexity Analysis",
            description: "Time & space complexity",
            prompt: "What is the time and space complexity of my current algorithm? Please provide a detailed analysis with Big O notation."
        },
        {
            icon: BookOpen,
            title: "Best Practices",
            description: "Code quality & style",
            prompt: "Review my code for best practices, coding style, and maintainability. Suggest improvements for cleaner, more readable code."
        }
    ] : [
        {
            icon: Search,
            title: "Algorithm Help",
            description: "Find the right algorithm",
            prompt: "I need help choosing the right algorithm for my problem. Can you suggest appropriate data structures and algorithms?"
        },
        {
            icon: Code2,
            title: "Implementation Guide",
            description: "Step-by-step coding help",
            prompt: "Can you help me implement a specific algorithm or data structure? I need a detailed implementation guide."
        },
        {
            icon: Target,
            title: "Problem Solving",
            description: "Break down complex problems",
            prompt: "I'm stuck on a coding problem. Can you help me break it down and find the right approach?"
        },
        {
            icon: Timer,
            title: "Complexity Analysis",
            description: "Understand Big O notation",
            prompt: "I need help understanding time and space complexity. Can you explain Big O notation with examples?"
        },
        {
            icon: BookOpen,
            title: "Concept Explanation",
            description: "Learn DSA fundamentals",
            prompt: "Can you explain a specific data structure or algorithm concept? I'd like to understand the theory and applications."
        },
        {
            icon: Lightbulb,
            title: "Interview Prep",
            description: "Practice coding interviews",
            prompt: "Help me prepare for coding interviews. What are the most important algorithms and data structures I should know?"
        }
    ];

    // Handle suggestion click with context awareness
    const handleSuggestionClick = async (suggestion: any) => {
        try {
            const finalPrompt = suggestion.prompt;
            setShowSuggestions(false);
            await append({
                id: `suggestion-${Date.now()}`,
                role: 'user',
                content: finalPrompt
            });
        } catch (error) {
            console.error('Suggestion click failed:', error);
            toast.error("Failed to send message");
        }
    };

    // Improved scroll detection with better thresholds
    const checkScrollPosition = useCallback(() => {
        if (!scrollViewportRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const threshold = 150; // Show button when more than 150px from bottom

        const nearBottom = distanceFromBottom <= threshold;
        setIsNearBottom(nearBottom);

        // Show scroll button when:
        // 1. Not near bottom
        // 2. There's scrollable content
        // 3. We have more than just the welcome message
        setShowScrollButton(
            !nearBottom &&
            scrollHeight > clientHeight &&
            messages.length > 1
        );
    }, [messages.length]);

    // Handle scroll with throttling for performance
    const handleScroll = useCallback(() => {
        checkScrollPosition();
    }, [checkScrollPosition]);

    // Smooth scroll to bottom function
    const scrollToBottom = useCallback(() => {
        if (!scrollViewportRef.current) return;
        scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, []);

    // Update scroll position check when messages change (no auto-scroll)
    useEffect(() => {
        // Just check scroll position when messages change, don't auto-scroll
        setTimeout(() => {
            checkScrollPosition();
        }, 100);
    }, [messages, checkScrollPosition]);

    // Reset suggestions when chat has messages
    useEffect(() => {
        if (messages.length > 1) {
            setShowSuggestions(false);
        }
    }, [messages]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setShowSuggestions(messages.length === 1);
            setTimeout(() => {
                inputRef.current?.focus();
                checkScrollPosition();
            }, 100);
        }
    }, [isOpen, messages.length, checkScrollPosition]);

    const copyToClipboard = async (text: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (error) {
            toast.error("Failed to copy");
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: 'welcome-' + Date.now(),
                role: 'assistant',
                content: `# Ready for a new session!

What coding challenge can I help you with today?

${currentTab ? `**Current file:** \`${currentTab.name}\` (${currentTab.language})` : ''}`
            }
        ]);
        setShowSuggestions(true);
        setShowScrollButton(false);
        toast.success("Chat cleared");
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        try {
            let finalMessage = input;
            // Auto-add code context if user hasn't included it and we have current code
            if (currentTab && currentTab.code.trim() && !input.includes('```') && !input.toLowerCase().includes('current code')) {
                finalMessage += `\n\nMy current code:\n\`\`\`${currentTab.language}\n${currentTab.code}\n\`\`\``;
            }

            setShowSuggestions(false);

            await append({
                id: `user-${Date.now()}`,
                role: 'user',
                content: finalMessage
            });
        } catch (error) {
            console.error('Form submit failed:', error);
            toast.error("Failed to send message");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className=" min-w-[min(80dvw,850px)]  h-[90vh] p-0 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-foreground rounded-lg flex items-center justify-center shrink-0">
                            <Brain size={16} className="sm:w-5 sm:h-5 text-background" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base sm:text-lg truncate">DSA Expert</h3>
                            <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2">
                                <span>AI Assistant</span>
                                {currentTab && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <div className="flex items-center gap-1 min-w-0">
                                            <FileCode size={10} className="sm:w-3 sm:h-3 shrink-0" />
                                            <span className="truncate max-w-20 sm:max-w-32">{currentTab.name}</span>
                                            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-mono shrink-0">
                                                {currentTab.language}
                                            </Badge>
                                        </div>
                                    </>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearChat}
                                    className="h-8 w-8 p-0 shrink-0 "
                                    title="Clear chat"
                                >
                                    <RotateCcw size={14} />
                                </Button>
                            </div>

                        </div>

                    </div>

                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-3 py-2 sm:p-3 bg-muted text-sm border-b flex items-center justify-between shrink-0">
                        <span className="text-xs sm:text-sm">Failed to send message. Please try again.</span>
                        <Button variant="link" size="sm" onClick={() => reload()} className="h-auto p-0 text-xs">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Messages Container */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div
                        ref={scrollViewportRef}
                        onScroll={handleScroll}
                        className="h-full overflow-y-auto overflow-x-hidden"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgb(156 163 175) transparent',
                            scrollBehavior: 'smooth'
                        }}
                    >
                        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 min-h-full max-w-full">
                            {messages.map((message) => (
                                <div key={message.id} className="group max-w-full">
                                    {message.role === 'assistant' ? (
                                        <div className="flex gap-2 sm:gap-3 max-w-full">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-foreground rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-1">
                                                <Bot size={12} className="sm:w-4 sm:h-4 text-background" />
                                            </div>
                                            <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                                                {/* <div className="prose prose-sm max-w-none break-words overflow-hidden dark:prose-invert 
                                                    prose-pre:bg-muted prose-pre:border prose-pre:text-xs prose-pre:max-w-full prose-pre:overflow-x-auto 
                                                    prose-code:bg-muted prose-code:px-1.5 prose-code:py-1 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-code:break-all
                                                    prose-p:break-words prose-headings:break-words prose-headings:text-sm prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-strong:font-semibold
                                                    prose-ul:break-words prose-li:break-words prose-ol:break-words"> */}
                                                <MemoizedMarkdown
                                                    content={message.content}
                                                    id={`message-${message.id}`}
                                                />
                                                {/* </div> */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(message.content, message.id)}
                                                    className="h-7 px-2 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    {copiedMessageId === message.id ? (
                                                        <>
                                                            <Check size={10} className="mr-1 text-foreground" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={10} className="mr-1" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 sm:gap-3 justify-end max-w-full">
                                            <div className="bg-foreground text-background rounded-2xl px-3 py-2 max-w-[80%] sm:max-w-[85%] overflow-hidden break-words">
                                                <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words overflow-hidden max-w-full">
                                                    {message.content}
                                                </div>
                                            </div>
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-1">
                                                <User size={12} className="sm:w-4 sm:h-4" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-2 sm:gap-3 max-w-full">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-foreground rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-1">
                                        <Bot size={12} className="sm:w-4 sm:h-4 text-background" />
                                    </div>
                                    <div className="bg-muted rounded-2xl px-3 py-2 flex items-center gap-2 overflow-hidden">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">Analyzing...</span>
                                    </div>
                                </div>
                            )}

                            {/* Smart Suggestions - Only show initially */}
                            {showSuggestions && messages.length === 1 && (
                                <div className="space-y-4 mt-6 max-w-full overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px bg-border flex-1" />
                                        <h4 className="text-sm font-medium text-muted-foreground px-3 whitespace-nowrap">
                                            {currentTab ? "Quick Actions" : "How can I help?"}
                                        </h4>
                                        <div className="h-px bg-border flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-full">
                                        {contextualSuggestions.map((suggestion, index) => {
                                            const IconComponent = suggestion.icon;
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="justify-start h-auto p-4 hover:bg-muted/50 transition-colors group text-left border-dashed hover:border-solid max-w-full overflow-hidden"
                                                >
                                                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mr-3 group-hover:bg-foreground group-hover:text-background transition-colors shrink-0">
                                                        <IconComponent size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                        <div className="font-medium text-sm truncate">{suggestion.title}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{suggestion.description}</div>
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Scroll to Bottom Button - t3.chat style */}
                    {showScrollButton && (
                        <div className="absolute inset-x-0 bottom-0 flex justify-center z-20">
                            <Button
                                onClick={scrollToBottom}
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-full bg-background/80 shadow border border-border flex items-center justify-center p-0 hover:bg-background/60 transition-all"
                                aria-label="Scroll to bottom"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mx-auto" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4 border-t bg-background shrink-0">
                    <form onSubmit={handleFormSubmit} className="flex gap-2 sm:gap-3">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ask about algorithms, debug code, or optimize solutions..."
                                disabled={isLoading}
                                className="pr-10 h-10 sm:h-12 text-xs sm:text-sm"
                            />
                            {isLoading && (
                                <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="h-10 sm:h-12 px-3 sm:px-4 shrink-0 bg-foreground text-background hover:bg-foreground/90"
                        >
                            <Send size={14} />
                        </Button>
                    </form>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Brain size={10} />
                            DSA Expert
                        </span>
                        <span className="hidden sm:inline">Press Enter to send</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Improved trigger button
export function DSAChatbotTrigger() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    size="lg"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group bg-foreground text-background hover:bg-foreground/90"
                >
                    <Brain size={20} className="sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                </Button>
            </div>

            <DSAChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}