# Deploy EdgeAI to Google Cloud Platform (GCP)

## Recommended: Cloud Run (Containerized Deployment)

Cloud Run is perfect for our Docker setup - serverless containers with automatic scaling.

### Prerequisites

```bash
# Install Google Cloud SDK
# macOS:
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install

# Initialize and login
gcloud init
gcloud auth login
```

---

## Method 1: Deploy to Cloud Run (Recommended)

### Step 1: Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id
gcloud config set project $PROJECT_ID

# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com
```

### Step 2: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/edgeai-demo:latest .

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker

# Push image to Google Container Registry
docker push gcr.io/$PROJECT_ID/edgeai-demo:latest
```

### Step 3: Deploy to Cloud Run

```bash
# Deploy with environment variables
gcloud run deploy edgeai-demo \
  --image gcr.io/$PROJECT_ID/edgeai-demo:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your_openai_key \
  --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai,https://vercel-deployment-url.vercel.app \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

**Important Flags:**
- `--allow-unauthenticated`: Makes it publicly accessible
- `--memory 1Gi`: Sufficient for OpenAI API calls
- `--timeout 300`: 5 minutes max (longer than Vercel's 60s)
- `--max-instances 10`: Limits costs during scaling

### Step 4: Get Your Service URL

After deployment, you'll get a URL like:
```
https://edgeai-demo-xxxxx-uc.a.run.app
```

### Step 5: Configure Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service edgeai-demo \
  --domain demo.edgeadvisors.ai \
  --region us-central1
```

**Then add DNS records:**
- Get mapping details: `gcloud run domain-mappings describe --domain demo.edgeadvisors.ai`
- Add the provided A record to your DNS provider

---

## Method 2: Cloud Build (Automated CI/CD)

Create `.cloudbuild.yaml` in project root:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/edgeai-demo:$SHORT_SHA', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/edgeai-demo:$SHORT_SHA']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'edgeai-demo'
      - '--image'
      - 'gcr.io/$PROJECT_ID/edgeai-demo:$SHORT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/edgeai-demo:$SHORT_SHA'
```

Set up trigger:
```bash
gcloud builds triggers create github \
  --repo-name=your-repo \
  --repo-owner=your-username \
  --branch-pattern="^main$" \
  --build-config=.cloudbuild.yaml
```

---

## Method 3: App Engine (Alternative)

If you prefer App Engine:

### Create `app.yaml`:

```yaml
runtime: python311

service: edgeai-demo

env_variables:
  OPENAI_API_KEY: your_openai_key
  ALLOWED_ORIGINS: https://demo.edgeadvisors.ai

handlers:
  - url: /.*
    script: auto

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10
```

### Deploy:

```bash
gcloud app deploy
```

---

## Environment Variables Setup

### Option 1: Via gcloud CLI (as shown above)

### Option 2: Via Cloud Console
1. Go to Cloud Run → edgeai-demo → Edit & Deploy New Revision
2. Go to "Variables & Secrets" tab
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGINS`

### Option 3: Secret Manager (Recommended for Production)

```bash
# Create secret
echo -n "your_openai_key" | gcloud secrets create openai-api-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret reference
gcloud run deploy edgeai-demo \
  --update-secrets OPENAI_API_KEY=openai-api-key:latest \
  # ... other flags ...
```

---

## Update Frontend to Use GCP Backend

If deploying frontend separately (e.g., Vercel), update API URL:

**Option 1: Environment-based configuration**

In `frontend/index.html`, update the API base URL:

```javascript
// Replace this line:
const API_BASE_URL = window.location.origin;

// With:
const API_BASE_URL = process.env.API_BASE_URL || 
  (window.location.hostname === 'demo.edgeadvisors.ai' 
    ? 'https://demo.edgeadvisors.ai' 
    : 'http://localhost:8000');
```

**Option 2: Create `config.js`:**

```javascript
// config.js
window.EDGEAI_CONFIG = {
  API_BASE_URL: 'https://edgeai-demo-xxxxx-uc.a.run.app'
  // Or use your custom domain: 'https://demo.edgeadvisors.ai'
};
```

Then in `index.html`:
```html
<script src="/config.js"></script>
<script>
  const API_BASE_URL = window.EDGEAI_CONFIG?.API_BASE_URL || window.location.origin;
</script>
```

---

## Monitoring & Logging

### View Logs:
```bash
gcloud run services logs read edgeai-demo --limit 50
```

### Set up Monitoring:
1. Go to Cloud Console → Cloud Run → edgeai-demo
2. Click "Logs" tab for real-time logs
3. Set up alerts in "Monitoring" tab

---

## Cost Estimates

**Cloud Run Pricing:**
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: First 2 million free, then $0.40 per million
- **No charge when idle** (serverless)

**Estimated Monthly Cost (Low Traffic):**
- ~1000 analyses/month: **$5-10/month**
- ~10,000 analyses/month: **$20-40/month**
- ~100,000 analyses/month: **$100-200/month**

Much cheaper than maintaining a VPS!

---

## Troubleshooting

### Issue: "Permission denied"
```bash
gcloud auth login
gcloud auth application-default login
```

### Issue: "Image not found"
```bash
# Rebuild and push
docker build -t gcr.io/$PROJECT_ID/edgeai-demo:latest .
docker push gcr.io/$PROJECT_ID/edgeai-demo:latest
```

### Issue: CORS errors
- Ensure `ALLOWED_ORIGINS` includes your frontend domain
- Check Cloud Run service URL matches frontend config

### Issue: Timeout errors
- Increase timeout: `--timeout 300` (or higher)
- Cloud Run max is 3600 seconds (1 hour)

---

## Quick Deploy Script

Create `deploy-gcp.sh`:

```bash
#!/bin/bash

PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
SERVICE_NAME="edgeai-demo"

echo "Building Docker image..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

echo "Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY="${OPENAI_API_KEY}" \
  --set-env-vars ALLOWED_ORIGINS="https://demo.edgeadvisors.ai" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300

echo "Deployment complete!"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
```

Make it executable:
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

---

## Next Steps

1. ✅ Deploy backend to Cloud Run
2. ✅ Get service URL
3. ✅ Update frontend API URL
4. ✅ Deploy frontend to Vercel (see `VERCEL_DEPLOY.md`)
5. ✅ Configure custom domain `demo.edgeadvisors.ai`
6. ✅ Test end-to-end
7. ✅ Set up monitoring and alerts

---

*For Vercel deployment, see `VERCEL_DEPLOY.md`*


