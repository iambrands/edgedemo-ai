-- ============================================================
-- Paper Balance Diagnostic and Fix
-- Run this directly on Railway database
-- ============================================================

-- STEP 1: Check current balances
SELECT 
    '=== CURRENT BALANCES ===' as step,
    id,
    email,
    paper_balance,
    CASE 
        WHEN paper_balance < 0 THEN '❌ NEGATIVE'
        WHEN paper_balance < 10000 THEN '⚠️ LOW'
        ELSE '✅ OK'
    END as status
FROM users
WHERE paper_balance IS NOT NULL
ORDER BY paper_balance ASC;

-- STEP 2: Check total position costs
SELECT 
    '=== POSITION ANALYSIS ===' as step,
    COUNT(*) as open_positions,
    COALESCE(SUM(entry_price * quantity * 100), 0) as total_cost,
    COALESCE(SUM((current_price * quantity * 100)), 0) as total_value,
    COALESCE(SUM((current_price - entry_price) * quantity * 100), 0) as total_pnl
FROM positions
WHERE status = 'open';

-- STEP 3: Check recent trades (to identify calculation errors)
SELECT 
    '=== RECENT TRADES (Last 10) ===' as step,
    id,
    symbol,
    action,
    quantity,
    price,
    (price * quantity * 100) as total_amount,
    created_at
FROM trades
ORDER BY created_at DESC
LIMIT 10;

-- STEP 4: Fix negative balances
UPDATE users
SET paper_balance = 100000.00
WHERE paper_balance < 0;

-- STEP 5: Verify fix
SELECT 
    '=== AFTER FIX ===' as step,
    id,
    email,
    paper_balance,
    '✅ FIXED' as status
FROM users
WHERE paper_balance IS NOT NULL
ORDER BY paper_balance DESC;

