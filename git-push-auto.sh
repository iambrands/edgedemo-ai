#!/bin/bash

# Automatic Git Push Script
# Reads token from .git-push-token file or GITHUB_TOKEN env var

cd /Users/iabadvisors/Projects/edgeai-demo

# Try to get token from file or environment
if [ -f .git-push-token ]; then
    TOKEN=$(grep -v "^#" .git-push-token | grep -v "^$" | head -1 | tr -d '[:space:]')
    if [ "$TOKEN" != "YOUR_TOKEN_HERE" ] && [ ! -z "$TOKEN" ]; then
        GITHUB_TOKEN="$TOKEN"
    fi
fi

# Use environment variable if set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GitHub token not found!"
    echo ""
    echo "Set up token:"
    echo "1. Create token: https://github.com/settings/tokens/new"
    echo "2. Select 'repo' scope"
    echo "3. Copy token"
    echo "4. Set environment variable:"
    echo "   export GITHUB_TOKEN=your_token_here"
    echo ""
    echo "Or edit .git-push-token file with your token"
    exit 1
fi

# Configure remote with token
git remote set-url origin https://${GITHUB_TOKEN}@github.com/iambrands/edgedemo-ai.git

echo "🚀 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 https://github.com/iambrands/edgedemo-ai"
else
    echo "❌ Push failed. Check token permissions."
    exit 1
fi


