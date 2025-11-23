# 🚀 Complete Deployment Now

## ✅ What's Already Done
1. ✅ Google Cloud SDK installed
2. ✅ Authenticated as leslie.wilson@gmail.com  
3. ✅ Project: edgedemo-ai
4. ✅ APIs enabled
5. ✅ Permissions configured

## 🎯 Choose Your Deployment Method

### **Option 1: Fix Cloud Build & Deploy (Recommended)**

The Cloud Build permission was just granted. Try deploying again:

```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH
export OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2)

gcloud run deploy edgeai-demo \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY="$OPENAI_KEY" \
  --set-env-vars ALLOWED_ORIGINS="https://demo.edgeadvisors.ai" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --port 8000
```

---

### **Option 2: Build Locally & Deploy**

1. **Start Docker Desktop** (if not running)

2. **Build & Push:**
```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH
export PROJECT_ID="edgedemo-ai"
export OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2)

# Build
docker build -t gcr.io/$PROJECT_ID/edgeai-demo:latest .

# Configure Docker auth
gcloud auth configure-docker

# Push
docker push gcr.io/$PROJECT_ID/edgeai-demo:latest

# Deploy
gcloud run deploy edgeai-demo \
  --image gcr.io/$PROJECT_ID/edgeai-demo:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY="$OPENAI_KEY" \
  --set-env-vars ALLOWED_ORIGINS="https://demo.edgeadvisors.ai" \
  --memory 1Gi \
  --timeout 300
```

---

### **Option 3: Deploy via Cloud Console**

1. Go to: https://console.cloud.google.com/run?project=edgedemo-ai
2. Click "Create Service"
3. Select "Deploy one revision from a source repository"
4. Upload your code
5. Configure environment variables
6. Deploy

---

## After Deployment

### Get Your Service URL:
```bash
gcloud run services describe edgeai-demo \
  --region us-central1 \
  --format 'value(status.url)'
```

### Setup Custom Domain:
```bash
gcloud run domain-mappings create \
  --service edgeai-demo \
  --domain demo.edgeadvisors.ai \
  --region us-central1

# Get DNS records
gcloud run domain-mappings describe \
  --domain demo.edgeadvisors.ai \
  --region us-central1 \
  --format 'yaml(status.resourceRecords)'
```

Add the A records to your DNS provider.

---

## Quick Command (Try This First!)

```bash
cd /Users/iabadvisors/Projects/edgeai-demo
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH
export OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2)

./deploy-now.sh
```

Or the one-liner:
```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH && export OPENAI_KEY=$(cd /Users/iabadvisors/Projects/edgeai-demo && grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2) && cd /Users/iabadvisors/Projects/edgeai-demo && gcloud run deploy edgeai-demo --source . --platform managed --region us-central1 --allow-unauthenticated --set-env-vars OPENAI_API_KEY="$OPENAI_KEY" --set-env-vars ALLOWED_ORIGINS="https://demo.edgeadvisors.ai" --memory 1Gi --timeout 300 --port 8000
```

---

**Everything is ready - just choose a method above!** 🎉

