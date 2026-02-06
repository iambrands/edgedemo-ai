#!/bin/bash

# EdgeAI Demo - GCP Cloud Run Deployment Script
# This deploys both frontend and backend together

set -e  # Exit on error

echo "🚀 EdgeAI Demo - GCP Cloud Run Deployment"
echo "=========================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found!"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
read -p "Enter your GCP Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

# Set project
echo "📌 Setting GCP project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Get OpenAI API key
read -sp "Enter your OpenAI API Key: " OPENAI_KEY
echo ""
if [ -z "$OPENAI_KEY" ]; then
    echo "❌ OpenAI API Key is required"
    exit 1
fi

# Choose region
echo ""
echo "Available regions:"
echo "1) us-central1 (Iowa) - Recommended"
echo "2) us-east1 (South Carolina)"
echo "3) us-west1 (Oregon)"
echo "4) europe-west1 (Belgium)"
echo "5) asia-east1 (Taiwan)"
read -p "Choose region (1-5, default 1): " REGION_CHOICE
REGION_CHOICE=${REGION_CHOICE:-1}

case $REGION_CHOICE in
    1) REGION="us-central1" ;;
    2) REGION="us-east1" ;;
    3) REGION="us-west1" ;;
    4) REGION="europe-west1" ;;
    5) REGION="asia-east1" ;;
    *) REGION="us-central1" ;;
esac

echo "📍 Selected region: $REGION"

# Enable required APIs
echo ""
echo "🔧 Enabling required GCP APIs..."
gcloud services enable run.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

# Service name
SERVICE_NAME="edgeai-demo"

echo ""
echo "📦 Building and deploying to Cloud Run..."
echo "   This may take 3-5 minutes..."

# Deploy to Cloud Run
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

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📡 Service URL: $SERVICE_URL"
echo ""

# Ask about custom domain
read -p "Do you want to set up custom domain demo.edgeadvisors.ai? (y/n): " SETUP_DOMAIN
if [ "$SETUP_DOMAIN" = "y" ] || [ "$SETUP_DOMAIN" = "Y" ]; then
    echo ""
    echo "🌐 Setting up custom domain mapping..."
    gcloud run domain-mappings create \
      --service $SERVICE_NAME \
      --domain demo.edgeadvisors.ai \
      --region $REGION || echo "⚠️  Domain mapping may already exist or there was an issue"
    
    echo ""
    echo "📋 DNS Configuration Required:"
    echo "   Wait for domain mapping to provision (30-60 seconds), then run:"
    echo "   gcloud run domain-mappings describe --domain demo.edgeadvisors.ai --region $REGION"
    echo ""
    echo "   Add the DNS A record shown to your DNS provider for demo.edgeadvisors.ai"
    echo ""
    
    read -p "Press enter to check domain mapping status..."
    gcloud run domain-mappings describe \
      --domain demo.edgeadvisors.ai \
      --region $REGION \
      --format "yaml(spec.routeName,status.conditions,status.resourceRecords)"
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Test your service: $SERVICE_URL"
echo "2. If you set up custom domain, add DNS records as shown above"
echo "3. Wait 5-10 minutes for DNS propagation"
echo "4. Visit https://demo.edgeadvisors.ai (after DNS is set up)"
echo ""
echo "To view logs:"
echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50"
echo ""
echo "To update environment variables:"
echo "  gcloud run services update $SERVICE_NAME --update-env-vars KEY=value --region $REGION"
echo ""


