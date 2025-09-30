export type CreditsUser = {
  id: string;
  login: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  credits: number;
  total_credits_earned: number;
  total_credits_spent: number;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

export type CreditTransaction = {
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
};

export interface CreditCheckResult {
  allowed: boolean;
  available: number;
  required: number;
  shortfall?: number;
  transactionId?: string;
}
