#!/bin/bash

# EdgeAI Demo - Pre-configured Deployment
# Project: edgedemo-ai (826984558232)

set -e

PROJECT_ID="edgedemo-ai"
PROJECT_NUMBER="826984558232"
REGION="us-central1"
SERVICE_NAME="edgeai-demo"

echo "🚀 EdgeAI Demo Deployment"
echo "========================="
echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo "Region: $REGION"
echo ""

# Set project
echo "📌 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Get OpenAI API key
read -sp "Enter your OpenAI API Key: " OPENAI_KEY
echo ""
if [ -z "$OPENAI_KEY" ]; then
    echo "❌ OpenAI API Key is required"
    exit 1
fi

# Enable APIs
echo ""
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

# Deploy
echo ""
echo "📦 Building and deploying to Cloud Run..."
echo "   This will take 3-5 minutes..."
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY="$OPENAI_KEY" \
  --set-env-vars ALLOWED_ORIGINS="https://demo.edgeadvisors.ai" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --port 8000 \
  --min-instances 0 \
  --max-instances 10

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📡 Service URL: $SERVICE_URL"
echo ""

# Setup custom domain
echo "🌐 Setting up custom domain: demo.edgeadvisors.ai"
echo "   This may take a minute..."

gcloud run domain-mappings create \
  --service $SERVICE_NAME \
  --domain demo.edgeadvisors.ai \
  --region $REGION 2>&1 || echo "⚠️  Domain mapping may already exist, checking status..."

echo ""
echo "📋 DNS Configuration Required:"
echo "   Run this command to get DNS records:"
echo ""
echo "   gcloud run domain-mappings describe --domain demo.edgeadvisors.ai --region $REGION --format 'yaml(status.resourceRecords)'"
echo ""

read -p "Would you like to view DNS records now? (y/n): " VIEW_DNS
if [ "$VIEW_DNS" = "y" ] || [ "$VIEW_DNS" = "Y" ]; then
    echo ""
    echo "DNS Records to add to your DNS provider:"
    echo "========================================"
    gcloud run domain-mappings describe \
      --domain demo.edgeadvisors.ai \
      --region $REGION \
      --format 'yaml(status.resourceRecords)'
    echo ""
    echo "Add these A records to your DNS provider for demo.edgeadvisors.ai"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. ✅ Service deployed: $SERVICE_URL"
echo "2. 🌐 Add DNS records (shown above) to your DNS provider"
echo "3. ⏳ Wait 5-10 minutes for DNS propagation"
echo "4. 🚀 Visit https://demo.edgeadvisors.ai"
echo ""
echo "Test the service now:"
echo "  curl $SERVICE_URL/health"
echo ""
echo "View logs:"
echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
echo ""


