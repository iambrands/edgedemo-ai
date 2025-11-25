# Troubleshooting 401 UNAUTHORIZED Errors

## Common Causes

### 1. **Expired Access Token**
- Access tokens expire after 24 hours
- Solution: The app should automatically refresh using the refresh token
- If refresh fails, you'll need to log in again

### 2. **Missing or Invalid Token**
- Token might not be in localStorage
- Token might be corrupted
- Solution: Clear localStorage and log in again

### 3. **Refresh Token Expired**
- Refresh tokens expire after 30 days
- If both tokens are expired, you must log in again

## How to Fix

### Quick Fix:
1. **Open Browser Console** (F12)
2. **Clear localStorage:**
   ```javascript
   localStorage.removeItem('access_token');
   localStorage.removeItem('refresh_token');
   ```
3. **Refresh the page** and log in again

### Check Token Status:
```javascript
// In browser console:
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));
```

### Verify Backend:
```bash
# Check if backend is running
curl http://localhost:5000/health

# Should return: {"service": "IAB OptionsBot", "status": "healthy"}
```

## What I Fixed

1. **Improved API Interceptor:**
   - Better error handling for token refresh
   - Prevents retry loops on auth endpoints
   - Clears tokens when refresh fails

2. **Better Error Messages:**
   - More descriptive error messages
   - Better logging for debugging

3. **Token Refresh Logic:**
   - Automatically attempts refresh on 401
   - Falls back gracefully if refresh fails

## Testing Authentication

### Test Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Test Token Validation:
```bash
# Replace YOUR_TOKEN with actual token
curl -X GET http://localhost:5000/api/auth/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

1. **Clear browser localStorage** and log in again
2. **Check browser console** for specific error messages
3. **Verify backend is running** on port 5000
4. **Check network tab** to see which endpoint is failing

If the issue persists, check:
- Backend logs for authentication errors
- Browser console for detailed error messages
- Network tab to see the exact request/response

