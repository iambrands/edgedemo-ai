#!/bin/bash
# Quick deployment script for Edge demo

echo "🚀 Edge Demo Deployment"
echo "========================="
echo ""
echo "Choose deployment option:"
echo "1) Backend to GCP Cloud Run only"
echo "2) Frontend to Vercel only"
echo "3) Both (recommended)"
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo "📦 Deploying backend to GCP..."
    read -p "Enter GCP Project ID: " PROJECT_ID
    read -p "Enter OpenAI API Key: " OPENAI_KEY
    gcloud config set project $PROJECT_ID
    gcloud run deploy edgeai-backend \
      --source . \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars OPENAI_API_KEY=$OPENAI_KEY \
      --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
      --memory 1Gi \
      --timeout 300
    ;;
  2)
    echo "🌐 Deploying frontend to Vercel..."
    vercel --prod
    ;;
  3)
    echo "📦 Deploying backend..."
    read -p "Enter GCP Project ID: " PROJECT_ID
    read -p "Enter OpenAI API Key: " OPENAI_KEY
    gcloud config set project $PROJECT_ID
    BACKEND_URL=$(gcloud run deploy edgeai-backend \
      --source . \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars OPENAI_API_KEY=$OPENAI_KEY \
      --set-env-vars ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
      --memory 1Gi \
      --timeout 300 \
      --format 'value(status.url)')
    
    echo "🌐 Deploying frontend..."
    echo "Backend URL: $BACKEND_URL"
    echo "Update frontend/config.js with this URL before deploying!"
    read -p "Press enter to continue with Vercel deployment..."
    vercel --prod
    ;;
esac

echo "✅ Deployment complete!"
