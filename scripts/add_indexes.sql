-- Performance Indexes for OptionsEdge
-- Run this manually in Railway PostgreSQL if the migration fails
-- 
-- Connect to database:
--   1. Railway Dashboard → PostgreSQL service → Data tab → Query
--   2. Or: railway connect postgres
--
-- Expected improvements:
--   - Positions: 20s → 0.01s (2000x faster)
--   - Trades: 40s → 0.1s (400x faster)  
--   - Watchlist: 90s → 0.1s (900x faster)

-- ============================================================
-- POSITIONS TABLE - Critical for dashboard loading
-- ============================================================

-- Most common query: "get open positions for user"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_positions_user_status 
    ON positions(user_id, status);

-- For position monitoring sorted by last update
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_positions_status_updated 
    ON positions(status, last_updated DESC);

-- ============================================================
-- TRADES TABLE - Critical for history and recent trades
-- ============================================================

-- Most common query: "get trades for user sorted by date"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_date 
    ON trades(user_id, trade_date DESC);

-- For automation trade lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_automation_id 
    ON trades(automation_id);

-- ============================================================
-- STOCKS TABLE (Watchlist) - Critical for watchlist loading
-- ============================================================

-- Most common query: "get watchlist for user"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stocks_user_id 
    ON stocks(user_id);

-- For duplicate checks and specific symbol lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stocks_user_symbol 
    ON stocks(user_id, symbol);

-- ============================================================
-- AUTOMATIONS TABLE - For automation engine
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automations_user_active 
    ON automations(user_id, is_active);

-- ============================================================
-- ALERTS TABLE - For alert loading
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_unread 
    ON alerts(user_id, is_read, created_at DESC);

-- ============================================================
-- VERIFY INDEXES WERE CREATED
-- ============================================================

SELECT 
    schemaname,
    tablename, 
    indexname
FROM pg_indexes 
WHERE tablename IN ('positions', 'trades', 'stocks', 'automations', 'alerts')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
