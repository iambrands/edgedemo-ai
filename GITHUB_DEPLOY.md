# Quick Deployment Steps

## ✅ Your code is ready! Follow these steps:

### Step 1: Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `edgeai-demo` (or your preferred name)
3. **DO NOT** check "Initialize with README"
4. Click "Create repository"

### Step 2: Push to GitHub

Run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd /Users/iabadvisors/Projects/edgeai-demo

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/edgeai-demo.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy to Railway

1. Go to: https://railway.app/
2. Sign up/login with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your `edgeai-demo` repository
5. Railway will auto-detect and start building

### Step 4: Set Environment Variables in Railway

1. In Railway dashboard, click your service
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add:

```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Add another variable:

```
ALLOWED_ORIGINS=https://your-app-name.up.railway.app,https://demo.edgeadvisors.ai
```

(Replace with your actual Railway domain)

### Step 5: Get Your URL

1. In Railway → **Settings** → **Networking**
2. Your app will be available at: `https://your-app-name.up.railway.app`
3. Click the URL to test!

**That's it!** Your app is live! 🚀

---

## Custom Domain (Optional)

To use `demo.edgeadvisors.ai`:

1. In Railway → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter: `demo.edgeadvisors.ai`
4. Add DNS CNAME record pointing to your Railway domain
5. Update `ALLOWED_ORIGINS` variable

---

## Troubleshooting

- **Build fails?** Check Railway logs for errors
- **API not working?** Verify `OPENAI_API_KEY` is set correctly
- **CORS errors?** Update `ALLOWED_ORIGINS` with your domain

For detailed instructions, see `DEPLOYMENT.md`


