# Quick Deploy Guide - GCP Cloud Run

## Option A: Automated Script (Easiest)

Just run:
```bash
./deploy-gcp.sh
```

The script will:
1. ✅ Ask for your GCP Project ID
2. ✅ Ask for your OpenAI API Key
3. ✅ Enable required APIs
4. ✅ Build and deploy to Cloud Run
5. ✅ Set up custom domain (optional)
6. ✅ Show you the DNS records needed

---

## Option B: Manual Commands

### 1. Login and Set Project

```bash
gcloud auth login
export PROJECT_ID=your-gcp-project-id
gcloud config set project $PROJECT_ID
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
  --set-env-vars OPENAI_API_KEY=your_openai_key \
  --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --port 8000
```

### 4. Get Your URL

```bash
gcloud run services describe edgeai-demo \
  --region us-central1 \
  --format 'value(status.url)'
```

### 5. Set Up Custom Domain

```bash
gcloud run domain-mappings create \
  --service edgeai-demo \
  --domain demo.edgeadvisors.ai \
  --region us-central1

# Get DNS records
gcloud run domain-mappings describe \
  --domain demo.edgeadvisors.ai \
  --region us-central1 \
  --format "yaml(status.resourceRecords)"
```

Then add the A record(s) to your DNS provider.

---

## That's It! 🎉

Your demo will be live at:
- Cloud Run URL: `https://edgeai-demo-xxxxx-uc.a.run.app`
- Custom domain (after DNS): `https://demo.edgeadvisors.ai`

---

## Need Help?

- Check logs: `gcloud run services logs read edgeai-demo --region us-central1`
- Update env vars: `gcloud run services update edgeai-demo --update-env-vars KEY=value --region us-central1`
- View service: `gcloud run services describe edgeai-demo --region us-central1`
