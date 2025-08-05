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
    Timer,
    Plus,
    X
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
    const [includeCode, setIncludeCode] = useState(false);
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
        append,
        setInput
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
            //             {
            //                 id: 'welcome',
            //                 role: 'assistant',
            //                 content: `# DSA Expert Assistant

            // I'm your coding mentor for **Data Structures & Algorithms**.

            // **I can help you with:**
            // - Code analysis and optimization
            // - Algorithm design and complexity analysis
            // - Debugging and problem solving
            // - Interview preparation

            // ${currentTab ? `**Current file:** \`${currentTab.name}\` (${currentTab.language})` : ''}

            // What would you like to work on?`
            //             }
        ]
    });

    // Improved suggestions that work with context
    const contextualSuggestions = currentTab ? [
        {
            icon: Code2,
            title: "Analyze Code",
            description: "Review for correctness & efficiency",
            prompt: "Please analyze my current code for correctness, efficiency, and potential improvements. Focus on time/space complexity and any edge cases I might have missed.",
            needsCode: true
        },
        {
            icon: Zap,
            title: "Optimize Performance",
            description: "Improve time/space complexity",
            prompt: "How can I optimize my current algorithm for better performance? Please suggest alternative approaches with better time or space complexity.",
            needsCode: true
        },
        {
            icon: Target,
            title: "Find Bugs",
            description: "Debug and fix issues",
            prompt: "Help me debug my current code. Are there any logical errors, edge cases not handled, or potential runtime issues?",
            needsCode: true
        },
        {
            icon: Lightbulb,
            title: "Explain Algorithm",
            description: "Step-by-step breakdown",
            prompt: "Please explain how my current algorithm works step by step. Break down the logic and help me understand the approach better.",
            needsCode: true
        },
        {
            icon: Timer,
            title: "Complexity Analysis",
            description: "Time & space complexity",
            prompt: "What is the time and space complexity of my current algorithm? Please provide a detailed analysis with Big O notation.",
            needsCode: true
        },
        {
            icon: BookOpen,
            title: "Best Practices",
            description: "Code quality & style",
            prompt: "Review my code for best practices, coding style, and maintainability. Suggest improvements for cleaner, more readable code.",
            needsCode: true
        }
    ] : [
        {
            icon: Search,
            title: "Algorithm Help",
            description: "Find the right algorithm",
            prompt: "I need help choosing the right algorithm for my problem. Can you suggest appropriate data structures and algorithms?",
            needsCode: false
        },
        {
            icon: Code2,
            title: "Implementation Guide",
            description: "Step-by-step coding help",
            prompt: "Can you help me implement a specific algorithm or data structure? I need a detailed implementation guide.",
            needsCode: false
        },
        {
            icon: Target,
            title: "Problem Solving",
            description: "Break down complex problems",
            prompt: "I'm stuck on a coding problem. Can you help me break it down and find the right approach?",
            needsCode: false
        },
        {
            icon: Timer,
            title: "Complexity Analysis",
            description: "Understand Big O notation",
            prompt: "I need help understanding time and space complexity. Can you explain Big O notation with examples?",
            needsCode: false
        },
        {
            icon: BookOpen,
            title: "Concept Explanation",
            description: "Learn DSA fundamentals",
            prompt: "Can you explain a specific data structure or algorithm concept? I'd like to understand the theory and applications.",
            needsCode: false
        },
        {
            icon: Lightbulb,
            title: "Interview Prep",
            description: "Practice coding interviews",
            prompt: "Help me prepare for coding interviews. What are the most important algorithms and data structures I should know?",
            needsCode: false
        }
    ];

    // Handle suggestion click with context awareness
    const handleSuggestionClick = async (suggestion: any) => {
        try {
            let finalPrompt = suggestion.prompt;

            // Only add code if the suggestion needs it and we have code
            if (suggestion.needsCode && currentTab && currentTab.code.trim()) {
                finalPrompt += `\n\nMy current code:\n\`\`\`${currentTab.language}\n${currentTab.code}\n\`\`\``;
            }

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
        const threshold = 100;

        const nearBottom = distanceFromBottom <= threshold;
        setIsNearBottom(nearBottom);

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

    // Update scroll position check when messages change
    useEffect(() => {
        setTimeout(() => {
            checkScrollPosition();
        }, 100);
    }, [messages, checkScrollPosition]);

    // Reset suggestions when chat has messages
    useEffect(() => {
        if (messages.length > 0) {
            setShowSuggestions(false);
        }
    }, [messages]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setShowSuggestions(messages.length === 0);
            setIncludeCode(false);
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
        setIncludeCode(false);
        toast.success("Chat cleared");
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        try {
            let finalMessage = input.trim();

            // Only add code if user explicitly wants it and we have code
            if (includeCode && currentTab && currentTab.code.trim()) {
                finalMessage += `\n\nMy current code:\n\`\`\`${currentTab.language}\n${currentTab.code}\n\`\`\``;
            }

            setShowSuggestions(false);
            setIncludeCode(false); // Reset after sending

            await append({
                id: `user-${Date.now()}`,
                role: 'user',
                content: finalMessage
            });

            // Clear the input after sending
            setInput('');
        } catch (error) {
            console.error('Form submit failed:', error);
            toast.error("Failed to send message");
        }
    };

    const toggleIncludeCode = () => {
        setIncludeCode(!includeCode);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="min-w-[min(90dvw,900px)] h-[85vh] p-0 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
                            <Brain size={20} className="text-primary-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-lg">DSA Expert</h3>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>AI Assistant</span>
                                {currentTab && (
                                    <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <FileCode size={12} className="shrink-0" />
                                            <span className="truncate max-w-32">{currentTab.name}</span>
                                            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
                                                {currentTab.language}
                                            </Badge>
                                        </div>
                                    </>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearChat}
                                    className="h-9 w-9 p-0 shrink-0"
                                    title="Clear chat"
                                >
                                    <RotateCcw size={16} />
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-4 py-3 bg-destructive/10 text-sm border-b flex items-center justify-between shrink-0">
                        <span>Failed to send message. Please try again.</span>
                        <Button variant="link" size="sm" onClick={() => reload()} className="h-auto p-0 text-sm">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Messages Container */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div
                        ref={scrollViewportRef}
                        onScroll={handleScroll}
                        className="h-full overflow-y-auto"
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        <div className="p-4 space-y-6 min-h-full">
                            {messages.map((message) => (
                                <div key={message.id} className="group">
                                    {message.role === 'assistant' ? (
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 mt-1">
                                                <Bot size={16} className="text-primary-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <MemoizedMarkdown
                                                    content={message.content}
                                                    id={`message-${message.id}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(message.content, message.id)}
                                                    className="h-8 px-3 text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    {copiedMessageId === message.id ? (
                                                        <>
                                                            <Check size={12} className="mr-1.5" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} className="mr-1.5" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3 justify-end">
                                            <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%]">
                                                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                                    {message.content}
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-1">
                                                <User size={16} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 mt-1">
                                        <Bot size={16} className="text-primary-foreground" />
                                    </div>
                                    <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                        <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                                    </div>
                                </div>
                            )}

                            {/* Smart Suggestions */}
                            {showSuggestions && messages.length === 0 && (
                                <div className="space-y-6 mt-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-border flex-1" />
                                        <h4 className="text-sm font-medium text-muted-foreground px-4">
                                            {currentTab ? "Quick Actions" : "How can I help?"}
                                        </h4>
                                        <div className="h-px bg-border flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {contextualSuggestions.map((suggestion, index) => {
                                            const IconComponent = suggestion.icon;
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="justify-start h-auto p-4 hover:bg-muted/50 transition-colors group text-left border-dashed hover:border-solid"
                                                >
                                                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                                        <IconComponent size={18} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-sm mb-1">{suggestion.title}</div>
                                                        <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scroll to Bottom Button */}
                    {showScrollButton && (
                        <div className="absolute inset-x-0 bottom-4 flex justify-center z-20">
                            <Button
                                onClick={scrollToBottom}
                                size="icon"
                                variant="secondary"
                                className="h-10 w-10 rounded-full shadow-lg border"
                            >
                                <ChevronDown size={16} />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t shrink-0">
                    {/* Code toggle when file is open */}
                    {/* {currentTab && currentTab.code.trim() && (
                        <div className="mb-3 flex items-center justify-between">
                            <Button
                                type="button"
                                variant={includeCode ? "default" : "outline"}
                                size="sm"
                                onClick={toggleIncludeCode}
                                className="h-8 text-xs"
                            >
                                {includeCode ? (
                                    <>
                                        <Check size={12} className="mr-1.5" />
                                        Code included
                                    </>
                                ) : (
                                    <>
                                        <Plus size={12} className="mr-1.5" />
                                        Include current code
                                    </>
                                )}
                            </Button>
                            {includeCode && (
                                <span className="text-xs text-muted-foreground">
                                    Your code will be sent with the message
                                </span>
                            )}
                        </div>
                    )} */}

                    <form onSubmit={handleFormSubmit} className="flex gap-3">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ask about algorithms, debug code, or optimize solutions..."
                                disabled={isLoading}
                                className="pr-12 h-12 text-sm"
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            size="lg"
                            className="h-12 px-6 shrink-0"
                        >
                            <Send size={16} />
                        </Button>
                    </form>

                    <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Brain size={12} />
                            DSA Expert Assistant
                        </span>
                        <span>Press Enter to send</span>
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
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    size="lg"
                    className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
                >
                    <Brain size={24} className="transition-transform group-hover:scale-110" />
                </Button>
            </div>

            <DSAChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}