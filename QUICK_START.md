# Quick Start Guide - IAB OptionsBot

## 🚀 Two Ways to Access the Platform

### Option 1: Development Mode (Bypass Login) ⚡ RECOMMENDED FOR TESTING

**Enable development mode to bypass authentication:**

```bash
cd /Users/iabadvisors/Projects/iab-options-bot
export DISABLE_AUTH=true
source venv/bin/activate
python app.py
```

**What this does:**
- Automatically uses the first user in the database
- No login required
- Perfect for testing and development
- Shows warning in logs: `⚠️  AUTHENTICATION DISABLED - Development mode enabled`

---

### Option 2: Normal Login

**Test User Credentials:**
- **Username:** `testuser`
- **Password:** `testpass`

**To create your own user:**
1. Go to `/register` page
2. Fill in username, email, and password
3. Click "Register"
4. You'll be automatically logged in

---

## 🔧 Troubleshooting Login Issues

### If you can't login:

1. **Check if backend is running:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"service": "IAB OptionsBot", "status": "healthy"}`

2. **Check if user exists:**
   ```bash
   python3 -c "from app import create_app, db; from models.user import User; app = create_app(); app.app_context().push(); users = db.session.query(User).all(); print(f'Users: {len(users)}')"
   ```

3. **Create a test user:**
   ```bash
   python3 << 'EOF'
   from app import create_app, db
   from models.user import User
   app = create_app()
   with app.app_context():
       user = User(username='testuser', email='test@example.com', default_strategy='balanced', risk_tolerance='moderate')
       user.set_password('testpass')
       db.session.add(user)
       db.session.commit()
       print('✅ Test user created: testuser / testpass')
   EOF
   ```

4. **Clear browser localStorage:**
   - Open browser console (F12)
   - Run: `localStorage.clear()`
   - Refresh page

5. **Use Development Mode:**
   - Set `DISABLE_AUTH=true` environment variable
   - Restart backend server
   - No login needed!

---

## 📝 Quick Commands

### Start Backend (Normal Mode)
```bash
cd /Users/iabadvisors/Projects/iab-options-bot
source venv/bin/activate
python app.py
```

### Start Backend (Development Mode - No Login)
```bash
cd /Users/iabadvisors/Projects/iab-options-bot
export DISABLE_AUTH=true
source venv/bin/activate
python app.py
```

### Start Frontend
```bash
cd /Users/iabadvisors/Projects/iab-options-bot/frontend
npm start
```

---

## ✅ Current Status

- ✅ Backend server running on port 5000
- ✅ Frontend server running on port 4000
- ✅ Test user created: `testuser` / `testpass`
- ✅ Development mode available (set `DISABLE_AUTH=true`)

---

## 🎯 Next Steps

1. **Start backend with development mode:**
   ```bash
   export DISABLE_AUTH=true && python app.py
   ```

2. **Or login with test credentials:**
   - Username: `testuser`
   - Password: `testpass`

3. **Access the platform:**
   - Frontend: http://localhost:4000
   - Backend API: http://localhost:5000

---

## 💡 Pro Tip

For testing and development, **always use development mode** (`DISABLE_AUTH=true`). It's faster and eliminates authentication issues!

