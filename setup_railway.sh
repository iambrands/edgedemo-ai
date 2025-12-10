#!/bin/bash
# Railway Setup Script
# Run this after: railway login

set -e

echo "🚂 Setting up Railway deployment..."

# Check if logged in
if ! railway whoami &>/dev/null; then
    echo "❌ Not logged in. Please run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"

# Link to existing project or create new
if [ -f ".railway/project.json" ]; then
    echo "📎 Project already linked"
else
    echo "🔗 Linking to Railway project..."
    railway link
fi

# Add PostgreSQL database
echo "🗄️  Adding PostgreSQL database..."
railway add --database postgres

# Set environment variables
echo "🔧 Setting environment variables..."

railway variables set FLASK_ENV=production
railway variables set SECRET_KEY=VDlaFyRDIdHtgICYc33CRLWXNNauL6xRohYO11BN664
railway variables set JWT_SECRET_KEY=XNQQZ9hSt8w86EpzI4AmJudbLpPWh5HJzUMfUAPDPCo
railway variables set TRADIER_API_KEY=V89b68MNEX6tHXCytKysZa2kyfRr
railway variables set TRADIER_ACCOUNT_ID=VA60605861
railway variables set TRADIER_BASE_URL=https://sandbox.tradier.com/v1
railway variables set TRADIER_SANDBOX=true
railway variables set USE_MOCK_DATA=false
railway variables set OPENAI_API_KEY=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
railway variables set USE_OPENAI_ALERTS=true

echo "✅ Environment variables set"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
railway run flask db upgrade

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Your app should be live at:"
railway domain
echo ""
echo "📝 To view logs: railway logs"
echo "📊 To check status: railway status"


