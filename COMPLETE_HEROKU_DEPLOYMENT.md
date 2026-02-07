# Complete Heroku Deployment Guide - IAB OptionsBot

This guide will walk you through deploying both the backend (Flask) and frontend (React) to Heroku.

---

## 📋 Prerequisites

- Heroku account (free tier is fine)
- Git repository (already set up)
- Heroku CLI installed
- All environment variables ready

---

## 🚀 Step 1: Install Heroku CLI

**macOS:**
```bash
brew tap heroku/brew && brew install heroku
```

**Or download from:** https://devcenter.heroku.com/articles/heroku-cli

**Verify:**
```bash
heroku --version
```

---

## 🔐 Step 2: Login to Heroku

```bash
heroku login
```

This opens a browser for login. Or use:
```bash
heroku login -i
```

---

## 🏗️ Step 3: Create Heroku App

```bash
cd /Users/iabadvisors/Projects/iab-options-bot
heroku create iab-optionsbot
```

**Note:** If the name is taken, try variations:
- `iab-optionsbot-beta`
- `iab-optionsbot-2025`
- `yourname-optionsbot`

**Save your app name** - you'll need it for CORS configuration!

---

## 🗄️ Step 4: Add PostgreSQL Database

```bash
heroku addons:create heroku-postgresql:essential-0
```

**Note:** The `mini` plan is no longer available. `essential-0` is the free tier option.

This automatically sets the `DATABASE_URL` environment variable.

**Verify:**
```bash
heroku config:get DATABASE_URL
```

---

## ⚙️ Step 5: Set Environment Variables

Run these commands **one by one**:

### Flask Configuration
```bash
heroku config:set FLASK_ENV=production
```

### Generate Secret Keys
```bash
# Generate secure secret keys
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and set:
```bash
heroku config:set SECRET_KEY=your-generated-secret-key-here
heroku config:set JWT_SECRET_KEY=your-generated-jwt-secret-key-here
```

### Application Settings
```bash
heroku config:set USE_MOCK_DATA=false
heroku config:set USE_YAHOO_DATA=true
heroku config:set USE_POLYGON_DATA=false
heroku config:set DISABLE_AUTH=false
```

### CORS Configuration
**Get your app URL first:**
```bash
heroku info
```

Then set CORS (replace with your actual app name):
```bash
heroku config:set CORS_ORIGINS=https://iab-optionsbot.herokuapp.com,https://www.iab-optionsbot.herokuapp.com
```

### OpenAI Configuration
```bash
heroku config:set OPENAI_API_KEY=your-openai-api-key-here
heroku config:set USE_OPENAI_ALERTS=true
```

### Tradier Configuration (Optional - for real trading)
```bash
heroku config:set TRADIER_API_KEY=your-tradier-api-key-here
heroku config:set TRADIER_ACCOUNT_ID=your-tradier-account-id-here
heroku config:set TRADIER_BASE_URL=https://sandbox.tradier.com/v1
heroku config:set TRADIER_SANDBOX=true
```

### Verify All Config Vars
```bash
heroku config
```

---

## 📦 Step 6: Prepare Frontend for Deployment

### Option A: Serve Frontend from Heroku (Recommended)

Update `app.py` to serve static files. Check if this is already configured:

```python
# In app.py, add route to serve React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
```

### Build Frontend Locally First
```bash
cd frontend
npm install
npm run build
cd ..
```

This creates `frontend/build/` directory.

---

## 📝 Step 7: Update Procfile (if needed)

Verify your `Procfile` contains:
```
web: gunicorn app:create_app()
```

If serving frontend from Heroku, you may need:
```
web: gunicorn app:create_app() --bind 0.0.0.0:$PORT
```

---

## 📤 Step 8: Commit and Push to Heroku

```bash
# Make sure all files are committed
git status

# Add any uncommitted files
git add .

# Commit (if needed)
git commit -m "Prepare for Heroku deployment"

# Push to Heroku
git push heroku main
```

**Note:** If your default branch is `master`, use:
```bash
git push heroku master
```

**First deployment takes 3-5 minutes.** Watch the logs!

---

## 🗃️ Step 9: Run Database Migrations

```bash
# Initialize database (if first time)
heroku run flask db init

# Create migration
heroku run flask db migrate -m "Initial migration"

# Apply migration
heroku run flask db upgrade
```

**If migrations already exist locally:**
```bash
# Just upgrade
heroku run flask db upgrade
```

---

## ✅ Step 10: Verify Deployment

### Check App Status
```bash
heroku ps
```

### View Logs
```bash
heroku logs --tail
```

### Test Health Endpoint
```bash
curl https://your-app-name.herokuapp.com/health
```

Should return:
```json
{"service": "IAB OptionsBot", "status": "healthy"}
```

### Open in Browser
```bash
heroku open
```

---

## 🎨 Step 11: Deploy Frontend (If Separate)

### Option A: Serve from Heroku (Already Done)

If you configured `app.py` to serve static files, your frontend should be accessible at:
```
https://your-app-name.herokuapp.com
```

### Option B: Deploy to Netlify/Vercel (Separate)

1. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com
   - Connect your GitHub repository
   - Build settings:
     - Build command: `cd frontend && npm install && npm run build`
     - Publish directory: `frontend/build`
   - Environment variables:
     - `REACT_APP_API_URL=https://your-app-name.herokuapp.com/api`

