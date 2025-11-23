#!/bin/bash

# Script to push to GitHub with authentication
# Usage: ./push.sh

echo "🚀 Pushing to GitHub..."
echo "Repository: https://github.com/iambrands/edgedemo-ai"
echo ""

# Method 1: Try with stored credentials
git push -u origin main 2>&1

# If that fails, show instructions
if [ $? -ne 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Authentication required. Use one of these methods:"
    echo ""
    echo "METHOD 1: Personal Access Token (Recommended)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Create a token at: https://github.com/settings/tokens/new"
    echo "   - Select scope: 'repo' (full control)"
    echo "   - Copy the token"
    echo ""
    echo "2. Run this command with YOUR_TOKEN:"
    echo "   git push https://YOUR_TOKEN@github.com/iambrands/edgedemo-ai.git main"
    echo ""
    echo "METHOD 2: Use GitHub Desktop"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Open GitHub Desktop"
    echo "2. File → Add Local Repository"
    echo "3. Select this folder: $(pwd)"
    echo "4. Click 'Publish repository'"
    echo ""
fi


