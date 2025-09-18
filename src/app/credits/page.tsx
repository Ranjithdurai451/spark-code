"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  History,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingDown,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Crown,
  Award,
  Sparkles,
  ArrowLeft,
  Check,
  Zap,
  Shield,
  Star,
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

// Types
interface CreditTransaction {
  id: string;
  user_id: string;
  type: string; // Can be purchase/bonus/refund for additions, or feature_type for consumption
  category: "addition" | "consumption";
  amount: number;
  description: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  feature_type?: string; // Only for consumption
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

interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  features: string[];
  icon: React.ReactNode;
}

// API Functions
async function fetchPlans(): Promise<CreditPlan[]> {
  const response = await fetch("/api/plans");
  if (!response.ok) {
    throw new Error("Failed to fetch plans");
  }
  const data = await response.json();
  return data.plans.map((plan: any) => ({
    ...plan,
    icon: plan.popular ? (
      <Crown className="w-5 h-5" />
    ) : (
      <Target className="w-5 h-5" />
    ),
  }));
}

// API Functions
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

// Razorpay types
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

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Queries
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

  // Dispatch event when credits data changes
  useEffect(() => {
    if (creditsData) {
      window.dispatchEvent(new CustomEvent("credits-updated"));
      localStorage.setItem("credits-updated", Date.now().toString());
    }
  }, [creditsData]);

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

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useQuery({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    retry: 3,
  });

  const userData = creditsData?.user || null;
  const currentCredits = userData?.credits || 0;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!userData || !historyData) return null;

    const totalPurchased = historyData
      .filter((t) => t.category === "addition")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalUsed = historyData
      .filter((t) => t.category === "consumption")
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

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary-foreground animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-48 mx-auto"></div>
            <div className="h-3 bg-muted animate-pulse rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Authentication check
  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  // Payment handler
  const handlePurchase = async (plan: CreditPlan) => {
    setSelectedPlan(plan.id);
    setIsProcessingPayment(true);

    try {
      // Create Razorpay order
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

      // Load Razorpay script
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
              `Payment successful! ${plan.credits} credits added to your account.`,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="mr-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="p-2 bg-primary rounded-lg">
                  <CreditCard className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Credits & Billing</h1>
                  <p className="text-muted-foreground">
                    Manage your credits for AI features and code execution
                  </p>
                </div>
              </div>
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

        {/* User Profile Card */}
        {userData && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-white shadow-lg">
                  <AvatarImage src={userData.avatar_url} alt={userData.login} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold">
                    {userData.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">
                      {userData.name || userData.login}
                    </h2>
                    <Badge variant="secondary">@{userData.login}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">{userData.email}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined{" "}
                      {new Date(userData.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Last login{" "}
                      {new Date(userData.last_login_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {currentCredits}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available Credits
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Package className="w-4 h-4" />
              Upgrade Plans
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              Usage History
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <History className="w-4 h-4" />
              Transaction History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Current Credits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Credits
                  </CardTitle>
                  <div className="p-2 bg-primary rounded-lg">
                    <CreditCard className="h-4 w-4 text-primary-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingCredits ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{currentCredits}</div>
                      <p className="text-xs text-muted-foreground">
                        Available for AI & code execution
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Total Used */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Used
                  </CardTitle>
                  <div className="p-2 bg-primary rounded-lg">
                    <TrendingDown className="h-4 w-4 text-primary-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userData?.total_credits_spent || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credits consumed
                  </p>
                </CardContent>
              </Card>

              {/* Efficiency */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Efficiency
                  </CardTitle>
                  <div className="p-2 bg-primary rounded-lg">
                    <Target className="h-4 w-4 text-primary-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.efficiency.toFixed(1) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credits utilization rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {stats?.recentTransactions &&
              stats.recentTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Your latest credit transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.recentTransactions.map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                transaction.type === "purchase"
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                  : transaction.type === "usage"
                                    ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                              }`}
                            >
                              {transaction.type === "purchase" ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : transaction.type === "usage" ? (
                                <ArrowDownRight className="w-4 h-4" />
                              ) : (
                                <Award className="w-4 h-4" />
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
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Choose Your Plan</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Purchase credits to unlock AI code generation, analysis, and
                execution features.
              </p>
            </div>

            {isLoadingPlans ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="text-center">
                      <div className="w-12 h-12 bg-muted rounded-xl mx-auto mb-4"></div>
                      <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mb-6">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="h-4 bg-muted rounded"></div>
                        ))}
                      </div>
                      <div className="h-10 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : plansError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load plans. Please refresh the page.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {plansData?.map((plan: CreditPlan) => (
                  <Card
                    key={plan.id}
                    className={`relative transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                      plan.popular
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:border-primary/50"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <Badge variant="default" className="px-3 py-1">
                          <Star className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                        {plan.popular ? (
                          <Crown className="w-5 h-5 text-primary" />
                        ) : (
                          <Target className="w-5 h-5 text-primary" />
                        )}
                      </div>

                      <CardTitle className="text-lg font-semibold mb-2">
                        {plan.name}
                      </CardTitle>

                      <div className="text-3xl font-bold text-primary mb-1">
                        {plan.credits}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        credits
                      </div>

                      <div className="text-2xl font-bold">₹{plan.price}</div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full"
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
                            <CreditCard className="w-4 h-4 mr-2" />
                            Buy Credits
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Bottom CTA Section */}
            {/* {!isLoadingPlans && !plansError && ( */}
            {/*   <div className="mt-16 text-center relative z-10"> */}
            {/*     <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20"> */}
            {/*       <div className="max-w-2xl mx-auto space-y-6"> */}
            {/*         <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto shadow-lg"> */}
            {/*           <Shield className="w-8 h-8 text-white" /> */}
            {/*         </div> */}
            {/*         <h3 className="text-2xl font-bold"> */}
            {/*           Ready to Start Coding with AI? */}
            {/*         </h3> */}
            {/*         <p className="text-muted-foreground text-lg"> */}
            {/*           Join thousands of developers who trust SparkCode for their */}
            {/*           AI-powered coding needs. Get started today and experience */}
            {/*           the future of software development. */}
            {/*         </p> */}
            {/*         <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"> */}
            {/*           <div className="flex items-center gap-2"> */}
            {/*             <Check className="w-4 h-4 text-green-500" /> */}
            {/*             <span>30-day money-back guarantee</span> */}
            {/*           </div> */}
            {/*           <div className="flex items-center gap-2"> */}
            {/*             <Check className="w-4 h-4 text-green-500" /> */}
            {/*             <span>24/7 customer support</span> */}
            {/*           </div> */}
            {/*           <div className="flex items-center gap-2"> */}
            {/*             <Check className="w-4 h-4 text-green-500" /> */}
            {/*             <span>Regular feature updates</span> */}
            {/*           </div> */}
            {/*         </div> */}
            {/*       </div> */}
            {/*     </div> */}
            {/*   </div> */}
            {/* )} */}
          </TabsContent>

          {/* Usage History Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Usage History
                </CardTitle>
                <CardDescription>
                  Credits used for AI generation, analysis, and code execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
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
                      Failed to load usage history. Please try refreshing the
                      page.
                    </AlertDescription>
                  </Alert>
                ) : historyData &&
                  historyData.filter((t) => t.category === "consumption")
                    .length > 0 ? (
                  <div className="space-y-4">
                    {historyData
                      .filter(
                        (transaction) => transaction.category === "consumption",
                      )
                      .map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm hover:border-primary/20 transition-all duration-200"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                              <ArrowDownRight className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-base">
                                {transaction.description}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
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
                          </div>
                          <div className="font-bold text-xl text-red-600 dark:text-red-400">
                            -{transaction.amount}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingDown className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-lg font-medium mb-2">
                      No usage history yet
                    </p>
                    <p className="text-sm">
                      Your credit usage will appear here once you use AI
                      features
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  All credit purchases and bonus credits received
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
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
                ) : historyData &&
                  historyData.filter((t) => t.category === "addition").length >
                    0 ? (
                  <div className="space-y-4">
                    {historyData
                      .filter(
                        (transaction) => transaction.category === "addition",
                      )
                      .map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm hover:border-primary/20 transition-all duration-200"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-muted">
                              {transaction.type === "purchase" ? (
                                <ArrowUpRight className="w-5 h-5" />
                              ) : transaction.type === "usage" ? (
                                <ArrowDownRight className="w-5 h-5" />
                              ) : (
                                <Award className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-base">
                                {transaction.description}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
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
                          </div>
                          <div className="font-bold text-xl">
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
                      Your transaction history will appear here once you make
                      purchases or receive bonuses
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
