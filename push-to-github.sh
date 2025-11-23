#!/bin/bash

# Script to push EdgeAI demo to GitHub
# Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME"
    echo "Example: ./push-to-github.sh johndoe"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="edgeai-demo"
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo "🚀 Deploying to GitHub..."
echo "Repository: ${REPO_URL}"
echo ""

# Check if remote already exists
if git remote | grep -q "^origin$"; then
    echo "⚠️  Remote 'origin' already exists. Updating..."
    git remote set-url origin ${REPO_URL}
else
    echo "➕ Adding remote origin..."
    git remote add origin ${REPO_URL}
fi

echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View your repo at: ${REPO_URL}"
    echo ""
    echo "Next step: Deploy to Railway at https://railway.app/"
else
    echo ""
    echo "❌ Failed to push. Make sure:"
    echo "   1. Repository exists at ${REPO_URL}"
    echo "   2. You have push access"
    echo "   3. You're authenticated with GitHub"
    echo ""
    echo "Create the repository first at: https://github.com/new"
fi


