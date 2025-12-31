# Quick Setup: Enable Yahoo Finance & Polygon.io

## ✅ Your Code Already Supports These!

The `TradierConnector` already tries Yahoo/Polygon **FIRST** before Tradier. You just need to enable them!

## 🚀 5-Minute Setup

### Step 1: Enable Yahoo Finance (FREE, No API Key)

**Railway Environment Variables:**
```env
USE_YAHOO_DATA=true
USE_MOCK_DATA=false
```

**That's it!** Yahoo Finance will now be used as the primary data source.

### Step 2: Add Polygon.io as Backup (Optional)

1. **Sign up:** https://polygon.io (free account, no credit card)
2. **Get API key** from dashboard
3. **Add to Railway:**
```env
POLYGON_API_KEY=your_key_here
USE_POLYGON_DATA=true
```

## 📊 Current Priority Order (Already Implemented)

The code tries data sources in this order:

1. **Yahoo Finance** (if `USE_YAHOO_DATA=true`)
2. **Polygon.io** (if `USE_POLYGON_DATA=true`)
3. **Tradier** (fallback only)

## ✅ Dependencies Already Installed

Your `requirements.txt` already includes:
- ✅ `yfinance==0.2.28`
- ✅ `polygon-api-client==1.13.0`

No installation needed!

## 🎯 Expected Results

After enabling Yahoo Finance:
- ✅ Option premiums will be accurate (not stock prices)
- ✅ No more "SELL at BUY price" bugs
- ✅ Real-time price updates work correctly
- ✅ P/L calculations will be correct
- ✅ Zero cost, zero setup complexity

## 🔍 How to Verify

After deployment, check Railway logs for:
```
🔧 TRADIER CONFIG: use_mock=False, use_yahoo=True, use_polygon=False
✅ TRADIER: Using Yahoo options chain for HOOD, found 130 options
```

If you see "Using Yahoo" in the logs, it's working!

## 🚨 Why This Fixes Your Issues

**Tradier Problems:**
- `/markets/quotes` returns stock prices for option symbols
- Options chain lookup can fail silently
- Sandbox mode has incorrect data

**Yahoo Finance Benefits:**
- Returns actual option premiums (not stock prices)
- Reliable, well-maintained library
- No API key needed
- Free forever

**Polygon.io Benefits:**
- Official API with support
- Accurate option premiums
- Professional-grade reliability
- Free tier sufficient for testing

---

## 📝 Next Steps

1. **Enable Yahoo Finance now** (set `USE_YAHOO_DATA=true` in Railway)
2. **Deploy**
3. **Test with a new position** - prices should update correctly
4. **Monitor logs** - verify Yahoo is being used

That's it! Your pricing issues should be resolved.

