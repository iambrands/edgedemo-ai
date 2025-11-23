# Deploy EdgeAI to demo.edgeadvisors.ai

## Recommended Architecture

**Frontend on Vercel + Backend on GCP Cloud Run**

This gives you:
- ✅ Fast global CDN for frontend (Vercel)
- ✅ Powerful backend with no timeout limits (GCP Cloud Run)
- ✅ Automatic SSL certificates
- ✅ Easy custom domain setup

---

## Step 1: Deploy Backend to GCP Cloud Run

### Quick Deploy

```bash
# Install Google Cloud SDK (if not installed)
# macOS: brew install google-cloud-sdk

# Login and set project
gcloud auth login
export PROJECT_ID=your-gcp-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com

# Build and deploy
gcloud run deploy edgeai-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your_openai_key \
  --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai,https://edgeai-demo.vercel.app \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --port 8000
```

**Copy the service URL** (e.g., `https://edgeai-backend-xxxxx-uc.a.run.app`)

### Map Custom Domain (Optional - for backend subdomain)

```bash
# If you want api.demo.edgeadvisors.ai for backend
gcloud run domain-mappings create \
  --service edgeai-backend \
  --domain api.demo.edgeadvisors.ai \
  --region us-central1
```

Then add the DNS record as shown by the command.

---

## Step 2: Update Frontend for Production

We need to update the frontend to use the GCP backend URL.

### Create `frontend/config.js`:

```javascript
// Production configuration
window.EDGEAI_CONFIG = {
  // Use your GCP Cloud Run URL here
  API_BASE_URL: 'https://edgeai-backend-xxxxx-uc.a.run.app',
  
  // Or use custom domain if you set one up
  // API_BASE_URL: 'https://api.demo.edgeadvisors.ai'
};
```

### Update `frontend/index.html`:

Find this line (around line 713):
```javascript
const API_BASE_URL = window.location.origin;
```

Replace with:
```javascript
// Use config if available, otherwise detect environment
const API_BASE_URL = window.EDGEAI_CONFIG?.API_BASE_URL || 
  (window.location.hostname === 'demo.edgeadvisors.ai' 
    ? 'https://edgeai-backend-xxxxx-uc.a.run.app'  // Your GCP URL
    : window.location.origin);  // Local development
```

**Or** add this before the React code:
```html
<script src="/config.js"></script>
<script>
  const API_BASE_URL = window.EDGEAI_CONFIG?.API_BASE_URL || 
    (window.location.hostname.includes('vercel.app') 
      ? 'https://edgeai-backend-xxxxx-uc.a.run.app'
      : window.location.origin);
</script>
```

---

## Step 3: Deploy Frontend to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time - will prompt for setup)
vercel

# Deploy to production
vercel --prod
```

### Option B: Using GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** (leave empty - static files)
   - **Output Directory:** `frontend`

### Add Environment Variables in Vercel

1. Go to Project Settings → Environment Variables
2. Add (optional, if using config.js):
   - `NEXT_PUBLIC_API_URL` = `https://edgeai-backend-xxxxx-uc.a.run.app`

---

## Step 4: Configure Custom Domain

### In Vercel Dashboard:

1. Go to your project → Settings → Domains
2. Add `demo.edgeadvisors.ai`
3. Follow DNS instructions:
   - Add CNAME record: `demo` → `cname.vercel-dns.com`
   - Or add A records as shown

### In Your DNS Provider:

**If using CNAME:**
```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com
TTL: 3600
```

**If using A records:**
```
Type: A
Name: demo
Value: [IP addresses shown in Vercel]
TTL: 3600
```

**Wait 5-10 minutes** for DNS propagation, then your site will be live at `https://demo.edgeadvisors.ai`!

---

## Step 5: Update CORS Settings

After getting your Vercel URL, update the backend CORS:

```bash
# Update ALLOWED_ORIGINS
gcloud run services update edgeai-backend \
  --update-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai,https://your-project.vercel.app \
  --region us-central1
```

