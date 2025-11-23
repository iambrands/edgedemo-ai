# Deployment Guide: GitHub + Railway

## Step 1: Push to GitHub

### 1.1 Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `edgeai-demo` (or your preferred name)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

### 1.2 Push Your Code

Run these commands in your terminal:

```bash
cd /Users/iabadvisors/Projects/edgeai-demo

# Rename branch to main (GitHub standard)
git branch -M main

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: EdgeAI Portfolio Analyzer with OpenAI integration"

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/edgeai-demo.git

# Push to GitHub
git push -u origin main
```

**Note**: Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 2: Deploy to Railway

### 2.1 Create Railway Account

1. Go to https://railway.app/
2. Sign up/login with your GitHub account (recommended for easier integration)
3. Complete the setup

### 2.2 Deploy from GitHub

#### Option A: Deploy via Railway Dashboard (Recommended)

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account if not already connected
4. Select the `edgeai-demo` repository
5. Railway will automatically detect it's a Python app and start building

#### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project or create new
railway link

# Deploy
railway up
```

### 2.3 Configure Environment Variables

In Railway dashboard:

1. Click on your deployed service
2. Go to **"Variables"** tab
3. Add the following environment variables:

```
OPENAI_API_KEY=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
ALLOWED_ORIGINS=https://demo.edgeadvisors.ai,https://www.edgeadvisors.ai
PORT=8000
```

**Important**: 
- Railway will set `PORT` automatically, but you can keep it as a fallback
- Replace `ALLOWED_ORIGINS` with your actual domain(s)
- Never commit your API keys to GitHub!

### 2.4 Get Your Deployment URL

1. In Railway dashboard, go to your service
2. Click on **"Settings"** → **"Networking"**
3. Generate a domain or use the provided `.railway.app` domain
4. Update `ALLOWED_ORIGINS` variable with your Railway domain

Example Railway domain: `https://edgeai-demo-production.up.railway.app`

### 2.5 Custom Domain (Optional)

If you want to use `demo.edgeadvisors.ai`:

1. In Railway dashboard → **Settings** → **Networking**
2. Click **"Generate Domain"** or **"Custom Domain"**
3. Add your custom domain: `demo.edgeadvisors.ai`
4. Follow Railway's DNS configuration instructions:
   - Add a CNAME record pointing to your Railway domain
5. Update `ALLOWED_ORIGINS` to include your custom domain

## Step 3: Verify Deployment

1. Visit your Railway deployment URL
2. Test the portfolio analyzer:
   - Enter client information
   - Add portfolio holdings
   - Click "Analyze Portfolio"
   - Verify the analysis loads correctly

## Troubleshooting

### Build Fails

- Check Railway build logs for errors
- Ensure `requirements.txt` is correct
- Verify Python version compatibility (3.11+)

### API Errors

- Verify `OPENAI_API_KEY` is set correctly in Railway
- Check Railway logs: `railway logs` or via dashboard
- Ensure API key has sufficient credits/quota

### CORS Errors

- Update `ALLOWED_ORIGINS` in Railway variables
- Include both your Railway domain and custom domain
- Restart the service after changing variables

### Port Issues

- Railway automatically sets `PORT` - don't hardcode it
- Our code reads from `PORT` environment variable
- Defaults to 8000 if not set

## Railway Commands (CLI)

```bash
# View logs
railway logs

# Open project in browser
railway open

# View variables
railway variables

# Set a variable
railway variables set OPENAI_API_KEY=your_key

# Restart service
railway restart
```

## Continuous Deployment

Railway automatically deploys when you push to your main branch on GitHub!

Just push changes:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway will automatically rebuild and redeploy.

