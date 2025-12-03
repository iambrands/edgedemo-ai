# Railway Deployment Guide

## Quick Deploy to Railway

### Option 1: Deploy via Railway Dashboard (Easiest)

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the `iab-options-bot` repository
5. Railway will auto-detect the project and deploy

### Option 2: Deploy via Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize and deploy:
   ```bash
   railway init
   railway up
   ```

## Environment Variables

Set these in Railway dashboard under your project → Variables:

- `FLASK_ENV=production`
- `JWT_SECRET_KEY=<your-secret-key>`
- `DATABASE_URL` (Railway will auto-create PostgreSQL and set this)
- `TRADIER_API_KEY=<your-key>`
- `TRADIER_ACCOUNT_ID=<your-account-id>`
- `TRADIER_BASE_URL=https://sandbox.tradier.com/v1`
- `USE_MOCK_DATA=false`
- `CORS_ORIGINS=<your-railway-url>`

## Build Configuration

Railway will automatically:
- Detect Python and install dependencies from `requirements.txt`
- Build the frontend (configured in `railway.json`)
- Run migrations
- Start the app with gunicorn

## Database Migrations

After first deploy, run migrations:
```bash
railway run flask db upgrade
```

Or in Railway dashboard: Add a one-off command service with:
```
flask db upgrade
```

## Notes

- Railway auto-detects the build process from `railway.json`
- Static files are served by Flask (configured in `app.py`)
- The app will be available at `https://<your-project>.railway.app`

