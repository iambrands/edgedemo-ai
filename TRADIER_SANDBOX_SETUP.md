# Tradier Sandbox Setup Guide

## Step 1: Create Tradier Sandbox Account

1. Go to: https://developer.tradier.com/
2. Click "Sign Up" or "Get Started"
3. Create a free developer account
4. Once logged in, go to your **Dashboard**

## Step 2: Get Your Sandbox Credentials

1. In your Tradier dashboard, navigate to **"My Accounts"** or **"API Access"**
2. Find the **Sandbox** section (not Production)
3. You'll need:
   - **API Key** (also called Access Token)
   - **API Secret** (if required)
   - **Account ID** (your sandbox account number)

## Step 3: Update Your .env File

Add these to your `.env` file:

```bash
# Tradier Sandbox Configuration
TRADIER_API_KEY=your_api_key_here
TRADIER_API_SECRET=your_api_secret_here
TRADIER_ACCOUNT_ID=your_sandbox_account_id
TRADIER_BASE_URL=https://sandbox.tradier.com/v1
TRADIER_SANDBOX=true

# Use Real Data (not mock)
USE_MOCK_DATA=false
USE_YAHOO_DATA=false
```

## Step 4: Restart Backend

After updating `.env`, restart your backend server:

```bash
# Stop current server (Ctrl+C or kill process)
# Then restart:
cd /Users/iabadvisors/Projects/iab-options-bot
source venv/bin/activate
python app.py
```

## Step 5: Verify It's Working

1. Check backend logs for any Tradier API errors
2. Try fetching an options chain in the Options Analyzer
3. You should see real data instead of mock data

## Important Notes

- **Sandbox is FREE** - No credit card required
- **Sandbox has rate limits** - But sufficient for testing
- **Sandbox uses delayed data** - Not real-time, but close
- **Sandbox account** - You'll get a virtual account with fake money

## Troubleshooting

### If you get 401 errors:
- Double-check your API key is correct
- Make sure you're using **Sandbox** credentials, not Production
- Verify `TRADIER_BASE_URL` is set to `https://sandbox.tradier.com/v1`

### If you get rate limit errors:
- Sandbox has rate limits (usually 120 requests/minute)
- The app will automatically retry or use fallback data

### If you want to switch back to mock data:
- Set `USE_MOCK_DATA=true` in `.env`
- Restart backend

## Next Steps After Setup

Once Tradier is configured:
- ✅ Real options chains
- ✅ Real market prices
- ✅ Real Greeks data
- ✅ Better automation testing with real market conditions

