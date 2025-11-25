# Options Data API Options for Paper Trading

## 🎯 Best Options for Testing (Free/Easy Setup)

### 1. **Polygon.io** ⭐ RECOMMENDED
**Why:** Free tier, easy setup, real options data

**Free Tier Includes:**
- All US options tickers
- 5 API calls per minute
- 2 years of historical data
- Real-time options prices
- Greeks (Delta, Gamma, Theta, Vega)
- Volume and Open Interest

**Setup:**
1. Sign up at https://polygon.io (free account)
2. Get API key from dashboard
3. No credit card required for free tier

**API Endpoints:**
- Options chain: `GET /v3/snapshot/options/{underlying_ticker}`
- Options contract details: `GET /v3/snapshot/options/{underlying_ticker}/{option_ticker}`
- Historical data: `GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`

**Rate Limits:**
- Free: 5 calls/minute
- Starter ($29/mo): 200 calls/minute
- Developer ($99/mo): 1000 calls/minute

---

### 2. **Yahoo Finance (Unofficial API)** ⭐ FREE
**Why:** Completely free, no signup needed

**Pros:**
- No API key required
- Real-time and historical data
- Options chains available
- No rate limits (but be respectful)

**Cons:**
- Unofficial API (may break)
- No official support
- Terms of service unclear

**Implementation:**
- Use `yfinance` Python library
- Or scrape Yahoo Finance directly

**Example:**
```python
import yfinance as yf
ticker = yf.Ticker("AAPL")
options = ticker.option_chain('2025-01-17')
```

---

### 3. **Alpha Vantage** ⭐ FREE
**Why:** Free tier with options data

**Free Tier:**
- 5 API calls per minute
- 500 calls per day
- Options data available
- Real-time quotes

**Setup:**
1. Sign up at https://www.alphavantage.co/support/#api-key
2. Get free API key
3. No credit card required

**API Endpoints:**
- Options data: `GET /query?function=OPTIONS_CHAIN&symbol=AAPL&apikey=YOUR_KEY`

---

### 4. **Twelve Data** ⭐ FREE
**Why:** Generous free tier

**Free Tier:**
- 800 API calls/day
- Real-time and historical data
- Options data available
- No credit card required

**Setup:**
1. Sign up at https://twelvedata.com
2. Get API key
3. Free tier includes options

---

### 5. **Market Data APIs (Paid but Affordable)**
- **ORATS**: $99/month, comprehensive options data
- **IVolatility**: $149/month, professional-grade data
- **CBOE DataShop**: Varies, official exchange data

---

## 🚀 Quick Implementation Guide

### Option 1: Polygon.io (Recommended for Testing)

**Step 1:** Sign up at https://polygon.io
**Step 2:** Get your API key
**Step 3:** Add to `.env`:
```env
POLYGON_API_KEY=your_api_key_here
USE_POLYGON_DATA=true
USE_MOCK_DATA=false
```

**Step 4:** Install Python library:
```bash
pip install polygon-api-client
```

---

### Option 2: Yahoo Finance (Free, No Signup)

**Step 1:** Install library:
```bash
pip install yfinance
```

**Step 2:** Add to `.env`:
```env
USE_YAHOO_DATA=true
USE_MOCK_DATA=false
```

**Step 3:** No API key needed!

---

## 📊 Data Comparison

| Provider | Free Tier | Options Data | Greeks | Rate Limit | Setup Time |
|----------|-----------|--------------|--------|-------------|------------|
| Polygon.io | ✅ Yes | ✅ Full | ✅ Yes | 5/min | 2 min |
| Yahoo Finance | ✅ Yes | ✅ Full | ✅ Yes | None* | 1 min |
| Alpha Vantage | ✅ Yes | ✅ Limited | ⚠️ Partial | 5/min | 2 min |
| Twelve Data | ✅ Yes | ✅ Full | ✅ Yes | 800/day | 2 min |
| ORATS | ❌ No | ✅ Full | ✅ Yes | 20k/mo | 5 min |

*Unofficial API, use responsibly

---

## 🎯 Recommendation for Your Use Case

**For Quick Testing:** Use **Yahoo Finance** (yfinance library)
- No signup required
- Works immediately
- Good for development/testing

**For Production-Ready Testing:** Use **Polygon.io**
- Official API
- Reliable
- Free tier sufficient for testing
- Easy to upgrade later

---

## 🔧 Implementation Priority

1. **Start with Yahoo Finance** (yfinance) - Get it working in 5 minutes
2. **Add Polygon.io** as backup/alternative
3. **Keep Tradier integration** for when you're ready for live trading

---

## 📝 Next Steps

1. Choose your provider (recommend Polygon.io or Yahoo Finance)
2. I'll help you implement the data connector
3. Test with real data
4. Keep paper trading with real market data!


