# Running Database Migrations on Railway

Since your environment variables are already set, you need to:

## Step 1: Wait for Deployment
Railway should automatically deploy when you push to GitHub. Check the "Deployments" tab to see if it's deploying.

## Step 2: Run Database Migrations

### Option A: Via Railway Dashboard (Easiest)

1. Go to your Railway project dashboard
2. Click on your **"web"** service
3. Go to the **"Deployments"** tab
4. Find the latest deployment
5. Click **"..."** (three dots) → **"Run Command"** or look for a terminal/command option
6. Run: `flask db upgrade`

### Option B: Via Railway CLI

If you re-authenticate the CLI:
```bash
railway login
railway run flask db upgrade
```

## Step 3: Verify

After migrations run, check the logs to confirm:
- ✅ "Running upgrade..."
- ✅ No errors
- ✅ Tables created successfully

## Your App URL

Railway will provide a URL like: `https://your-app.railway.app`

You can find it in:
- Railway dashboard → Your service → Settings → Domains
- Or check the deployment logs

## Troubleshooting

If migrations fail:
1. Check that `DATABASE_URL` is set (Railway auto-sets this when you add PostgreSQL)
2. Check deployment logs for errors
3. Make sure the app deployed successfully before running migrations


