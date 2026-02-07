# Quick Railway Setup (5 minutes)

## Step 1: Deploy to Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `iab-options-bot` repository
4. Railway will auto-detect and start deploying

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically set `DATABASE_URL` environment variable

## Step 3: Set Environment Variables

Go to your service → Variables tab and add:

```
FLASK_ENV=production
JWT_SECRET_KEY=<generate-a-random-secret-key>
TRADIER_API_KEY=your-tradier-api-key-here
TRADIER_ACCOUNT_ID=your-tradier-account-id-here
TRADIER_BASE_URL=https://sandbox.tradier.com/v1
USE_MOCK_DATA=false
```

## Step 4: Run Database Migrations

1. In Railway dashboard, go to your service
2. Click "Deployments" → "View Logs"
3. Add a one-off command: `flask db upgrade`
4. Or use Railway CLI: `railway run flask db upgrade`

## Step 5: Get Your URL

Railway will provide a URL like: `https://your-app.railway.app`

## That's it! Your app should be live.

The frontend build is included in the repo, so Railway will serve it automatically.


