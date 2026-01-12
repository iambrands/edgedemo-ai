# 🚀 Going Live Checklist - IAB OptionsBot

## Overview
This document outlines all the changes and considerations needed when transitioning from paper trading to **LIVE trading with real money**.

---

## ⚠️ CRITICAL: Pre-Launch Requirements

### 1. **Tradier Production Account Setup**

#### Current Status:
- ✅ System supports both sandbox and production
- ✅ Trading mode is configurable per user
- ⚠️ Currently using **Tradier Sandbox** (test environment)

#### Required Changes:

**Step 1: Get Tradier Production Account**
1. Sign up for Tradier production account: https://www.tradier.com/
2. Complete account verification (ID, bank account, etc.)
3. Fund your account with real money
4. Get production API credentials:
   - Production API Key
   - Production API Secret (if required)
   - Production Account ID

**Step 2: Update Environment Variables**
```bash
# In Railway/Heroku environment variables:

# Switch from sandbox to production
TRADIER_SANDBOX=false
TRADIER_BASE_URL=https://api.tradier.com/v1  # Production URL (not sandbox)

# Update with production credentials
TRADIER_API_KEY=your_production_api_key
TRADIER_API_SECRET=your_production_api_secret
TRADIER_ACCOUNT_ID=your_production_account_id

# Ensure real data is used
USE_MOCK_DATA=false
```

**Step 3: Verify Production Connection**
- Test API connection with production credentials
- Verify account balance is accessible
- Test a small order (if possible) or use Tradier's test order endpoint

---

### 2. **User Trading Mode Configuration**

#### Current Status:
- ✅ Users default to `trading_mode='paper'`
- ✅ System checks `user.trading_mode` before executing trades
- ✅ Paper balance is tracked separately

#### Required Changes:

**Option A: Switch Individual Users to Live**
```python
# Via database or admin interface
user.trading_mode = 'live'
user.paper_balance = None  # Not used in live mode
db.session.commit()
```

**Option B: Set Default to Live (for new users)**
```python
# In models/user.py - change default:
trading_mode = db.Column(db.String(10), default='live')  # Changed from 'paper'
```

**Option C: Add Admin Interface**
- Create admin endpoint to switch users between paper/live
- Add confirmation dialogs (require password confirmation)
- Log all mode switches for audit trail

---

### 3. **Risk Management Hardening**

#### Current Status:
- ✅ Risk management system exists
- ✅ Default limits are conservative
- ⚠️ Need to verify limits are appropriate for live trading

#### Required Actions:

**Review and Set Risk Limits:**
```python
# Default limits (in models/risk_limits.py):
max_position_size_percent = 2.0      # 2% per position
max_capital_at_risk_percent = 10.0   # 10% total at risk
max_open_positions = 10               # Max 10 positions
max_daily_loss_percent = 5.0          # Stop trading at 5% daily loss
max_weekly_loss_percent = 10.0        # Stop trading at 10% weekly loss
min_dte = 7                           # Minimum 7 days to expiration
max_dte = 60                          # Maximum 60 days to expiration
```

**Action Items:**
1. ✅ Review default limits - are they appropriate for your risk tolerance?
2. ✅ Set user-specific limits based on account size
3. ✅ Add **circuit breakers** (auto-pause trading if losses exceed thresholds)
4. ✅ Add **position size limits** based on account balance
5. ✅ Add **daily/weekly/monthly loss limits** with auto-stop

**Recommended Additions:**
- Maximum position size in dollars (not just %)
- Maximum portfolio delta/theta/vega exposure
- Minimum account balance threshold (stop trading if balance too low)
- Maximum number of trades per day

---

### 4. **Order Execution Safety**

#### Current Status:
- ✅ Paper trading: Simulated execution
- ✅ Live trading: Calls `tradier.place_order()` with real API
- ⚠️ Need additional safety checks for live orders

#### Required Enhancements:

**Add Pre-Order Validation:**
```python
# In services/trade_executor.py - before placing live order:

1. Verify account has sufficient buying power
2. Check position limits (max positions, max per symbol)
3. Validate order size (not too large)
4. Check market hours (if applicable)
5. Verify symbol is tradeable
6. Check for duplicate orders (prevent accidental double-orders)
7. Add confirmation step for large orders (>$X)
```

**Add Order Confirmation:**
- For live orders > $X, require explicit confirmation
- Log all live orders with full details
- Send email/SMS notification for live orders

