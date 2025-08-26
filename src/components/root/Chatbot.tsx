"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Send,
    Bot,
    User,
    Copy,
    RotateCcw,
    Brain,
    Loader2,
    ChevronDown,
    FileCode,
    Check,
    Search,
    BookOpen,
    Target,
    Lightbulb
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { MemoizedMarkdown } from "@/components/mardown-render/MemoizedMarkdown";
import { useEditorStore } from "@/components/features/editor/editorStore";
import { useCredentialsStore } from "./credentialsStore";

interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Suggestion {
    text: string;
    prompt: string;
    needsCode?: boolean;
}

interface Tab {
    id: string;
    label: string;
    icon: any;
    suggestions: Suggestion[];
}

export function DSAChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
    const { geminiApiKey } = useCredentialsStore();
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [activeTab, setActiveTab] = useState("analyze");
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                code: currentTab.code,
                geminiApiKey: geminiApiKey?.value
            } : null
        },
        initialMessages: []
    });

    // Simplified suggestion tabs
    const suggestionTabs: Tab[] = [
        {
            id: "analyze",
            label: "Analyze",
            icon: Search,
            suggestions: [
                {
                    text: "Review my code for bugs and potential improvements",
                    prompt: "Please review my code for correctness, potential bugs, and suggest improvements.",
                    needsCode: true
                },
                {
                    text: "Analyze the time and space complexity of my algorithm",
                    prompt: "Analyze the time and space complexity of my algorithm and explain the Big O notation.",
                    needsCode: true
                },
                {
                    text: "Help me debug this code and find logical errors",
                    prompt: "Help me debug this code. Are there any logical errors or edge cases I'm missing?",
                    needsCode: true
                },
                {
                    text: "Suggest optimizations to improve performance",
                    prompt: "How can I optimize this algorithm for better performance? Suggest alternatives with better complexity.",
                    needsCode: true
                }
            ]
        },
        {
            id: "learn",
            label: "Learn",
            icon: BookOpen,
            suggestions: [
                {
                    text: "Explain binary search with examples",
                    prompt: "Explain binary search algorithm step by step with code examples and complexity analysis."
                },
                {
                    text: "Arrays vs Linked Lists comparison",
                    prompt: "Explain the differences between arrays and linked lists, including their use cases and trade-offs."
                },
                {
                    text: "Dynamic Programming fundamentals",
                    prompt: "Teach me dynamic programming concepts with simple examples and when to use this approach."
                },
                {
                    text: "Graph traversal algorithms",
                    prompt: "Explain BFS and DFS graph traversal algorithms with implementations and use cases."
                }
            ]
        },
        {
            id: "solve",
            label: "Solve",
            icon: Lightbulb,
            suggestions: [
                {
                    text: "Break down complex coding problems",
                    prompt: "Help me break down this complex problem into smaller, manageable parts with a step-by-step approach."
                },
                {
                    text: "Choose the right algorithm for my problem",
                    prompt: "I need help choosing the right algorithm and data structure for my problem. Can you suggest the best approach?"
                },
                {
                    text: "Guide me through two-pointer problems",
                    prompt: "Explain the two-pointer technique and guide me through solving a problem using this approach."
                },
                {
                    text: "Help with sliding window algorithms",
                    prompt: "Explain the sliding window technique and help me implement a solution using this pattern."
                }
            ]
        },
        {
            id: "practice",
            label: "Practice",
            icon: Target,
            suggestions: [
                {
                    text: "Give me a medium-level array problem",
                    prompt: "Give me a medium-difficulty array problem to practice with hints and solution approach."
                },
                {
                    text: "Interview questions for my skill level",
                    prompt: "Suggest some coding interview questions appropriate for my skill level with detailed explanations."
                },
                {
                    text: "Technical interview preparation guide",
                    prompt: "What are the most important algorithms and data structures I should know for coding interviews?"
                },
                {
                    text: "Competitive programming study plan",
                    prompt: "Help me create a structured study plan for improving my competitive programming skills."
                }
            ]
        }
    ];

    // Handle textarea auto-resize
    const autoResizeTextarea = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 200);
        textarea.style.height = `${newHeight}px`;
    }, []);

    // Handle keyboard events properly
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Allow new line with Shift+Enter
                return;
            } else {
                // Send message with Enter
                e.preventDefault();
                if (input.trim() && !isLoading) {
                    handleFormSubmit(e as any);
                }
            }
        }
    };

    // Handle input changes
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleInputChange(e as any);
        setTimeout(autoResizeTextarea, 0);
    };

    // Auto-scroll management
    useEffect(() => {
        if (isLoading && messages.length > 0) {
            scrollToBottom();
        }
    }, [isLoading]);

    const handleSuggestionClick = async (suggestion: Suggestion) => {
        try {
            let finalPrompt = suggestion.prompt;

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

    const checkScrollPosition = useCallback(() => {
        if (!scrollViewportRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const threshold = 100;

        const nearBottom = distanceFromBottom <= threshold;
        setIsNearBottom(nearBottom);
        setShowScrollButton(!nearBottom && scrollHeight > clientHeight && messages.length > 1);
    }, [messages.length]);

    const handleScroll = useCallback(() => {
        checkScrollPosition();
    }, [checkScrollPosition]);

    const scrollToBottom = useCallback(() => {
        if (!scrollViewportRef.current) return;
        scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, []);

    useEffect(() => {
        setTimeout(checkScrollPosition, 100);
    }, [messages, checkScrollPosition]);

    useEffect(() => {
        if (messages.length > 0) {
            setShowSuggestions(false);
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setShowSuggestions(messages.length === 0);
            setTimeout(() => {
                textareaRef.current?.focus();
                checkScrollPosition();
                autoResizeTextarea();
            }, 100);
        }
    }, [isOpen, messages.length, checkScrollPosition, autoResizeTextarea]);

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
        setMessages([]);
        setShowSuggestions(true);
        setShowScrollButton(false);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = '56px';
        }
        toast.success("Chat cleared");
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        try {
            const finalMessage = input.trim();
            setShowSuggestions(false);
            setInput('');

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = '56px';
            }

            await append({
                id: `user-${Date.now()}`,
                role: 'user',
                content: finalMessage,
            });

        } catch (error) {
            console.error('Form submit failed:', error);
            toast.error("Failed to send message");
        }
    };

    const currentTabSuggestions = suggestionTabs.find(tab => tab.id === activeTab)?.suggestions || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="min-w-[min(95dvw,900px)] max-w-[900px] h-[90vh] p-0 flex flex-col overflow-hidden shadow-2xl">
                {/* Simplified Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Brain size={18} className="text-primary-foreground" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-lg">DSA Expert Assistant</h2>
                            {currentTab && (
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                    <FileCode size={12} />
                                    <span className="truncate max-w-32">{currentTab.name}</span>
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-mono">
                                        {currentTab.language}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearChat}
                        className="h-8 w-8 p-0"
                        title="Clear chat"
                    >
                        <RotateCcw size={16} />
                    </Button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-4 py-3 bg-destructive/10 text-sm border-b flex items-center justify-between">
                        <span>Failed to send message. Please try again.</span>
                        <Button variant="link" size="sm" onClick={() => reload()} className="h-auto p-0 text-sm">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div
                        ref={scrollViewportRef}
                        onScroll={handleScroll}
                        className="h-full overflow-y-auto"
                    >
                        {/* Simplified Welcome State */}
                        {messages.length === 0 && showSuggestions && (
                            <div className="flex flex-col h-full">
                                {/* Welcome Message */}
                                <div className="text-center py-8 px-4">
                                    <h3 className="text-2xl font-semibold mb-3">How can I help you today?</h3>
                                    <p className="text-muted-foreground">
                                        Choose a category below or ask me anything about algorithms, data structures, and competitive programming
                                    </p>
                                </div>

                                {/* Simple Tabs */}
                                <div className="px-4 mb-6">
                                    <div className="flex gap-2 p-1 bg-muted rounded-lg max-w-md mx-auto">
                                        {suggestionTabs.map((tab) => {
                                            const IconComponent = tab.icon;
                                            return (
                                                <Button
                                                    key={tab.id}
                                                    variant={activeTab === tab.id ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className="flex-1 gap-2 h-9"
                                                >
                                                    <IconComponent size={16} />
                                                    {tab.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Simple Suggestions List */}
                                <div className="flex-1 px-4 pb-4">
                                    <div className="max-w-2xl mx-auto space-y-3">
                                        {currentTabSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors text-sm"
                                            >
                                                {suggestion.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.length > 0 && (
                            <div className="p-4 space-y-6">
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
                                                <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3 max-w-[80%]">
                                                    <div className="text-sm whitespace-pre-wrap">
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
                                        <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                                                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            </div>
                                            <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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

                {/* Enhanced Input Area - Like Claude */}
                <div className="p-4 border-t">
                    <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto">
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleTextareaChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me about algorithms, data structures, or paste your code for analysis..."
                                disabled={isLoading}
                                className="min-h-[56px] max-h-[200px] py-4 px-4 pr-12 resize-none border-2 focus:border-primary/50 rounded-xl text-sm leading-relaxed"
                                style={{ height: '56px' }}
                            />
                            <Button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                size="sm"
                                className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-lg"
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                            </Button>
                        </div>

                        {/* Input helpers */}
                        <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-muted-foreground">
                                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to send,
                                <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono ml-1">Shift+Enter</kbd> for new line
                            </div>
                            {currentTab && (
                                <Badge variant="outline" className="text-xs">
                                    Code context: {currentTab.name}
                                </Badge>
                            )}
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Simple Trigger button
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