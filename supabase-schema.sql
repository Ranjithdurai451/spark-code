-- =====================================================
-- SPARKCODE CREDITS SYSTEM - PRODUCTION SCHEMA
-- =====================================================
-- Professional multi-table design for credits system
-- Run this ENTIRE script in Supabase SQL Editor

-- =====================================================
-- STEP 1: COMPLETE CLEANUP
-- =====================================================

-- Drop all policies first
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'credit_additions', 'credit_consumption')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS consume_credits(TEXT, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_credits(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_balance(TEXT) CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_login;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_credit_additions_user_id;
DROP INDEX IF EXISTS idx_credit_additions_created_at;
DROP INDEX IF EXISTS idx_credit_additions_type;
DROP INDEX IF EXISTS idx_credit_consumption_user_id;
DROP INDEX IF EXISTS idx_credit_consumption_created_at;
DROP INDEX IF EXISTS idx_credit_consumption_feature;

-- Drop tables (with CASCADE to handle dependencies)
DROP TABLE IF EXISTS credit_consumption CASCADE;
DROP TABLE IF EXISTS credit_additions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES WITH PROPER STRUCTURE
-- =====================================================

-- Plans table - stores available credit plans
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price INTEGER NOT NULL CHECK (price > 0), -- Price in rupees
  popular BOOLEAN DEFAULT FALSE,
  features TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (id, name, credits, price, popular, features) VALUES
  ('starter', 'Starter', 100, 99, FALSE, ARRAY['Get started with AI features']),
  ('pro', 'Professional', 500, 399, TRUE, ARRAY['Most popular for regular use']),
  ('enterprise', 'Enterprise', 2000, 1299, FALSE, ARRAY['Best value for heavy users']);

-- Users table - stores user account information and current balance
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100 CHECK (credits >= 0),
  total_credits_earned INTEGER DEFAULT 100,
  total_credits_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit additions table - tracks credits added to user accounts
CREATE TABLE credit_additions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'bonus', 'refund')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit consumption table - tracks credits used by features
CREATE TABLE credit_consumption (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('chatbot', 'execute', 'ai_execute', 'analyze', 'generate_docs', 'generate_tests')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API key usage table - tracks API key usage and quotas
CREATE TABLE api_key_usage (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  key_index INTEGER NOT NULL,
  total_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  quota_exhausted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service, key_index)
);

-- Service config table - tracks current key indices and total keys per service
CREATE TABLE service_config (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) UNIQUE NOT NULL,
  current_key_index INTEGER DEFAULT 0,
  total_keys INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Credit additions indexes
CREATE INDEX idx_credit_additions_user_id ON credit_additions(user_id);
CREATE INDEX idx_credit_additions_created_at ON credit_additions(created_at DESC);
CREATE INDEX idx_credit_additions_type ON credit_additions(type);
CREATE INDEX idx_credit_additions_user_type ON credit_additions(user_id, type);

-- Credit consumption indexes
CREATE INDEX idx_credit_consumption_user_id ON credit_consumption(user_id);
CREATE INDEX idx_credit_consumption_created_at ON credit_consumption(created_at DESC);
CREATE INDEX idx_credit_consumption_feature ON credit_consumption(feature_type);
CREATE INDEX idx_credit_consumption_user_feature ON credit_consumption(user_id, feature_type);

-- API key usage indexes
CREATE INDEX idx_api_key_usage_service ON api_key_usage(service);
CREATE INDEX idx_api_key_usage_key_index ON api_key_usage(service, key_index);
CREATE INDEX idx_api_key_usage_last_used ON api_key_usage(last_used_at DESC);

-- Service config indexes
CREATE INDEX idx_service_config_service ON service_config(service);

-- =====================================================
-- STEP 4: CREATE FUNCTIONS WITH PROPER SECURITY
-- =====================================================

-- Function to safely consume credits
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_feature_type TEXT DEFAULT 'chatbot',
  p_description TEXT DEFAULT 'Credits consumed for AI operation'
)
RETURNS JSON AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Validate feature type
    IF p_feature_type NOT IN ('chatbot', 'execute', 'ai_execute', 'analyze', 'generate_docs', 'generate_tests') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid feature type');
    END IF;

    -- Get current credits with row lock
    SELECT credits INTO v_current_credits
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_current_credits < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_credits - p_amount;

    -- Update user credits
    UPDATE users
    SET
        credits = v_new_balance,
        total_credits_spent = total_credits_spent + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log consumption
    INSERT INTO credit_consumption (
        user_id, feature_type, amount, description
    ) VALUES (
        p_user_id, p_feature_type, p_amount, p_description
    ) RETURNING id INTO v_transaction_id;

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT 'Credits added',
  p_razorpay_order_id TEXT DEFAULT NULL,
  p_razorpay_payment_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Validate addition type
    IF p_type NOT IN ('purchase', 'bonus', 'refund') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid addition type');
    END IF;

    -- Get current credits with row lock
    SELECT credits INTO v_current_credits
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_credits + p_amount;

    -- Update user credits
    UPDATE users
    SET
        credits = v_new_balance,
        total_credits_earned = total_credits_earned + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log addition
    INSERT INTO credit_additions (
        user_id, type, amount, description, razorpay_order_id, razorpay_payment_id
    ) VALUES (
        p_user_id, p_type, p_amount, p_description, p_razorpay_order_id, p_razorpay_payment_id
    ) RETURNING id INTO v_transaction_id;

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user balance and transaction summary
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_recent_additions JSON;
    v_recent_consumption JSON;
