"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  TrendingUp,
  History,
  Package,
  Check,
  Loader2,
  AlertCircle,
  IndianRupee,
  Zap,
  RefreshCw,
  TrendingDown,
  Calendar,
  DollarSign,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Target,
  Wallet,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay: {
      new (options: RazorpayOptions): {
        open: () => void;
      };
    };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name?: string;
    email?: string;
  };
  theme: {
    color: string;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  features: string[];
}

interface CreditTransaction {
  id: string;
  user_id: string;
  type: "purchase" | "usage" | "bonus" | "refund";
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface UserCredits {
  id: string;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  credits: number;
  total_credits_earned: number;
  total_credits_spent: number;
  created_at: string;
  last_login_at: string;
}

const CREDIT_PLANS: CreditPlan[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 100,
    price: 99,
    features: ["100 AI credits", "Basic code generation", "Standard support"],
  },
  {
    id: "pro",
    name: "Professional",
    credits: 500,
    price: 399,
    popular: true,
    features: [
      "500 AI credits",
      "Advanced code generation",
      "Priority support",
      "Code analysis",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    credits: 2000,
    price: 1299,
    features: [
      "2000 AI credits",
      "All features",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

async function fetchCredits(): Promise<{ user: UserCredits }> {
  const response = await fetch("/api/credits");
  if (!response.ok) {
    throw new Error("Failed to fetch credits");
  }
  return response.json();
}

async function fetchCreditHistory(): Promise<CreditTransaction[]> {
  const response = await fetch("/api/credits/history");
  if (!response.ok) {
    throw new Error("Failed to fetch credit history");
  }
  return response.json();
}

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const {
    data: creditsData,
    isLoading: isLoadingCredits,
    error: creditsError,
    refetch: refetchCredits,
  } = useQuery({
    queryKey: ["credits"],
    queryFn: fetchCredits,
    enabled: status === "authenticated",
    retry: 3,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useQuery({
    queryKey: ["credit-history"],
    queryFn: fetchCreditHistory,
    enabled: status === "authenticated",
    retry: 3,
  });

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  const handlePurchase = async (plan: CreditPlan) => {
    setSelectedPlan(plan.id);
    setIsProcessingPayment(true);

    try {
      // Initialize Razorpay payment
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price,
          credits: plan.credits,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment order");
      }

      const orderData = await response.json();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SparkCode",
        description: `Purchase ${plan.credits} credits`,
        order_id: orderData.id,
        handler: async function (response: RazorpayResponse) {
          // Verify payment
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
            }),
          });

          if (verifyResponse.ok) {
            refetchCredits();
            toast.success(
              "Payment successful! Credits have been added to your account.",
            );
          } else {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: session?.user?.name || undefined,
          email: session?.user?.email || undefined,
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
      setSelectedPlan(null);
    }
  };

  const userData = creditsData?.user;
  const currentCredits = userData?.credits || 0;
  const usagePercentage = Math.min((currentCredits / 1000) * 100, 100); // Assuming 1000 is max for progress

  // Calculate statistics
  const stats = useMemo(() => {
    if (!userData || !historyData) return null;

    const totalPurchased = historyData
      .filter((t) => t.type === "purchase")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalUsed = historyData
      .filter((t) => t.type === "usage")
      .reduce((sum, t) => sum + t.amount, 0);

    const recentTransactions = historyData.slice(0, 5);
    const lastTransaction = historyData[0];

    return {
      totalPurchased,
      totalUsed,
      recentTransactions,
      lastTransaction,
      efficiency:
        totalPurchased > 0
          ? ((totalPurchased - totalUsed) / totalPurchased) * 100
          : 0,
    };
  }, [userData, historyData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Credits & Billing</h1>
            <p className="text-muted-foreground">
              Manage your AI credits and upgrade your plan
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchCredits();
              toast.success("Refreshing data...");
            }}
            disabled={isLoadingCredits}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingCredits ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Upgrade Plans</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Current Credits Card */}
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Credits
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingCredits ? (
                  <div className="space-y-3">
                    <div className="h-8 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-2 bg-muted animate-pulse rounded"></div>
                  </div>
                ) : creditsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Failed to load credits</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{currentCredits}</div>
                    <p className="text-xs text-muted-foreground">
                      Available for AI operations
                    </p>
                    <div className="mt-3">
                      <Progress value={usagePercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {usagePercentage.toFixed(1)}% of capacity used
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Usage Stats Card */}
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Usage This Month
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground">
                  Credits used in{" "}
                  {new Date().toLocaleDateString("en-US", { month: "long" })}
                </p>
                <div className="mt-3 flex items-center text-xs text-green-600">
                  <Check className="w-3 h-3 mr-1" />
                  Within limits
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start hover:bg-primary/5"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[value="plans"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <Package className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start hover:bg-primary/5"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[value="history"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <History className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">
              Select a plan that fits your coding needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {CREDIT_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                  plan.popular
                    ? "border-primary shadow-md"
                    : "hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.popular && <Badge variant="secondary">Popular</Badge>}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold">₹{plan.price}</span>
                    <span className="text-muted-foreground"> one-time</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {plan.credits}
                    </div>
                    <p className="text-sm text-muted-foreground">AI Credits</p>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full transition-all duration-200 ${
                      plan.popular
                        ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        : "hover:bg-primary hover:text-primary-foreground"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePurchase(plan)}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Purchase Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </CardTitle>
              <CardDescription>
                View your credit purchases and usage history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted animate-pulse rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted animate-pulse rounded w-48"></div>
                          <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : historyError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load transaction history. Please try refreshing
                    the page.
                  </AlertDescription>
                </Alert>
              ) : historyData && historyData.length > 0 ? (
                <div className="space-y-4">
                  {historyData.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:shadow-sm hover:border-primary/20"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full transition-colors duration-200 ${
                            transaction.type === "purchase"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                              : transaction.type === "usage"
                                ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          }`}
                        >
                          {transaction.type === "purchase" ? (
                            <CreditCard className="w-4 h-4" />
                          ) : transaction.type === "usage" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(
                              transaction.created_at,
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-bold text-lg ${
                          transaction.type === "purchase"
                            ? "text-green-600 dark:text-green-400"
                            : transaction.type === "usage"
                              ? "text-red-600 dark:text-red-400"
                              : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {transaction.type === "purchase"
                          ? "+"
                          : transaction.type === "usage"
                            ? "-"
                            : "+"}
                        {transaction.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    No transactions yet
                  </p>
                  <p className="text-sm">
                    Your credit history will appear here once you make purchases
                    or use credits
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