---

## Alternative: Deploy Everything to GCP Cloud Run

If you prefer everything in one place:

### Deploy Full Stack:

```bash
gcloud run deploy edgeai-demo \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your_openai_key \
  --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
  --memory 1Gi \
  --timeout 300
```

### Map Domain:

```bash
gcloud run domain-mappings create \
  --service edgeai-demo \
  --domain demo.edgeadvisors.ai \
  --region us-central1
```

Then add DNS A record as shown.

**Advantages:**
- ✅ Single deployment
- ✅ No CORS issues
- ✅ Simpler setup

**Disadvantages:**
- ❌ No global CDN (slower for international users)
- ❌ More expensive at scale

---

## Testing After Deployment

1. **Test Frontend:**
   ```bash
   curl https://demo.edgeadvisors.ai
   ```

2. **Test Backend Health:**
   ```bash
   curl https://edgeai-backend-xxxxx-uc.a.run.app/health
   ```

3. **Test API from Frontend:**
   - Open https://demo.edgeadvisors.ai
   - Fill out form and analyze
   - Check browser console for any CORS errors

---

## Environment Variables Summary

### Vercel (Frontend):
- `NEXT_PUBLIC_API_URL` (optional - if using env-based config)

### GCP Cloud Run (Backend):
- `OPENAI_API_KEY` (required)
- `ALLOWED_ORIGINS` (required - comma-separated)
- `PORT` (optional - defaults to 8000)

---

## Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

PROJECT_ID="your-gcp-project-id"
BACKEND_URL="https://edgeai-backend-xxxxx-uc.a.run.app"

echo "🚀 Deploying EdgeAI Demo..."

# Deploy backend
echo "📦 Deploying backend to GCP Cloud Run..."
gcloud run deploy edgeai-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY="${OPENAI_API_KEY}" \
  --set-env-vars ALLOWED_ORIGINS="https://demo.edgeadvisors.ai" \
  --memory 1Gi \
  --timeout 300 \
  --quiet

# Update frontend config with backend URL
echo "⚙️  Updating frontend configuration..."
# (You'd update config.js or index.html here)

# Deploy frontend
echo "🌐 Deploying frontend to Vercel..."
vercel --prod --yes

echo "✅ Deployment complete!"
echo "Frontend: https://demo.edgeadvisors.ai"
echo "Backend: $BACKEND_URL"
```

Make executable:
```bash
chmod +x deploy.sh
```

---

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your Vercel URL
- Check browser console for exact error
- Verify backend is accessible

### 404 on Frontend
- Check Vercel routing in `vercel.json`
- Ensure `frontend/index.html` exists

### Backend Timeout
- Increase timeout: `--timeout 600` (10 minutes max)
- Check logs: `gcloud run services logs read edgeai-backend`

### Domain Not Working
- Wait 10-15 minutes for DNS propagation
- Check DNS with: `dig demo.edgeadvisors.ai`
- Verify SSL certificate in Vercel dashboard

---

## Cost Estimates

### Vercel:
- **Hobby (Free):** 100 GB bandwidth/month
- **Pro ($20/mo):** Unlimited bandwidth, better performance

### GCP Cloud Run:
- **Low traffic (1000 analyses/month):** $5-10/month
- **Medium traffic (10K analyses/month):** $20-40/month
- **High traffic (100K analyses/month):** $100-200/month

**Total: ~$25-60/month** for moderate traffic

---

## Next Steps

1. ✅ Backend deployed to GCP Cloud Run
2. ✅ Frontend deployed to Vercel
3. ✅ Custom domain configured
4. ✅ CORS updated
5. ✅ Testing complete
6. ✅ Monitor logs and errors
7. ✅ Set up alerts for downtime

---

*For detailed GCP or Vercel guides, see `GCP_DEPLOY.md` or `VERCEL_DEPLOY.md`*