BEGIN
    -- Get user data
    SELECT * INTO v_user_record
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Get recent additions (last 5)
    SELECT json_agg(
        json_build_object(
            'id', id,
            'type', type,
            'amount', amount,
            'description', description,
            'created_at', created_at
        )
    ) INTO v_recent_additions
    FROM (
        SELECT * FROM credit_additions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
    ) additions;

    -- Get recent consumption (last 5)
    SELECT json_agg(
        json_build_object(
            'id', id,
            'feature_type', feature_type,
            'amount', amount,
            'description', description,
            'created_at', created_at
        )
    ) INTO v_recent_consumption
    FROM (
        SELECT * FROM credit_consumption
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
    ) consumption;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', v_user_record.id,
            'login', v_user_record.login,
            'email', v_user_record.email,
            'name', v_user_record.name,
            'avatar_url', v_user_record.avatar_url,
            'credits', v_user_record.credits,
            'total_credits_earned', v_user_record.total_credits_earned,
            'total_credits_spent', v_user_record.total_credits_spent,
            'created_at', v_user_record.created_at,
            'last_login_at', v_user_record.last_login_at
        ),
        'recent_additions', COALESCE(v_recent_additions, '[]'::json),
        'recent_consumption', COALESCE(v_recent_consumption, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment key usage
CREATE OR REPLACE FUNCTION increment_key_usage(
  p_service VARCHAR(50),
  p_key_index INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_key_usage (service, key_index, total_requests, last_used_at, updated_at)
  VALUES (p_service, p_key_index, 1, NOW(), NOW())
  ON CONFLICT (service, key_index)
  DO UPDATE SET
    total_requests = api_key_usage.total_requests + 1,
    last_used_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record failed request
CREATE OR REPLACE FUNCTION record_failed_request(
  p_service VARCHAR(50),
  p_key_index INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_key_usage (service, key_index, failed_requests, last_used_at, updated_at)
  VALUES (p_service, p_key_index, 1, NOW(), NOW())
  ON CONFLICT (service, key_index)
  DO UPDATE SET
    failed_requests = api_key_usage.failed_requests + 1,
    last_used_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES (SERVICE ROLE BYPASS)
-- =====================================================

-- Plans table policies - Public read access for active plans
CREATE POLICY "plans_select_policy" ON plans
  FOR SELECT USING (active = true);

-- Users table policies - Service role bypasses all restrictions
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (true);

-- Credit additions policies - Service role bypasses all restrictions
CREATE POLICY "additions_select_policy" ON credit_additions
  FOR SELECT USING (true);

CREATE POLICY "additions_insert_policy" ON credit_additions
  FOR INSERT WITH CHECK (true);

-- Credit consumption policies - Service role bypasses all restrictions
CREATE POLICY "consumption_select_policy" ON credit_consumption
  FOR SELECT USING (true);

CREATE POLICY "consumption_insert_policy" ON credit_consumption
  FOR INSERT WITH CHECK (true);

-- API key usage policies - Service role bypasses all restrictions
CREATE POLICY "api_key_usage_select_policy" ON api_key_usage
  FOR SELECT USING (true);

CREATE POLICY "api_key_usage_insert_policy" ON api_key_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "api_key_usage_update_policy" ON api_key_usage
  FOR UPDATE USING (true);

-- Service config policies - Service role bypasses all restrictions
CREATE POLICY "service_config_select_policy" ON service_config
  FOR SELECT USING (true);

CREATE POLICY "service_config_insert_policy" ON service_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_config_update_policy" ON service_config
  FOR UPDATE USING (true);

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON users TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON credit_additions TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON credit_consumption TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON api_key_usage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON service_config TO anon, authenticated, service_role;

-- Grant function execution
GRANT EXECUTE ON FUNCTION consume_credits(TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_credits(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_balance(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_key_usage(VARCHAR, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_failed_request(VARCHAR, INTEGER) TO anon, authenticated, service_role;

-- Grant sequence permissions (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- =====================================================
-- STEP 9: CREATE USEFUL VIEWS
-- =====================================================

-- View for user credit summary
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT
    u.id,
    u.login,
    u.credits,
    u.total_credits_earned,
    u.total_credits_spent,
    COALESCE(SUM(ca.amount), 0) as credits_purchased,
    COALESCE(SUM(cc.amount), 0) as credits_used,
    GREATEST(
        MAX(ca.created_at),
        MAX(cc.created_at)
    ) as last_transaction_at
FROM users u
LEFT JOIN credit_additions ca ON u.id = ca.user_id
LEFT JOIN credit_consumption cc ON u.id = cc.user_id
GROUP BY u.id, u.login, u.credits, u.total_credits_earned, u.total_credits_spent;

-- =====================================================
-- STEP 10: MIGRATE EXISTING DATA
-- =====================================================

-- Legacy migration code removed - using new multi-table schema

-- =====================================================
-- STEP 9: CREATE USEFUL VIEWS
-- =====================================================

-- View for user credit summary
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT
    u.id,
    u.login,
    u.credits,
    u.total_credits_earned,
    u.total_credits_spent,
    COALESCE(SUM(CASE WHEN ca.type = 'purchase' THEN ca.amount ELSE 0 END), 0) as credits_purchased,
    COALESCE(SUM(cc.amount), 0) as credits_used,
    GREATEST(MAX(ca.created_at), MAX(cc.created_at)) as last_transaction_at
FROM users u
LEFT JOIN credit_additions ca ON u.id = ca.user_id
LEFT JOIN credit_consumption cc ON u.id = cc.user_id
GROUP BY u.id, u.login, u.credits, u.total_credits_earned, u.total_credits_spent;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check tables exist and have correct structure
-- SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Check functions
-- SELECT proname, pg_get_function_identity_arguments(oid) as args
-- FROM pg_proc WHERE proname IN ('consume_credits', 'add_credits');

-- Test the setup (run after creating a user)
-- SELECT * FROM user_credit_summary LIMIT 5;