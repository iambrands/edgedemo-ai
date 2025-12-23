# Step-by-Step: Revert Trades in Railway

## Method 1: Railway CLI (Easiest if you have CLI installed)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project** (if not already linked):
   ```bash
   railway link
   ```

4. **Run the revert script**:
   ```bash
   railway run python execute_revert_now.py
   ```

## Method 2: Railway Dashboard - Terminal Tab

1. **Go to Railway Dashboard**: https://railway.app
2. **Select your project** (iab-options-bot)
3. **Click on "Web Service"** (the service that's running)
4. **Look for "Terminal" or "Shell" tab** (next to Deployments, Logs, etc.)
5. **Click "Terminal" tab**
6. **Type this command**:
   ```bash
   python execute_revert_now.py
   ```
7. **Press Enter**
8. **Watch the output** - it will show what's being reverted

## Method 3: Railway Dashboard - Deployments (Alternative)

1. **Go to Railway Dashboard**: https://railway.app
2. **Select your project**
3. **Click "Deployments" tab**
4. **Click the three dots (⋯) or "More" button** on the latest deployment
5. **Look for "Run Command" or "Execute Command"**
6. **Enter**: `python execute_revert_now.py`
7. **Click "Run"**

## Method 4: API Endpoint (If Terminal not available)

If you can't find the terminal in Railway, use the API endpoint:

1. **Log into your app**: https://web-production-8b7ae.up.railway.app
2. **Open Browser Console** (F12)
3. **Go to Console tab**
4. **Paste this code**:

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

5. **Press Enter**
6. **Wait for success message**

## What to Look For in Railway

- **Terminal Tab**: Usually visible in the service view
- **Shell Access**: Sometimes called "Shell" instead of "Terminal"
- **Run Command**: May be in the Deployments section
- **One-off Command**: May be under "More" or "Actions" menu

## If You Still Can't Find It

Use **Method 4 (API Endpoint)** - it's the most reliable and doesn't require Railway CLI or terminal access.

