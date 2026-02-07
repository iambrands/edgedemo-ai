#!/bin/bash
# Heroku Deployment Script for IAB OptionsBot
# Run this after completing: heroku login

set -e  # Exit on error

APP_NAME="iab-optionsbot"
SECRET_KEY="9noOV3KbgRhr6ihr6mIKhRfAEmhvg_NRo08vKTZB-YI"
JWT_SECRET_KEY="oVEzPr6iqfKzGd-h9UDk_twQUtnqm4mB8aX5SK-m4as"

echo "🚀 Starting Heroku deployment for $APP_NAME..."
echo ""

# Step 1: Add PostgreSQL
echo "📦 Adding PostgreSQL database..."
heroku addons:create heroku-postgresql:essential-0 --app $APP_NAME

# Step 2: Set Environment Variables
echo ""
echo "⚙️  Setting environment variables..."

# Flask Configuration
heroku config:set FLASK_ENV=production --app $APP_NAME

# Secret Keys
heroku config:set SECRET_KEY="$SECRET_KEY" --app $APP_NAME
heroku config:set JWT_SECRET_KEY="$JWT_SECRET_KEY" --app $APP_NAME

# Application Settings
heroku config:set USE_MOCK_DATA=false --app $APP_NAME
heroku config:set USE_YAHOO_DATA=true --app $APP_NAME
heroku config:set USE_POLYGON_DATA=false --app $APP_NAME
heroku config:set DISABLE_AUTH=false --app $APP_NAME

# CORS Configuration
heroku config:set CORS_ORIGINS="https://$APP_NAME.herokuapp.com,https://www.$APP_NAME.herokuapp.com" --app $APP_NAME

# OpenAI Configuration
heroku config:set OPENAI_API_KEY="your-openai-api-key-here" --app $APP_NAME
heroku config:set USE_OPENAI_ALERTS=true --app $APP_NAME

# Tradier Configuration
heroku config:set TRADIER_API_KEY="your-tradier-api-key-here" --app $APP_NAME
heroku config:set TRADIER_ACCOUNT_ID="your-tradier-account-id-here" --app $APP_NAME
heroku config:set TRADIER_BASE_URL="https://sandbox.tradier.com/v1" --app $APP_NAME
heroku config:set TRADIER_SANDBOX=true --app $APP_NAME

echo ""
echo "✅ Environment variables set!"

# Step 3: Verify config
echo ""
echo "📋 Current configuration:"
heroku config --app $APP_NAME | grep -E "FLASK_ENV|USE_MOCK|USE_YAHOO|DISABLE_AUTH|CORS_ORIGINS"

# Step 4: Push to Heroku
echo ""
echo "📤 Pushing to Heroku..."
git push heroku main || git push heroku master

# Step 5: Run Database Migrations
echo ""
echo "🗃️  Running database migrations..."
heroku run flask db upgrade --app $APP_NAME

# Step 6: Verify Deployment
echo ""
echo "✅ Verifying deployment..."
heroku ps --app $APP_NAME
echo ""
echo "🌐 Your app URL: https://$APP_NAME.herokuapp.com"
echo ""
echo "📊 View logs: heroku logs --tail --app $APP_NAME"
echo "🔍 Test health: curl https://$APP_NAME.herokuapp.com/health"
echo ""
echo "🎉 Deployment complete!"

