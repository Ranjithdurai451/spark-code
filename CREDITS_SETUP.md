# Credits System Setup Guide

This guide will help you set up the complete credit-based system for SparkCode.

## 📋 Prerequisites

- Supabase account and project
- Razorpay account for payments
- Next.js application with the credit system integrated

## 🗄️ Database Setup

### ⚠️ IMPORTANT: Complete Database Reset

If you're having issues with existing tables/policies, use the **COMPLETE RESET** script:

1. Go to your Supabase SQL Editor
2. Copy and paste the entire contents of `supabase-schema.sql` from your project root
3. Run it - this will DROP everything and recreate from scratch

The reset script includes:

- ✅ Drops all existing tables, functions, and policies
- ✅ Creates fresh tables with proper structure
- ✅ Sets up Row Level Security policies correctly
- ✅ Grants necessary permissions
- ✅ Includes verification queries

### 🔍 Verification Queries

After running the schema, verify everything is set up correctly:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'credit_transactions');

-- Check functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('consume_credits', 'add_credits');

-- Check policies exist
SELECT schemaname, tablename, policyname FROM pg_policies
WHERE schemaname = 'public';

-- Check sample data (after first user signs in)
SELECT * FROM users LIMIT 5;
SELECT * FROM credit_transactions LIMIT 5;
```

## 🔧 Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Supabase (for user credits system)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Razorpay (for payments)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### Getting Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the Project URL and service_role key

### Getting Razorpay Keys

1. Log in to your Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate a new key pair if needed
4. Copy the Key ID and Key Secret

## 🚀 Testing the System

### 1. Database Connection Test

First, test if your database is properly set up:

1. Start your development server: `bun run dev`
2. Sign in with GitHub
3. Visit: `http://localhost:3000/api/credits/test`

You should see a JSON response with:

- ✅ User information
- ✅ Database tables found
- ✅ Transaction count

If this fails, your database setup is incomplete.

### 2. User Registration/Login

1. Navigate to your app and sign in with GitHub
2. The system will automatically create a user record with 100 credits

### 3. Check Credits Page

1. Navigate to `/credits`
2. You should see your current credits (100 by default)
3. Try purchasing a plan (use test card details in Razorpay test mode)

### 4. Test Payment Flow

1. Click "Purchase Now" on any plan
2. Use Razorpay test credentials:
   - Card Number: `4111 1111 1111 1111`
   - Expiry: `12/25`
   - CVV: `123`
   - Name: `Test User`
3. Complete the payment
4. Credits should be added to your account
5. Transaction should appear in history

## 🔍 Troubleshooting

### Common Issues

1. **"Payment system not configured" error**
   - Check that Razorpay environment variables are set correctly
   - Ensure you're using the correct key format

2. **"Failed to create payment order" error**
   - Verify Razorpay credentials
   - Check if you're in test mode vs live mode

3. **Credits not updating after payment**
   - Check Supabase connection
   - Verify the payment verification endpoint is working
   - Check browser console for errors

4. **Transaction history not loading**
   - Ensure the `credit_transactions` table exists
   - Check Supabase connection and permissions

### Debug Steps

1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Verify all environment variables are set
4. Test Supabase connection directly

## 📊 Database Verification

Run these queries in Supabase SQL Editor to verify setup:

```sql
-- Check users table
SELECT * FROM users LIMIT 5;

-- Check transactions table
SELECT * FROM credit_transactions LIMIT 5;

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname IN ('consume_credits', 'add_credits');
```

## 🎯 Features Included

- ✅ User registration with credits on GitHub login
- ✅ Credit balance tracking
- ✅ Razorpay payment integration
- ✅ Transaction history
- ✅ Multiple pricing plans
- ✅ Responsive UI with animations
- ✅ Toast notifications
- ✅ Loading states and error handling
- ✅ Secure payment verification

## 📞 Support

If you encounter issues:

1. Check this guide again
2. Verify all environment variables
3. Test with Supabase directly
4. Check Razorpay dashboard for payment status
5. Review browser and server logs

The credit system is now fully functional! 🎉
