# Heroku Deployment - Step by Step

Follow these steps to deploy IAB OptionsBot to Heroku.

---

## Step 1: Install Heroku CLI

**macOS (using Homebrew):**
```bash
brew tap heroku/brew && brew install heroku
```

**Or download from:**
https://devcenter.heroku.com/articles/heroku-cli

**Verify installation:**
```bash
heroku --version
```

---

## Step 2: Login to Heroku

```bash
heroku login
```

This will open a browser window for you to login. Or use:
```bash
heroku login -i
```

---

## Step 3: Create Heroku App

```bash
cd /Users/iabadvisors/Projects/iab-options-bot
heroku create iab-optionsbot-beta
```

**Note:** If the name is taken, try:
```bash
heroku create iab-optionsbot-beta-2025
```

---

## Step 4: Add PostgreSQL Database

```bash
heroku addons:create heroku-postgresql:mini
```

This will automatically set `DATABASE_URL` environment variable.

---

## Step 5: Set Environment Variables

Run these commands one by one:

```bash
# Flask Configuration
heroku config:set FLASK_ENV=production

# Generate and set secret keys
heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
heroku config:set JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Application Settings
heroku config:set USE_MOCK_DATA=false
heroku config:set USE_YAHOO_DATA=true
heroku config:set DISABLE_AUTH=false

# CORS - Update with your actual app URL after creation
heroku config:set CORS_ORIGINS=https://iab-optionsbot-beta.herokuapp.com

# OpenAI (you already have this)
heroku config:set OPENAI_API_KEY=your-openai-api-key-here
heroku config:set USE_OPENAI_ALERTS=true

# Tradier (when you have credentials - optional for now)
# heroku config:set TRADIER_API_KEY=your-key
# heroku config:set TRADIER_API_SECRET=your-secret
# heroku config:set TRADIER_ACCOUNT_ID=your-account-id
# heroku config:set TRADIER_SANDBOX=true
```

**After creating the app, update CORS_ORIGINS:**
```bash
# Get your app URL
heroku info

# Then set CORS with your actual URL
heroku config:set CORS_ORIGINS=https://your-actual-app-name.herokuapp.com
```

---

## Step 6: Commit Deployment Files

```bash
git add Procfile requirements.txt
git commit -m "Add Heroku deployment configuration"
git push
```

---

## Step 7: Deploy to Heroku

```bash
git push heroku main
```

This will:
- Build your application
- Install dependencies
- Deploy to Heroku

**First deployment takes 3-5 minutes.**

---

## Step 8: Run Database Migrations

```bash
heroku run flask db init
heroku run flask db migrate -m "Initial migration"
heroku run flask db upgrade
```

**Note:** If migrations already exist locally, you can skip `init` and just run:
```bash
heroku run flask db upgrade
```

---

## Step 9: Verify Deployment

```bash
# Check app status
heroku ps

# View logs
heroku logs --tail

# Open app in browser
heroku open
```

**Test the health endpoint:**
```bash
curl https://your-app-name.herokuapp.com/health
```

Should return:
```json
{"service": "IAB OptionsBot", "status": "healthy"}
```

---

## Step 10: Update CORS for Frontend

Once you know your Heroku URL, update CORS:

```bash
heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com
```

If deploying frontend separately, add that URL too:
```bash
heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com,https://your-frontend-url.com
```

---

## Step 11: Deploy Frontend (Optional)

### Option A: Serve from Heroku

Add to your Flask app to serve static files from `frontend/build`.

### Option B: Deploy to Netlify/Vercel

1. Build frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy to Netlify:
   - Connect GitHub repo
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
   - Environment variable: `REACT_APP_API_URL=https://your-app-name.herokuapp.com/api`

---

## 🔍 Troubleshooting

### App Won't Start
```bash
heroku logs --tail
```
Check for errors in the logs.

### Database Issues
```bash
heroku run flask db upgrade
heroku pg:info
```

### CORS Errors
- Verify `CORS_ORIGINS` includes your frontend URL
- Check frontend `REACT_APP_API_URL` is set correctly

### Build Fails
- Check `requirements.txt` is correct
- Verify `Procfile` exists
- Check logs: `heroku logs --tail`

---

## 📊 Monitoring

### View Logs
```bash
heroku logs --tail
```

### Check App Status
```bash
heroku ps
heroku info
```

### Database Info
```bash
heroku pg:info
```

---

## 🔄 Updating Your App

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push heroku main
```

---

## ✅ Post-Deployment Checklist

- [ ] App is accessible via URL
- [ ] Health endpoint works
- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] CORS configured correctly
- [ ] Frontend deployed (if separate)
- [ ] Test user registration/login
- [ ] Test API endpoints

---

## 🎯 Your App URL

After deployment, your app will be at:
```
https://your-app-name.herokuapp.com
```

Share this URL with beta testers along with `BETA_USER_MANUAL.md`!

---

**Ready to start?** Run the commands in order, starting with Step 1!

