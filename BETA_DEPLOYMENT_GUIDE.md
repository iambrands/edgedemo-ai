# Beta Deployment Guide - Share IAB OptionsBot via URL

This guide covers deploying IAB OptionsBot so beta testers can access it via a URL.

---

## 🚀 Deployment Options

### Option 1: Heroku (Easiest - Recommended for Beta)

**Pros:**
- Free tier available
- Easy deployment
- Automatic SSL/HTTPS
- Built-in PostgreSQL
- Simple URL sharing

**Steps:**

1. **Install Heroku CLI:**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create Heroku App:**
   ```bash
   cd /Users/iabadvisors/Projects/iab-options-bot
   heroku create iab-optionsbot-beta
   ```

4. **Add PostgreSQL Database:**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

5. **Set Environment Variables:**
   ```bash
   # Set all required environment variables
   heroku config:set FLASK_ENV=production
   heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
   heroku config:set JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
   heroku config:set USE_MOCK_DATA=false
   heroku config:set USE_YAHOO_DATA=true
   heroku config:set DISABLE_AUTH=false
   heroku config:set CORS_ORIGINS=https://your-app-name.herokuapp.com
   heroku config:set OPENAI_API_KEY=your-openai-key
   heroku config:set USE_OPENAI_ALERTS=true
   
   # Tradier API (when ready)
   heroku config:set TRADIER_API_KEY=your-tradier-key
   heroku config:set TRADIER_API_SECRET=your-tradier-secret
   heroku config:set TRADIER_ACCOUNT_ID=your-account-id
   heroku config:set TRADIER_SANDBOX=true
   ```

6. **Create Procfile:**
   ```bash
   echo "web: gunicorn app:create_app()" > Procfile
   ```

7. **Update requirements.txt:**
   ```bash
   echo "gunicorn==21.2.0" >> requirements.txt
   ```

8. **Deploy:**
   ```bash
   git add Procfile requirements.txt
   git commit -m "Add Heroku deployment files"
   git push heroku main
   ```

9. **Run Database Migrations:**
   ```bash
   heroku run flask db upgrade
   ```

10. **Get Your URL:**
    ```bash
    heroku info
    # Your app will be at: https://your-app-name.herokuapp.com
    ```

11. **Deploy Frontend:**
    - Option A: Use Heroku buildpack for static sites
    - Option B: Deploy frontend separately (see below)

---

### Option 2: Railway (Modern Alternative)

**Pros:**
- Free tier with $5 credit
- Easy deployment
- Automatic HTTPS
- PostgreSQL included

**Steps:**

1. **Sign up:** https://railway.app
2. **New Project** → Deploy from GitHub
3. **Connect your GitHub repository**
4. **Add PostgreSQL service**
5. **Set environment variables** (same as Heroku)
6. **Deploy**

---

### Option 3: DigitalOcean App Platform

**Pros:**
- $5/month (paid)
- More control
- Better performance

**Steps:**

1. **Sign up:** https://www.digitalocean.com
2. **Create App** → Connect GitHub
3. **Configure:**
   - Backend: Python service
   - Database: Managed PostgreSQL
   - Frontend: Static site (or separate service)
4. **Set environment variables**
5. **Deploy**

---

### Option 4: AWS (Most Flexible)

**Pros:**
- Highly scalable
- Full control
- Professional setup

**Cons:**
- More complex setup
- Requires AWS knowledge

**Components:**
- **Backend:** AWS Elastic Beanstalk or EC2
- **Database:** RDS PostgreSQL
- **Frontend:** S3 + CloudFront
- **Domain:** Route 53

---

## 📋 Pre-Deployment Checklist

### Backend Requirements

- [ ] Database migrations initialized
- [ ] Environment variables documented
- [ ] `Procfile` created (for Heroku/Railway)
- [ ] `gunicorn` added to requirements.txt
- [ ] CORS origins updated for production URL
- [ ] `DISABLE_AUTH=false` in production
- [ ] Strong secret keys generated
- [ ] Database backup strategy

### Frontend Requirements

- [ ] `REACT_APP_API_URL` set to production backend URL
- [ ] Production build tested locally
- [ ] Environment variables configured
- [ ] Build optimized