**Add Order Limits:**
- Maximum order size (e.g., $10,000 per order)
- Maximum daily order volume
- Rate limiting (max X orders per minute)

---

### 5. **Real-Time Data Requirements**

#### Current Status:
- ✅ Using Tradier API for market data
- ✅ Sandbox uses delayed data (15-20 min delay)
- ⚠️ Production needs real-time or near-real-time data

#### Required Changes:

**Tradier Data Tiers:**
- **Sandbox**: Delayed data (15-20 min delay) - FREE
- **Production Basic**: Delayed data - FREE
- **Production Market Data**: Real-time data - PAID subscription required

**Action Items:**
1. ✅ Verify Tradier subscription includes real-time data (if needed)
2. ✅ Update data refresh intervals (currently 2 minutes - may need faster)
3. ✅ Add data quality checks (detect stale data)
4. ✅ Add fallback mechanisms if data feed fails

**Performance Considerations:**
- Real-time data = more API calls = higher costs
- May need to optimize caching
- May need to reduce update frequency for non-critical data

---

### 6. **Monitoring & Alerting**

#### Current Status:
- ✅ Basic logging exists
- ⚠️ Need enhanced monitoring for live trading

#### Required Additions:

**Trading Activity Monitoring:**
- Real-time dashboard of all live trades
- Alert on every live order execution
- Alert on position exits (profit/loss)
- Alert on risk limit breaches
- Alert on account balance changes

**Error Monitoring:**
- Alert on API failures
- Alert on order rejections
- Alert on data feed issues
- Alert on system errors

**Performance Monitoring:**
- Track API response times
- Track order execution times
- Monitor system uptime
- Track data freshness

**Recommended Tools:**
- Sentry (error tracking)
- Datadog/New Relic (performance monitoring)
- Email/SMS alerts for critical events
- Slack/Discord webhooks for team notifications

---

### 7. **Compliance & Legal**

#### Required Actions:

1. **Terms of Service**
   - Update ToS to include live trading disclaimers
   - Add risk warnings
   - Include liability limitations

2. **User Agreements**
   - Require users to acknowledge risks before enabling live trading
   - Add confirmation dialogs
   - Store acceptance timestamps

3. **Regulatory Compliance**
   - Verify Tradier handles regulatory requirements
   - Ensure proper trade reporting (if required)
   - Add tax reporting features (1099 generation)

4. **Data Privacy**
   - Ensure financial data is encrypted
   - Comply with financial data regulations
   - Add audit logging for sensitive operations

---

### 8. **Testing Before Going Live**

#### Required Test Scenarios:

1. **Small Test Trade**
   - Place smallest possible live order
   - Verify execution
   - Verify position tracking
   - Verify balance update
   - Close position
   - Verify P/L calculation

2. **Risk Limit Testing**
   - Test max position size limit
   - Test daily loss limit
   - Test position count limit
   - Verify limits are enforced

3. **Error Handling**
   - Test API failure scenarios
   - Test insufficient funds scenario
   - Test invalid order scenarios
   - Verify graceful error handling

4. **Performance Testing**
   - Test under high load
   - Test with multiple concurrent users
   - Test data refresh performance
   - Test order execution speed

---

## 📊 System Performance Expectations

### Current Performance (Paper Trading):
- **Price Updates**: Every 2 minutes (via cron job)
- **Position Monitoring**: Every 5 minutes
- **API Calls**: ~60-120 calls/minute (within Tradier limits)
- **Response Times**: < 2 seconds for most endpoints

### Expected Performance (Live Trading):

**With Real-Time Data:**
- **Price Updates**: Every 1-2 minutes (may need faster for active trading)
- **Position Monitoring**: Every 1-5 minutes (depending on strategy)
- **API Calls**: May increase to 120-240 calls/minute
- **Response Times**: Similar (< 2 seconds), but may increase during market hours

**Potential Bottlenecks:**
1. **API Rate Limits**: Tradier has rate limits (check your plan)
2. **Database Load**: More frequent updates = more DB writes
3. **Network Latency**: Production API may have different latency
4. **Concurrent Users**: Multiple users = more API calls

**Optimization Strategies:**
- Batch API calls where possible
- Cache data aggressively (but respect freshness requirements)
- Use connection pooling (already implemented)
- Consider upgrading Tradier plan for higher rate limits
- Monitor and optimize slow queries

---

