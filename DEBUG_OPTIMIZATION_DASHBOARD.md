# Debug Commands for Optimization Dashboard

If the optimization dashboard page is blank, run these commands in the browser console (F12) to diagnose the issue:

## Quick Diagnostic Commands

### 1. Check if Component is Rendered
```javascript
// Check if React component exists
document.querySelector('[class*="OptimizationDashboard"]') || document.querySelector('h1')?.textContent?.includes('Optimization')
```

### 2. Check Authentication
```javascript
// Check if user is authenticated
console.log('Token:', localStorage.getItem('access_token') ? 'Present' : 'Missing');
console.log('User:', JSON.parse(localStorage.getItem('user') || 'null'));
```

### 3. Test API Endpoints Directly
```javascript
// Test database analysis endpoint
fetch('/api/admin/analyze/database', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Database API:', d))
.catch(e => console.error('❌ Database API Error:', e));

// Test Redis endpoint
fetch('/api/admin/analyze/redis', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Redis API:', d))
.catch(e => console.error('❌ Redis API Error:', e));

// Test connections endpoint
fetch('/api/admin/analyze/connections', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Connections API:', d))
.catch(e => console.error('❌ Connections API Error:', e));
```

### 4. Check Route Configuration
```javascript
// Check if route is registered (requires React DevTools)
window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.forEach(renderer => {
  renderer.getFiberRoots(1).forEach(root => {
    console.log('React Root:', root);
  });
});
```

### 5. Check for JavaScript Errors
```javascript
// List all console errors (should show in Console tab anyway)
console.log('Check Console tab above for any red error messages');
```

### 6. Check React Component State
```javascript
// If React DevTools is installed, run:
// $r - shows selected component
// Or manually check:
const reactRoot = document.querySelector('#root');
console.log('React Root Element:', reactRoot);
console.log('React Root Children:', reactRoot?.children);
```

### 7. Force Reload Component
```javascript
// Force a page reload
window.location.reload();
```

### 8. Check Network Tab Manually
Open DevTools (F12) → Network tab → Filter by "admin" → Look for:
- `/api/admin/analyze/database` - Should return 200 or 401/403
- `/api/admin/analyze/redis` - Should return 200 or 401/403  
- `/api/admin/analyze/connections` - Should return 200 or 401/403

## Common Issues

### Issue 1: Authentication (401/403)
**Solution:** Log out and log back in
```javascript
localStorage.clear();
window.location.href = '/login';
```

### Issue 2: Component Not Rendering
**Solution:** Check if route exists in App.tsx
- Should have: `<Route path="/admin/optimization" element={<OptimizationDashboard />} />`

### Issue 3: CORS Error
**Solution:** Check if API URL is correct
```javascript
console.log('API Base URL:', window.location.origin + '/api');
```

### Issue 4: JavaScript Error Preventing Render
**Solution:** Check Console tab for specific error message

## All-in-One Diagnostic Script

Paste this into the console to run all checks:

```javascript
(async function() {
  console.log('🔍 Optimization Dashboard Diagnostic');
  console.log('='.repeat(50));
  
  // 1. Check Auth
  const token = localStorage.getItem('access_token');
  console.log('1️⃣ Auth:', token ? '✅ Token present' : '❌ No token');
  
  // 2. Check Route
  console.log('2️⃣ Current Path:', window.location.pathname);
  console.log('   Expected: /admin/optimization');
  
  // 3. Test API Endpoints
  console.log('3️⃣ Testing API Endpoints...');
  
  const testEndpoint = async (name, url) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log(`   ${name}:`, response.status === 200 ? '✅ Success' : `❌ ${response.status}`, data);
      return { status: response.status, data };
    } catch (error) {
      console.error(`   ${name}:`, '❌ Error', error);
      return { error };
    }
  };
  
  await testEndpoint('Database', '/api/admin/analyze/database');
  await testEndpoint('Redis', '/api/admin/analyze/redis');
  await testEndpoint('Connections', '/api/admin/analyze/connections');
  
  // 4. Check Component Rendering
  console.log('4️⃣ Component Check:');
  const root = document.querySelector('#root');
  console.log('   Root element:', root ? '✅ Found' : '❌ Missing');
  console.log('   Root children:', root?.children?.length || 0);
  
  // 5. Check for React errors
  console.log('5️⃣ Check Console tab above for React errors');
  
  console.log('='.repeat(50));
  console.log('✅ Diagnostic complete');
})();
```

## Expected Console Output

If everything is working, you should see:
- ✅ Token present
- ✅ Success responses from all 3 API endpoints
- ✅ Component rendering logs: "🔍 OptimizationDashboard mounted", "📊 Loading optimization analyses...", etc.

If something is wrong, you'll see:
- ❌ No token (need to log in)
- ❌ 401/403 errors (authentication issue)
- ❌ 404 errors (endpoint not found - check route registration)
- ❌ 500 errors (server error - check Railway logs)
