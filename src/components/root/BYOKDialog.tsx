"use client";
import { useState, useCallback, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import {
    Key, AlertCircle, Eye, EyeOff, ExternalLink, Github,
    Zap, Code, Loader2, Shield, ArrowRight, CheckCircle2,
    Lock, AlertTriangle, Info, Sparkles, User, Star, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCredentialsStore } from "./credentialsStore";


interface BYOKDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}


export default function BYOKDialog({ open, onOpenChange }: BYOKDialogProps) {
    const { data: session, status } = useSession();
    const [showKeys, setShowKeys] = useState({ gemini: false, judge0: false });
    const [inputs, setInputs] = useState({ gemini: '', judge0: '' });
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState({ gemini: '', judge0: '' });
    const [storageMode, setStorageMode] = useState<'local' | 'secure'>('local');
    const [isGithubLoading, setIsGithubLoading] = useState(false);


    // Zustand store
    const {
        githubUser,
        githubRepo,
        isConnected,
        geminiApiKey,
        judge0ApiKey,
        setGeminiApiKey,
        setJudge0ApiKey
    } = useCredentialsStore();


    // Set storage mode based on GitHub auth status
    useEffect(() => {
        if (session && isConnected) {
            setStorageMode('secure');
        } else {
            setStorageMode('local');
        }
    }, [session, isConnected]);


    // Initialize inputs with existing keys
    useEffect(() => {
        setInputs({
            gemini: geminiApiKey?.isValid ? '••••••••••••••••••••••••••••••••' : '',
            judge0: judge0ApiKey?.isValid ? '••••••••••••••••••••••••••••••••' : ''
        });
    }, [geminiApiKey, judge0ApiKey]);


    // Check if all keys are valid
    const areAllKeysValid = Boolean(geminiApiKey?.isValid && judge0ApiKey?.isValid);

    const validateAllKeys = useCallback(async () => {
        const geminiKey = inputs.gemini.trim();
        const judge0Key = inputs.judge0.trim();

        // Skip validation if keys are masked (already validated)
        if (geminiKey.startsWith('••••') && judge0Key.startsWith('••••')) {
            toast.success("🚀 Ready to go! All keys are configured.");
            setTimeout(() => onOpenChange(false), 200);
            return;
        }

        if (!geminiKey || !judge0Key) {
            setValidationErrors({
                gemini: !geminiKey ? 'Gemini API key is required to analyze code' : '',
                judge0: !judge0Key ? 'Judge0 API key is required to run code' : ''
            });
            toast.error("Please enter both API keys to continue");
            return;
        }

        setIsValidating(true);
        setValidationErrors({ gemini: '', judge0: '' });

        // Show loading toast
        const loadingToast = toast.loading(
            storageMode === 'secure'
                ? "🔐 Validating and encrypting your keys..."
                : "⚡ Validating your API keys..."
        );

        try {
            const response = await fetch('/api/validate-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiKey, judge0Key })
            });

            const result = await response.json();

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            if (result.success) {
                const now = Date.now();

                if (result.mode === 'secure') {
                    setGeminiApiKey({
                        value: 'server-encrypted',
                        isValid: true,
                        lastValidated: now,
                        storageMode: 'secure'
                    });

                    setJudge0ApiKey({
                        value: 'server-encrypted',
                        isValid: true,
                        lastValidated: now,
                        storageMode: 'secure'
                    });

                    toast.success("🔒 Success! Keys encrypted and stored securely with your GitHub account.", {
                        description: "Your API keys are protected with military-grade encryption."
                    });
                } else {
                    setGeminiApiKey({
                        value: geminiKey,
                        isValid: true,
                        lastValidated: now,
                        storageMode: 'local'
                    });

                    setJudge0ApiKey({
                        value: judge0Key,
                        isValid: true,
                        lastValidated: now,
                        storageMode: 'local'
                    });

                    toast.success("✅ Keys validated successfully!", {
                        description: "Stored locally in your browser. Sign in with GitHub for enhanced security."
                    });
                }

                setInputs({
                    gemini: '••••••••••••••••••••••••••••••••',
                    judge0: '••••••••••••••••••••••••••••••••'
                });

                setTimeout(() => onOpenChange(false), 1500);
            } else {
                // Handle specific validation errors
                const errors = result.errors || {};
                setValidationErrors({
                    gemini: errors.gemini || '',
                    judge0: errors.judge0 || ''
                });

                if (errors.gemini && errors.judge0) {
                    toast.error("Both API keys are invalid", {
                        description: "Please check your keys and try again."
                    });
                } else if (errors.gemini) {
                    toast.error("Invalid Gemini API key", {
                        description: "Please verify your Google AI Studio key is correct."
                    });
                } else if (errors.judge0) {
                    toast.error("Invalid Judge0 API key", {
                        description: "Please verify your RapidAPI key is correct."
                    });
                }
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Validation error:', error);
            toast.error("Connection failed", {
                description: "Unable to validate keys. Please check your internet connection and try again."
            });
        } finally {
            setIsValidating(false);
        }
    }, [inputs, setGeminiApiKey, setJudge0ApiKey, onOpenChange, storageMode]);





    const handleGithubSignIn = useCallback(async () => {
        setIsGithubLoading(true);
        try {
            await signIn('github');
        } catch (error) {
            console.error('GitHub sign-in error:', error);
            setIsGithubLoading(false);
        }
    }, []);


    useEffect(() => {
        if (status !== 'loading') {
            setIsGithubLoading(false);
        }
    }, [status]);


    const toggleKeyVisibility = useCallback((type: 'gemini' | 'judge0') => {
        setShowKeys(prev => ({ ...prev, [type]: !prev[type] }));
    }, []);


    const handleInputChange = useCallback((type: 'gemini' | 'judge0', value: string) => {
        setInputs(prev => ({ ...prev, [type]: value }));
        if (validationErrors[type]) {
            setValidationErrors(prev => ({ ...prev, [type]: '' }));
        }
    }, [validationErrors]);


    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isValidating && inputs.gemini.trim() && inputs.judge0.trim()) {
            e.preventDefault();
            validateAllKeys();
        }
    }, [validateAllKeys, isValidating, inputs]);


    const isFormValid = inputs.gemini.trim() && inputs.judge0.trim();


    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent
                className=" sm:max-w-[900px] max-h-[95vh] overflow-y-auto"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                showCloseButton={false}
            >
                <DialogHeader className="pb-6 ">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary/10 mb-1">
                                <Key className="w-7 h-7 text-primary" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-primary-foreground" />
                            </div>
                        </div>
                        <DialogTitle className="text-2xl font-semibold">Setup API Keys</DialogTitle>
                        <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                            Connect your API keys to unlock SparkCode's AI analysis and code execution features.
                        </p>
                    </div>
                </DialogHeader>


                <div className="space-y-6">
                    {/* GitHub Integration Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Github className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold text-lg">GitHub Integration (Optional)</h3>
                        </div>


                        {session && isConnected ? (
                            <Alert className="border-primary/20 bg-primary/5">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <AlertDescription className="text-sm">
                                    <span className="font-medium text-primary">
                                        Connected as {githubUser?.login}
                                    </span>
                                    <span className="text-muted-foreground ml-1">
                                        - Your API keys will be encrypted and stored securely with your GitHub session.
                                    </span>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Card className="border-dashed border-2 border-muted bg-muted/30 py-2">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-foreground mb-2">
                                                Sign in with GitHub for Enhanced Security
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Connect GitHub to save/import code from repositories and store your API keys securely encrypted with your session.
                                            </p>
                                            <Button
                                                onClick={handleGithubSignIn}
                                                variant="outline"
                                                className="bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90 hover:border-secondary/90"
                                                disabled={status === 'loading' || isGithubLoading}
                                            >
                                                {status === 'loading' || isGithubLoading ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Github className="w-4 h-4 mr-2" />
                                                )}
                                                Sign in with GitHub
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>


                    <Separator />


                    {/* Storage Mode Indicator */}
                    <Alert className={`${storageMode === 'secure' ? 'border-primary/20 bg-primary/5' : 'border-muted bg-muted/50'}`}>
                        {storageMode === 'secure' ? (
                            <>
                                <Lock className="h-4 w-4 text-primary" />
                                <AlertDescription className="text-sm">
                                    <span className="font-medium text-primary">
                                        Secure Mode Active
                                    </span>
                                    <span className="text-muted-foreground ml-1">
                                        - Your API keys will be encrypted server-side and tied to your GitHub session for maximum security.
                                    </span>
                                </AlertDescription>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                <AlertDescription className="text-sm">
                                    <span className="font-medium text-foreground">
                                        Local Storage Mode
                                    </span>
                                    <span className="text-muted-foreground ml-1">
                                        - API keys will be stored only in your browser. For enhanced security, sign in with GitHub.
                                    </span>
                                </AlertDescription>
                            </>
                        )}
                    </Alert>


                    {/* Key Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Google Gemini Card */}
                        <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3 hover:bg-card/80 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-3 items-center">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <span className="font-semibold text-sm">Google Gemini</span>
                                        <span className="block text-xs text-muted-foreground">AI Code Analysis</span>
                                    </div>
                                </div>
                                {geminiApiKey?.isValid ? (
                                    <Badge variant="default" className="gap-1 text-xs px-2 bg-primary text-primary-foreground">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Connected
                                        {geminiApiKey.storageMode === 'secure' && <Lock className="w-3 h-3 ml-1" />}
                                    </Badge>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                                        className="text-xs gap-1 px-2 h-7 hover:bg-primary/5"
                                    >
                                        Get Key <ExternalLink className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    type={showKeys.gemini ? "text" : "password"}
                                    placeholder="AIzaSy..."
                                    value={inputs.gemini}
                                    onChange={(e) => handleInputChange('gemini', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className={`pr-10 h-10 font-mono text-sm transition-colors ${validationErrors.gemini
                                        ? 'border-destructive focus-visible:ring-destructive/20'
                                        : geminiApiKey?.isValid
                                            ? 'border-primary focus-visible:ring-primary/20'
                                            : 'focus-visible:ring-primary/20'
                                        }`}
                                    disabled={isValidating}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                                    onClick={() => toggleKeyVisibility('gemini')}
                                >
                                    {showKeys.gemini
                                        ? <EyeOff className="w-3 h-3" />
                                        : <Eye className="w-3 h-3" />}
                                </Button>
                            </div>
                            {validationErrors.gemini && (
                                <div className="flex items-center gap-2 text-xs text-red-500">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{validationErrors.gemini}</span>
                                </div>
                            )}
                            {geminiApiKey?.isValid && !validationErrors.gemini && (
                                <div className="flex items-center gap-2 text-xs text-primary">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>
                                        Validated & {geminiApiKey.storageMode === 'secure' ? 'encrypted securely' : 'stored locally'}
                                    </span>
                                </div>
                            )}
                        </div>


                        {/* Judge0 Card */}
                        <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3 hover:bg-card/80 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-3 items-center">
                                    <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center">
                                        <Code className="w-4 h-4 text-secondary-foreground" />
                                    </div>
                                    <div>
                                        <span className="font-semibold text-sm">Judge0 RapidAPI</span>
                                        <span className="block text-xs text-muted-foreground">Code Execution</span>
                                    </div>
                                </div>
                                {judge0ApiKey?.isValid ? (
                                    <Badge variant="default" className="gap-1 text-xs px-2 bg-primary text-primary-foreground">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Connected
                                        {judge0ApiKey.storageMode === 'secure' && <Lock className="w-3 h-3 ml-1" />}
                                    </Badge>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open('https://rapidapi.com/judge0-official/api/judge0-ce/', '_blank')}
                                        className="text-xs gap-1 px-2 h-7 hover:bg-secondary/5"
                                    >
                                        Get Key <ExternalLink className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    type={showKeys.judge0 ? "text" : "password"}
                                    placeholder="RapidAPI key..."
                                    value={inputs.judge0}
                                    onChange={(e) => handleInputChange('judge0', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className={`pr-10 h-10 font-mono text-sm transition-colors ${validationErrors.judge0
                                        ? 'border-destructive focus-visible:ring-destructive/20'
                                        : judge0ApiKey?.isValid
                                            ? 'border-primary focus-visible:ring-primary/20'
                                            : 'focus-visible:ring-primary/20'
                                        }`}
                                    disabled={isValidating}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                                    onClick={() => toggleKeyVisibility('judge0')}
                                >
                                    {showKeys.judge0
                                        ? <EyeOff className="w-3 h-3" />
                                        : <Eye className="w-3 h-3" />}
                                </Button>
                            </div>
                            {validationErrors.judge0 && (
                                <div className="flex items-center gap-2 text-xs text-red-500">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{validationErrors.judge0}</span>
                                </div>
                            )}
                            {judge0ApiKey?.isValid && !validationErrors.judge0 && (
                                <div className="flex items-center gap-2 text-xs text-primary">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>
                                        Validated & {judge0ApiKey.storageMode === 'secure' ? 'encrypted securely' : 'stored locally'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Security Info */}
                    {/* <Alert className="border-muted bg-muted/50">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <AlertDescription className="text-sm">
                            <div className="space-y-2">
                                <div className="font-medium text-foreground">
                                    How your keys are protected:
                                </div>
                                <div className="text-muted-foreground text-xs space-y-1">
                                    <div>• <strong>Local Mode:</strong> Keys stored in browser only, validated but not encrypted</div>
                                    <div>• <strong>Secure Mode:</strong> Keys encrypted server-side, tied to your GitHub session</div>
                                    <div>• Keys are only used when you explicitly run code or request AI analysis</div>
                                    <div>• We never share your keys with anyone or store them in plain text</div>
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert> */}


                    {/* Submit Button */}
                    <Button
                        onClick={validateAllKeys}
                        disabled={!isFormValid || isValidating}
                        className="w-full h-11 text-base font-medium"
                        size="lg"
                    >
                        {isValidating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Validating & {storageMode === 'secure' ? 'Encrypting' : 'Storing'} Keys...
                            </>
                        ) : areAllKeysValid ? (
                            <>
                                Launch SparkCode
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        ) : (
                            <>
                                Validate & Continue
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>


                    {/* Progress indicator */}
                    {(geminiApiKey?.isValid || judge0ApiKey?.isValid) && (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <div className={`w-3 h-3 rounded-full ${geminiApiKey?.isValid ? 'bg-primary' : 'bg-muted'} transition-colors`}></div>
                                <div className={`w-3 h-3 rounded-full ${judge0ApiKey?.isValid ? 'bg-primary' : 'bg-muted'} transition-colors`}></div>
                                <span className="ml-2">
                                    {areAllKeysValid ? 'All keys configured!' : `${(geminiApiKey?.isValid ? 1 : 0) + (judge0ApiKey?.isValid ? 1 : 0)} of 2 keys configured`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}