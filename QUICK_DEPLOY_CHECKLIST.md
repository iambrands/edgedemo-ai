# Quick Heroku Deployment Checklist

Follow these steps in order to deploy IAB OptionsBot to Heroku.

---

## ✅ Pre-Deployment Steps

- [ ] **Build frontend locally:**
  ```bash
  cd frontend
  npm install
  npm run build
  cd ..
  ```

- [ ] **Verify Procfile exists:**
  ```bash
  cat Procfile
  ```
  Should show: `web: gunicorn app:create_app()`

- [ ] **Check requirements.txt is up to date:**
  ```bash
  cat requirements.txt
  ```

---

## 🚀 Deployment Steps

### 1. Install & Login
```bash
# Install Heroku CLI (if not installed)
brew tap heroku/brew && brew install heroku

# Login
heroku login
```

### 2. Create App
```bash
heroku create iab-optionsbot
# Note your app name - you'll need it!
```

### 3. Add Database
```bash
heroku addons:create heroku-postgresql:essential-0
```

### 4. Set Environment Variables
```bash
# Generate secrets
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"

# Set config vars (replace YOUR_APP_NAME with actual app name)
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key-here
heroku config:set JWT_SECRET_KEY=your-jwt-secret-key-here
heroku config:set USE_MOCK_DATA=false
heroku config:set USE_YAHOO_DATA=true
heroku config:set DISABLE_AUTH=false
heroku config:set CORS_ORIGINS=https://YOUR_APP_NAME.herokuapp.com
heroku config:set OPENAI_API_KEY=your-openai-api-key-here
heroku config:set USE_OPENAI_ALERTS=true
heroku config:set TRADIER_API_KEY=your-tradier-api-key-here
heroku config:set TRADIER_ACCOUNT_ID=your-tradier-account-id-here
heroku config:set TRADIER_BASE_URL=https://sandbox.tradier.com/v1
heroku config:set TRADIER_SANDBOX=true
```

### 5. Commit & Push
```bash
# Make sure frontend is built
cd frontend && npm run build && cd ..

# Commit changes
git add .
git commit -m "Prepare for Heroku deployment"

# Push to Heroku
git push heroku main
# (or git push heroku master if that's your branch)
```

### 6. Setup Database
```bash
heroku run flask db upgrade
```

### 7. Verify
```bash
# Check status
heroku ps

# View logs
heroku logs --tail

# Test health endpoint
curl https://YOUR_APP_NAME.herokuapp.com/health

# Open in browser
heroku open
```

---

## 🎯 Your App URL

After deployment:
```
https://YOUR_APP_NAME.herokuapp.com
```

---

## 📝 Notes

- First deployment takes 3-5 minutes
- App may sleep after 30 min inactivity (free tier)
- Check logs if something doesn't work: `heroku logs --tail`
- Update CORS_ORIGINS with your actual app URL

---

**For detailed instructions, see:** `COMPLETE_HEROKU_DEPLOYMENT.md`

