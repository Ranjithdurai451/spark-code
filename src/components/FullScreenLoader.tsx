// components/ui/FullScreenLoader.tsx
"use client";
import { motion } from "framer-motion";
import { Target, Code, Zap, Brain } from "lucide-react";

export function FullScreenLoader() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="relative">
                {/* Animated circles */}
                <div className="absolute inset-0 -m-8">
                    <motion.div
                        className="absolute w-16 h-16 border-2 border-primary/20 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute w-12 h-12 border-2 border-primary/40 rounded-full m-2"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute w-8 h-8 border-2 border-primary rounded-full m-4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                </div>

                {/* Center content */}
                <motion.div
                    className="relative z-10 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.div
                        className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Target size={32} className="text-primary" />
                    </motion.div>

                    <motion.h2
                        className="text-2xl font-bold mb-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Loading Practice Mode
                    </motion.h2>

                    <motion.p
                        className="text-muted-foreground mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        Preparing your coding environment...
                    </motion.p>

                    {/* Feature icons */}
                    <motion.div
                        className="flex justify-center gap-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <motion.div
                            className="flex flex-col items-center gap-2 text-xs"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                        >
                            <Code size={20} className="text-blue-500" />
                            <span>Multi-Language</span>
                        </motion.div>
                        <motion.div
                            className="flex flex-col items-center gap-2 text-xs"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        >
                            <Zap size={20} className="text-yellow-500" />
                            <span>AI Testing</span>
                        </motion.div>
                        <motion.div
                            className="flex flex-col items-center gap-2 text-xs"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        >
                            <Brain size={20} className="text-green-500" />
                            <span>Smart Hints</span>
                        </motion.div>
                    </motion.div>

                    {/* Progress bar */}
                    <motion.div
                        className="w-48 h-1 bg-muted rounded-full mx-auto mt-8 overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        />
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
