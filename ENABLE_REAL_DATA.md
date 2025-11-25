# Enable Real Data from Yahoo Finance

## Quick Setup

To use **real market data** instead of mock data for technical analysis and automation:

### 1. Enable Yahoo Finance in `.env` file

Add or update this line in your `.env` file:

```bash
USE_YAHOO_DATA=true
```

### 2. Install Required Packages

The technical analyzer now uses `pandas` and `numpy` for calculations:

```bash
pip install pandas numpy
```

Or if using the requirements file:

```bash
pip install -r requirements.txt
```

### 3. Restart the Server

After updating `.env`, restart your Flask server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
python app.py
```

## What This Enables

With `USE_YAHOO_DATA=true`, the automation engine will:

✅ **Real Technical Indicators:**
- **SMA (Simple Moving Averages)**: 20-day, 50-day, 200-day calculated from real price history
- **RSI (Relative Strength Index)**: 14-period RSI from actual price movements
- **MACD**: Real MACD line, signal line, and histogram
- **Volume Analysis**: Real average volume vs current volume
- **Support/Resistance**: Real 52-week high/low from historical data

✅ **Better Signal Generation:**
- Signals based on actual market conditions
- More accurate confidence scores
- Real trend detection
- Actual overbought/oversold conditions

✅ **Improved Automation:**
- Automations will trigger based on real market conditions
- More reliable entry/exit signals
- Better risk assessment

## Verification

After enabling, you can verify it's working:

1. **Check Server Logs**: Look for any yfinance errors
2. **Run a Cycle**: Click "Run Cycle Now" and check diagnostics
3. **Check Indicators**: The technical analyzer will now show real values instead of mock data

## Fallback Behavior

If yfinance fails or `USE_YAHOO_DATA=false`:
- System falls back to simplified/mock indicators
- Automation still works, but with less accurate signals
- You'll see warnings in logs if yfinance data is unavailable

## Notes

- **No API Key Required**: yfinance is completely free
- **Rate Limits**: Yahoo Finance has rate limits, but they're generous for normal use
- **Data Delay**: Free data may have a 15-20 minute delay (fine for most automation)
- **Historical Data**: Gets up to 250 days of history for accurate indicators

---

*Last Updated: January 2025*

