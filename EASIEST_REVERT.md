# EASIEST WAY: Revert Trades via Browser Console

## No Railway Access Needed - Just Your Browser!

1. **Open your app**: https://web-production-8b7ae.up.railway.app
2. **Log in** (if not already logged in)
3. **Press F12** (or right-click → Inspect)
4. **Click the "Console" tab**
5. **Copy and paste this entire code block**:

```javascript
const token = localStorage.getItem('access_token');
if (!token) {
  alert('❌ Not logged in! Please log in first.');
} else {
  console.log('🔄 Reverting trades from 12/23/25...');
  fetch('https://web-production-8b7ae.up.railway.app/api/trades/revert-incorrect-sells', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date: '2025-12-23' })
  })
  .then(r => {
    if (!r.ok) {
      return r.json().then(err => Promise.reject(err));
    }
    return r.json();
  })
  .then(data => {
    console.log('✅ SUCCESS!', data);
    alert(`✅ SUCCESS!\n\nReverted: ${data.reverted} trades\nReopened: ${data.positions_reopened} positions\n\nPage will refresh...`);
    setTimeout(() => window.location.reload(), 2000);
  })
  .catch(e => {
    console.error('❌ Error:', e);
    alert('❌ Error: ' + (e.error || e.message || 'Check console for details'));
  });
}
```

6. **Press Enter**
7. **Wait for the success alert** (should take 2-5 seconds)
8. **Page will auto-refresh** and you'll see the positions back!

## What You'll See

- Console will show: "🔄 Reverting trades from 12/23/25..."
- Then: "✅ SUCCESS!" with details
- Alert popup with summary
- Page refreshes automatically
- Positions appear back in "Active Positions"

## If You Get an Error

- **401 Unauthorized**: You need to log in first
- **500 Error**: Check the console for details
- **Network Error**: Check your internet connection

## That's It!

No Railway access needed. No terminal needed. Just your browser!