3. **Update CORS on Heroku:**
   ```bash
   heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com,https://your-netlify-app.netlify.app
   ```

---

## 🔧 Step 12: Update Frontend API URL

If deploying frontend separately, update `frontend/src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-app-name.herokuapp.com/api';
```

Or set environment variable in Netlify/Vercel:
```
REACT_APP_API_URL=https://your-app-name.herokuapp.com/api
```

---

## 🧪 Step 13: Test Your Deployment

1. **Test Registration:**
   - Go to your app URL
   - Try registering a new user
   - Check if it works

2. **Test Login:**
   - Login with your test user
   - Verify JWT tokens work

3. **Test API Endpoints:**
   ```bash
   # Test health
   curl https://your-app-name.herokuapp.com/health
   
   # Test API (with auth token)
   curl -H "Authorization: Bearer YOUR_TOKEN" https://your-app-name.herokuapp.com/api/auth/user
   ```

4. **Test Options Analyzer:**
   - Try analyzing an option
   - Verify AI analysis works
   - Check if Tradier/Yahoo data loads

---

## 🔍 Troubleshooting

### App Won't Start
```bash
heroku logs --tail
```
Look for errors in the logs.

### Database Issues
```bash
# Check database status
heroku pg:info

# Reset database (WARNING: deletes all data)
heroku pg:reset DATABASE_URL
heroku run flask db upgrade
```

### CORS Errors
- Verify `CORS_ORIGINS` includes your frontend URL
- Check frontend `REACT_APP_API_URL` is set correctly
- Ensure no trailing slashes in URLs

### Build Fails
- Check `requirements.txt` is correct
- Verify `Procfile` exists and is correct
- Check Python version: `runtime.txt` (if needed)
- View build logs: `heroku logs --tail`

### Frontend Not Loading
- Verify `frontend/build` exists
- Check if `app.py` serves static files correctly
- Check browser console for errors

### Environment Variables Not Working
```bash
# List all config vars
heroku config

# Get specific var
heroku config:get OPENAI_API_KEY

# Set var
heroku config:set VAR_NAME=value
```

---

## 📊 Monitoring & Maintenance

### View Logs
```bash
# Real-time logs
heroku logs --tail

# Last 100 lines
heroku logs -n 100

# Specific process
heroku logs --ps web
```

### Check App Status
```bash
heroku ps
heroku info
```

### Database Management
```bash
# Database info
heroku pg:info

# Database backups
heroku pg:backups:capture
heroku pg:backups:list

# Restore backup
heroku pg:backups:restore BACKUP_URL
```

### Scale Your App
```bash
# Scale web dynos (free tier: 1 dyno)
heroku ps:scale web=1

# For production, consider:
heroku ps:scale web=2
```

---

## 🔄 Updating Your App

After making changes:

```bash
# Commit changes
git add .
git commit -m "Description of changes"

# Push to Heroku
git push heroku main

# Run migrations if needed
heroku run flask db upgrade

# Restart app
heroku restart
```

---

## 🎯 Post-Deployment Checklist

- [ ] App is accessible via URL
- [ ] Health endpoint works (`/health`)
- [ ] Database migrations completed
- [ ] All environment variables set
- [ ] CORS configured correctly
- [ ] Frontend loads and displays correctly
- [ ] User registration works
- [ ] User login works
- [ ] API endpoints respond correctly
- [ ] Options Analyzer works
- [ ] AI analysis generates correctly
- [ ] Tradier/Yahoo data loads (if configured)
- [ ] Error handling works
- [ ] Logs are accessible

---

## 🔐 Security Checklist

- [ ] `DISABLE_AUTH=false` in production
- [ ] Strong `SECRET_KEY` and `JWT_SECRET_KEY` set
- [ ] `FLASK_ENV=production`
- [ ] CORS only allows your frontend domain
- [ ] API keys stored as environment variables (not in code)
- [ ] Database credentials secure
- [ ] HTTPS enabled (automatic on Heroku)

---

## 📱 Your App URLs

**Backend API:**
```
https://your-app-name.herokuapp.com/api
```

**Frontend (if served from Heroku):**
```
https://your-app-name.herokuapp.com
```

**Frontend (if separate):**
```
https://your-netlify-app.netlify.app
```

---

## 🚨 Important Notes

1. **Free Tier Limitations:**
   - App sleeps after 30 minutes of inactivity
   - 550-1000 hours/month free
   - PostgreSQL: 10,000 rows max (free tier)

2. **Database:**
   - Heroku Postgres is automatically backed up
   - Free tier: 10,000 rows, 20 connections

3. **Environment Variables:**
   - Never commit `.env` file to Git
   - All secrets should be in Heroku config vars

4. **CORS:**
   - Update `CORS_ORIGINS` when deploying frontend
   - Include both `www` and non-`www` versions if needed

---

## 🎉 You're Done!

Your IAB OptionsBot is now live on Heroku! Share the URL with beta testers along with `COMPLETE_USER_MANUAL.md`.

**Next Steps:**
- Monitor logs for errors
- Test all features thoroughly
- Set up custom domain (optional)
- Configure automated backups
- Set up monitoring/alerts

---

## 📞 Need Help?

- Heroku Docs: https://devcenter.heroku.com
- Heroku Status: https://status.heroku.com
- Check logs: `heroku logs --tail`
- Heroku Support: https://help.heroku.com

---

**Ready to deploy?** Start with Step 1 and work through each step sequentially!