## 🔧 Code Changes Required

### Minimal Changes (Configuration Only):
If you only need to switch from sandbox to production:

1. **Update Environment Variables** (see section 1)
2. **Switch User Trading Mode** (see section 2)
3. **Test with small order**

### Recommended Enhancements:

1. **Add Live Trading Confirmation**
```python
# In services/trade_executor.py
if user.trading_mode == 'live':
    # Require explicit confirmation for live orders
    if not order_confirmed:
        return {'error': 'Live order requires confirmation'}
```

2. **Add Order Size Limits**
```python
# Maximum order size check
max_order_size = 10000  # $10,000
if trade_cost > max_order_size:
    return {'error': f'Order size exceeds maximum of ${max_order_size}'}
```

3. **Add Enhanced Logging**
```python
# Log all live orders with full context
if user.trading_mode == 'live':
    current_app.logger.critical(
        f"🚨 LIVE ORDER: {action} {quantity} {symbol} @ ${price} "
        f"(user_id={user_id}, account_balance={account_balance})"
    )
```

4. **Add Circuit Breakers**
```python
# Auto-pause trading if losses exceed threshold
if daily_loss_percent > max_daily_loss_percent:
    user.trading_mode = 'paused'  # New state
    send_alert('Trading paused due to daily loss limit')
```

---

## 📋 Pre-Launch Checklist

### Configuration:
- [ ] Tradier production account created and verified
- [ ] Production API credentials obtained
- [ ] Environment variables updated (TRADIER_SANDBOX=false)
- [ ] Test connection to production API
- [ ] Verify account balance is accessible

### Risk Management:
- [ ] Review and set appropriate risk limits
- [ ] Test risk limit enforcement
- [ ] Add circuit breakers (if not already present)
- [ ] Set position size limits
- [ ] Set daily/weekly loss limits

### Testing:
- [ ] Place small test order in production
- [ ] Verify order execution
- [ ] Verify position tracking
- [ ] Verify balance updates
- [ ] Test error scenarios
- [ ] Test risk limit enforcement

### Monitoring:
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up performance monitoring
- [ ] Configure email/SMS alerts
- [ ] Test alert delivery
- [ ] Set up dashboard for live trading activity

### Legal/Compliance:
- [ ] Update Terms of Service
- [ ] Add risk warnings
- [ ] Add user confirmation dialogs
- [ ] Ensure data encryption
- [ ] Add audit logging

### User Experience:
- [ ] Add clear indicators for live vs paper trading
- [ ] Add confirmation dialogs for live orders
- [ ] Add warnings before switching to live mode
- [ ] Update UI to show real account balance
- [ ] Add "Switch to Live" flow with warnings

---

## 🚨 Critical Warnings

1. **Start Small**: Begin with smallest possible orders
2. **Monitor Closely**: Watch first few live trades carefully
3. **Have Exit Plan**: Know how to quickly disable live trading
4. **Test Everything**: Don't assume - test every scenario
5. **Backup Plan**: Have manual override to stop all trading
6. **Document Everything**: Log all decisions and changes

---

## 🎯 Recommended Rollout Plan

### Phase 1: Preparation (1-2 weeks)
- Set up production account
- Configure environment
- Review and set risk limits
- Add monitoring/alerting

### Phase 2: Testing (1 week)
- Small test orders
- Verify all functionality
- Test error scenarios
- Performance testing

### Phase 3: Limited Launch (1-2 weeks)
- Enable for 1-2 trusted users
- Monitor closely
- Gather feedback
- Fix any issues

### Phase 4: Full Launch
- Enable for all users
- Continue monitoring
- Iterate based on feedback

---

## 📞 Support & Resources

- **Tradier Support**: https://developer.tradier.com/support
- **Tradier API Docs**: https://developer.tradier.com/documentation
- **System Logs**: Check Railway/Heroku logs for errors
- **Error Tracking**: Set up Sentry for error monitoring

---

## ✅ Summary

**Minimum Changes to Go Live:**
1. Update `TRADIER_SANDBOX=false` in environment
2. Update Tradier credentials to production
3. Switch user `trading_mode` to `'live'`
4. Test with small order

**Recommended Enhancements:**
- Add order confirmation dialogs
- Add enhanced monitoring/alerting
- Review and harden risk limits
- Add circuit breakers
- Test thoroughly before full launch

**The system is already designed to support live trading - most changes are configuration and safety enhancements!**

