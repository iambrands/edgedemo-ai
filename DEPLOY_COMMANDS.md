# Quick Deploy Commands for edgedemo-ai

## Your Project Info
- **Project ID:** `edgedemo-ai`
- **Project Number:** `826984558232`
- **Service Name:** `edgeai-demo`

---

## Option 1: Use Pre-configured Script (Easiest)

```bash
./deploy-now.sh
```

This script has everything pre-configured. It will just ask for your OpenAI API key.

---

## Option 2: One-Line Deploy

Replace `YOUR_OPENAI_KEY` with your actual key:

```bash
gcloud config set project edgedemo-ai && \
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com --quiet && \
gcloud run deploy edgeai-demo \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=YOUR_OPENAI_KEY \
  --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
  --memory 1Gi \
  --timeout 300
```

---

## Option 3: Step-by-Step

### 1. Set Project
```bash
gcloud config set project edgedemo-ai
```

### 2. Enable APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Deploy
```bash
gcloud run deploy edgeai-demo \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your_openai_key_here \
  --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --port 8000
```

### 4. Setup Custom Domain
```bash
gcloud run domain-mappings create \
  --service edgeai-demo \
  --domain demo.edgeadvisors.ai \
  --region us-central1
```

### 5. Get DNS Records
```bash
gcloud run domain-mappings describe \
  --domain demo.edgeadvisors.ai \
  --region us-central1 \
  --format 'yaml(status.resourceRecords)'
```

Add the A records shown to your DNS provider.

---

## After Deployment

**Get your service URL:**
```bash
gcloud run services describe edgeai-demo \
  --region us-central1 \
  --format 'value(status.url)'
```

**Test it:**
```bash
curl $(gcloud run services describe edgeai-demo --region us-central1 --format 'value(status.url)')/health
```

**View logs:**
```bash
gcloud run services logs read edgeai-demo --region us-central1 --limit 50
```

---

## Update Environment Variables Later

```bash
gcloud run services update edgeai-demo \
  --update-env-vars OPENAI_API_KEY=new_key \
  --region us-central1
```

---

**Ready? Just run `./deploy-now.sh` when you're ready!** 🚀


