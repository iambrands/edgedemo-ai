# Quick Guide: Revert 12/23/25 Trades

## The Problem
Trades from 12/23/25 were sold with incorrect prices, showing unrealistically high P/L (1700% - 6000%+). These need to be reverted back to active positions.

## The Solution

### Method 1: Railway One-Off Command (BEST)

1. Go to: https://railway.app
2. Select your project → Web Service
3. Click "Deployments" → "New" → "One-off Command"
4. Paste: `python execute_revert_now.py`
5. Click "Run"
6. Wait for completion
7. Refresh your app - positions should be back!

### Method 2: API Endpoint (If Method 1 doesn't work)

1. Log into your app
2. Open Browser Console (F12)
3. Paste this code:

```javascript
const token = localStorage.getItem('access_token');
fetch('https://web-production-8b7ae.up.railway.app/api/trades/revert-incorrect-sells', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ date: '2025-12-23' })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Success!', data);
  alert(`Reverted ${data.reverted} trades!\nReopened ${data.positions_reopened} positions`);
  window.location.reload();
})
.catch(e => {
  console.error('Error:', e);
  alert('Error - check console');
});
```

4. Press Enter
5. Wait for success message
6. Page will auto-refresh

## What Gets Fixed

✅ Positions reopened (back in "Active Positions")
✅ Current prices updated (shows real market prices)
✅ Paper balance corrected (subtracts incorrect sell proceeds)
✅ Realized P/L cleared (shows $0.00 for those trades)
✅ Entry prices preserved (original BUY prices)

## Verify It Worked

1. Check "Active Positions" - should see the positions back
2. Check "Trade History" - SELL trades should show $0.00 P/L
3. Check paper balance - should be adjusted correctly