---

## 🔧 Frontend Deployment

### Option A: Same Domain (Recommended)

Deploy frontend as static files served by backend or CDN.

**For Heroku:**
1. Build frontend: `cd frontend && npm run build`
2. Serve from Flask: Add route to serve `frontend/build` folder
3. Or use Heroku static buildpack

### Option B: Separate Deployment

Deploy frontend separately (Netlify, Vercel, etc.)

**Netlify (Easiest for Frontend):**
1. Sign up: https://netlify.com
2. Connect GitHub repository
3. Build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
4. Environment variables:
   - `REACT_APP_API_URL`: Your backend URL
5. Deploy

**Vercel:**
1. Sign up: https://vercel.com
2. Import GitHub repository
3. Configure build settings
4. Set environment variables
5. Deploy

---

## 🌐 Custom Domain (Optional)

### For Heroku:
```bash
heroku domains:add beta.iaboptionsbot.com
# Then configure DNS with your domain provider
```

### For Netlify/Vercel:
- Add custom domain in dashboard
- Configure DNS records

---

## 🔐 Security for Beta

1. **Rate Limiting:**
   - Add rate limiting to prevent abuse
   - Use Flask-Limiter

2. **User Management:**
   - Create beta tester accounts
   - Or use invite-only registration

3. **Monitoring:**
   - Set up error tracking (Sentry)
   - Monitor API usage
   - Track user activity

4. **Backups:**
   - Automated database backups
   - Regular data exports

---

## 📊 Beta Testing Setup

### Create Beta User Accounts

```bash
# Via Heroku CLI
heroku run python

# In Python shell:
from app import create_app, db
from models.user import User
app = create_app()
with app.app_context():
    user = User(
        username='betatester1',
        email='tester1@example.com',
        default_strategy='balanced',
        risk_tolerance='moderate'
    )
    user.set_password('BetaTest123!')
    db.session.add(user)
    db.session.commit()
    print('Beta user created!')
```

### Or Enable Registration

- Set `DISABLE_AUTH=false` (already set)
- Users can register themselves
- Monitor registrations

---

## 🚀 Quick Deploy Commands (Heroku)

```bash
# Initial setup
heroku create iab-optionsbot-beta
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
heroku config:set JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
heroku config:set USE_MOCK_DATA=false
heroku config:set USE_YAHOO_DATA=true
heroku config:set DISABLE_AUTH=false
heroku config:set CORS_ORIGINS=https://iab-optionsbot-beta.herokuapp.com
heroku config:set OPENAI_API_KEY=your-key

# Deploy
git push heroku main

# Run migrations
heroku run flask db upgrade

# Open app
heroku open
```

---

## 📝 Sharing with Beta Testers

### Share These Details:

1. **URL:** `https://your-app-name.herokuapp.com`
2. **Test Accounts:** (if pre-created)
   - Username: `betatester1`
   - Password: `BetaTest123!`
3. **User Manual:** Share `BETA_USER_MANUAL.md`
4. **Feedback Form:** Google Form or similar
5. **Support:** Email or Discord/Slack channel

---

## 🔄 Updates & Maintenance

### Deploy Updates:
```bash
git add .
git commit -m "Update description"
git push heroku main
```

### View Logs:
```bash
heroku logs --tail
```

### Database Backup:
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

---

## ✅ Post-Deployment Verification

1. **Test All Features:**
   - User registration/login
   - Options analyzer
   - Watchlist
   - Trade execution
   - Dashboard
   - Automations

2. **Check Performance:**
   - Page load times
   - API response times
   - Database queries

3. **Monitor:**
   - Error rates
   - User activity
   - API usage

---

## 🆘 Troubleshooting

### App Won't Start
- Check logs: `heroku logs --tail`
- Verify environment variables
- Check database connection

### CORS Errors
- Verify `CORS_ORIGINS` includes your frontend URL
- Check frontend `REACT_APP_API_URL`

### Database Issues
- Run migrations: `heroku run flask db upgrade`
- Check database connection string

---

**Recommended for Beta:** Heroku (easiest) or Railway (modern alternative)

