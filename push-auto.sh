#!/bin/bash

# Automatic Push Script
# After initial setup, this will push without prompting

cd /Users/iabadvisors/Projects/edgeai-demo

echo "🔄 Auto-pushing to GitHub..."
echo ""

# Check if there are changes to commit
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Committing now..."
    git add -A
    git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push to GitHub
echo "📤 Pushing to origin/main..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Repository: https://github.com/iambrands/edgedemo-ai"
else
    echo ""
    echo "❌ Push failed. Check authentication or run setup first."
    echo "See: AUTO_PUSH_SETUP.md"
    exit 1
fi


