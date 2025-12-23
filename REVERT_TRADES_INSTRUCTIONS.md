# How to Revert Incorrect SELL Trades from 12/23/25

## ⚠️ IMPORTANT: The trades are in PRODUCTION database, not local

You need to run the revert on the production server. Here are your options:

## Option 1: Using Railway One-Off Command (Recommended)

1. **Go to Railway Dashboard**: https://railway.app
2. **Select your project** → **Web Service**
3. **Click "Deployments"** tab
4. **Click "New"** → **"One-off Command"**
5. **Enter this command:**
   ```bash
   python execute_revert_now.py
   ```
6. **Click "Run"**
7. **Watch the logs** - you'll see the revert process
8. **Check the output** - it will show how many trades were reverted

## Option 2: Using Browser Console (Easiest)

1. **Log into your app** at https://web-production-8b7ae.up.railway.app
2. **Open Browser DevTools** (Press F12)
3. **Go to Console tab**
4. **Copy and paste this code:**

```javascript
// Get your auth token
const token = localStorage.getItem('access_token');

// Call the revert endpoint
fetch('https://web-production-8b7ae.up.railway.app/api/trades/revert-incorrect-sells', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2025-12-23'
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Success!', data);
  console.log(`Reverted ${data.reverted} trades`);
  console.log(`Reopened ${data.positions_reopened} positions`);
  alert(`Success! Reverted ${data.reverted} trades and reopened ${data.positions_reopened} positions.`);
  // Refresh the page to see updated positions
  window.location.reload();
})
.catch(error => {
  console.error('❌ Error:', error);
  alert('Error reverting trades. Check console for details.');
});
```

5. **Press Enter** to execute
6. **Wait for success message**, then refresh the page

## Option 2: Using curl (Command Line)

```bash
# Replace YOUR_TOKEN with your actual access token
# Get it from browser: localStorage.getItem('access_token')

curl -X POST https://web-production-8b7ae.up.railway.app/api/trades/revert-incorrect-sells \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-12-23"}'
```

## Option 3: Using Python Script

```bash
# Install requests if needed
pip install requests

# Run the script (replace YOUR_TOKEN)
python revert_trades_now.py https://web-production-8b7ae.up.railway.app YOUR_TOKEN
```

## What This Does

1. ✅ Finds all SELL trades from 12/23/2025
2. ✅ Reopens the positions (sets status back to 'open')
3. ✅ Updates positions with current market prices
4. ✅ Adjusts paper balance (subtracts incorrect sell proceeds)
5. ✅ Clears realized P/L from those trades
6. ✅ Marks trades with "[REVERTED - Incorrect sell]" in notes

## After Reverting

- Positions will appear back in "Active Positions"
- They will show the correct entry price (from original BUY trade)
- They will show the current market price (updated automatically)
- Paper balance will be corrected
- Realized P/L will be cleared

## Verify It Worked

1. Check "Active Positions" - you should see the positions back
2. Check "Trade History" - the SELL trades should show $0.00 P/L
3. Check your paper balance - it should be adjusted correctly

