"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    MessageCircle,
    Send,
    Bot,
    User,
    Trash2,
    Copy,
    X,
    Minimize2,
    Maximize2,
    RotateCcw,
    Brain,
    Loader2,
    Code2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";

// const SUGGESTED_QUESTIONS = [
//     "How do I approach dynamic programming problems?",
//     "What's the difference between DFS and BFS?",
//     "How to optimize recursive solutions?",
//     "Explain time complexity of merge sort"
// ];

interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DSAChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    // const [showSuggestions, setShowSuggestions] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
        reload,
        stop,
        setMessages
    } = useChat({
        api: '/api/chatbot',
        initialMessages: [
            {
                id: '1',
                role: 'assistant',
                content: `# 🚀 DSA Expert Assistant

I'm here to help you master **Data Structures & Algorithms** and coding challenges.

## What I can help with:
- **Algorithms**: Sorting, Searching, DP, Greedy, Backtracking
- **Data Structures**: Arrays, Trees, Graphs, Hash Tables
- **Problem Solving**: LeetCode, debugging, optimization
- **Interview Prep**: Patterns, strategies, complexity analysis

Ask me anything about coding or select a quick question below!`,
            }
        ],
        // onFinish: () => {
        //     setShowSuggestions(false);
        // }
    });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // const handleSuggestedQuestion = (question: string) => {
    //     // Set the input value and submit
    //     const syntheticEvent = {
    //         preventDefault: () => { },
    //     } as React.FormEvent<HTMLFormElement>;

    //     // Create a new submit event with the suggested question
    //     handleSubmit(syntheticEvent, {
    //         data: { message: question }
    //     });

    //     // setShowSuggestions(false);
    // };

    const clearChat = () => {
        setMessages([
            {
                id: '1',
                role: 'assistant',
                content: `# 🚀 Welcome Back!

Ready for another coding session? What would you like to explore today?`,
            }
        ]);
        // setShowSuggestions(true);
    };

    const copyMessage = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={` min-w-[50dvw] transition-all border-0 outline-0 ring-0 duration-300 ease-in-out ${isMinimized ? 'h-20 max-h-20' : 'h-[90vh] max-h-[90vh]'
                    } p-0 overflow-hidden`}
            >
                {/* Professional Header */}
                <DialogHeader className="p-6 border-b bg-background">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                                <Bot size={24} className="text-primary-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    DSA Expert Assistant
                                </DialogTitle>
                                <p className="text-base text-muted-foreground flex items-center gap-2 mt-1">
                                    <Brain size={14} className="text-primary" />
                                    Data Structures & Algorithms Specialist
                                </p>
                            </div>
                        </div>

                        {/* <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sm px-3 py-1">
                                {messages.length - 1} messages
                            </Badge>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="w-10 h-10 p-0"
                            >
                                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearChat}
                                className="w-10 h-10 p-0"
                                disabled={isLoading}
                            >
                                <RotateCcw size={16} />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="w-10 h-10 p-0"
                            >
                                <X size={16} />
                            </Button>
                        </div> */}
                    </div>
                </DialogHeader>

                {!isMinimized && (
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Error Display */}
                        {error && (
                            <div className="p-4 bg-destructive/10 border-b border-destructive/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-base text-destructive">
                                        Something went wrong. Please try again.
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => reload()}>
                                        <RotateCcw size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 min-h-0">
                            <ScrollArea className="h-full" ref={scrollAreaRef}>
                                <div className="p-8 space-y-8">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex gap-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {message.role === 'assistant' && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                                        <Bot size={18} className="text-primary-foreground" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div
                                                    className={`rounded-xl px-6 py-4 text-base leading-relaxed ${message.role === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted border'
                                                        }`}
                                                >
                                                    {message.role === 'user' ? (
                                                        <p>{message.content}</p>
                                                    ) : (
                                                        <div className="prose prose-base max-w-none dark:prose-invert">
                                                            <MemoizedMarkdown
                                                                content={message.content}
                                                                id={`message-${message.id}`}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {message.role === 'assistant' && (
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyMessage(message.content)}
                                                            className="h-8 px-3 text-sm"
                                                        >
                                                            <Copy size={14} className="mr-1" />
                                                            Copy
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {message.role === 'user' && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                                        <User size={18} className="text-secondary-foreground" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Typing Indicator */}
                                    {isLoading && (
                                        <div className="flex gap-6 justify-start">
                                            <div className="flex-shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                                    <Bot size={18} className="text-primary-foreground" />
                                                </div>
                                            </div>
                                            <div className="bg-muted border rounded-xl px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                                                    </div>
                                                    <span className="text-base text-muted-foreground">AI is analyzing...</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={stop}
                                                        className="h-8 px-3 ml-3"
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Suggested Questions - Only show 4 */}
                        {/* {showSuggestions && messages.length <= 1 && (
                            <div className="p-6 border-t bg-muted/30">
                                <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                                    <Code2 size={18} className="text-primary" />
                                    Quick Start Questions:
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {SUGGESTED_QUESTIONS.map((question, index) => (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            size="lg"
                                            onClick={() => handleSuggestedQuestion(question)}
                                            className="text-sm h-auto p-4 justify-start text-left w-full font-normal hover:bg-primary/5"
                                            disabled={isLoading}
                                        >
                                            <span className="line-clamp-2">{question}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )} */}

                        {/* Input Section */}
                        <div className="p-6 border-t bg-background">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex gap-4">
                                    <Input
                                        ref={inputRef}
                                        value={input}
                                        onChange={handleInputChange}
                                        placeholder="Ask about algorithms, data structures, coding problems..."
                                        disabled={isLoading}
                                        className="flex-1 text-base py-6 px-4 bg-muted/50"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        size="lg"
                                        className="px-8 py-6"
                                    >
                                        {isLoading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>DSA & Coding Expert • Powered by AI</span>
                                    <span>Press Enter to send</span>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Trigger Button Component
export function DSAChatbotTrigger() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 rounded-full shadow-xl hover:scale-105 transition-transform"
                    size="lg"
                >
                    <MessageCircle size={28} />
                </Button>
            </div>

            <DSAChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
