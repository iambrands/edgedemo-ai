#!/bin/bash

# One-Time Setup for Automatic GitHub Pushing
# Run this script once to configure automatic pushes

cd /Users/iabadvisors/Projects/edgeai-demo

echo "🔐 Setting up Automatic GitHub Push"
echo "===================================="
echo ""

# Check if token is already in remote URL
CURRENT_URL=$(git remote get-url origin)
if [[ $CURRENT_URL == *"ghp_"* ]] || [[ $CURRENT_URL == *"github_pat_"* ]]; then
    echo "✅ Token already configured in remote URL!"
    echo "Testing push..."
    git push origin main
    exit 0
fi

echo "Choose authentication method:"
echo ""
echo "1) Personal Access Token (Recommended - easiest)"
echo "2) SSH Key (Already have key, just need to add to GitHub)"
echo ""
read -p "Enter choice (1 or 2): " METHOD

case $METHOD in
    1)
        echo ""
        echo "📋 Create a Personal Access Token:"
        echo "   1. Go to: https://github.com/settings/tokens/new"
        echo "   2. Name: 'EdgeAI Auto Push'"
        echo "   3. Select scope: 'repo' (all repo permissions)"
        echo "   4. Click 'Generate token'"
        echo "   5. COPY THE TOKEN (starts with ghp_)"
        echo ""
        read -sp "Paste your token here: " TOKEN
        echo ""
        echo ""
        
        if [ -z "$TOKEN" ]; then
            echo "❌ Token is required"
            exit 1
        fi
        
        # Update remote URL with token
        git remote set-url origin https://${TOKEN}@github.com/iambrands/edgedemo-ai.git
        
        echo "✅ Token configured!"
        echo ""
        echo "🧪 Testing push..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ SUCCESS! Automatic push is now configured!"
            echo "All future pushes will work automatically."
        else
            echo ""
            echo "❌ Push failed. Please check:"
            echo "   - Token has 'repo' scope"
            echo "   - Token is valid"
            echo "   - Repository exists and you have access"
        fi
        ;;
        
    2)
        echo ""
        echo "🔑 SSH Setup:"
        echo ""
        echo "Your SSH public key:"
        cat ~/.ssh/id_ed25519.pub
        echo ""
        echo ""
        echo "Steps:"
        echo "1. Copy the key above"
        echo "2. Go to: https://github.com/settings/keys"
        echo "3. Click 'New SSH key'"
        echo "4. Paste the key"
        echo "5. Click 'Add SSH key'"
        echo ""
        read -p "Press enter after adding the key to GitHub..."
        
        # Switch to SSH
        git remote set-url origin git@github.com:iambrands/edgedemo-ai.git
        
        echo ""
        echo "🧪 Testing SSH connection..."
        ssh -T git@github.com 2>&1 | grep -q "successfully authenticated" && SSH_OK=true || SSH_OK=false
        
        if [ "$SSH_OK" = true ]; then
            echo "✅ SSH configured!"
            echo ""
            echo "🧪 Testing push..."
            git push origin main
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ SUCCESS! Automatic push is now configured!"
            fi
        else
            echo ""
            echo "⚠️  SSH connection failed."
            echo "Please make sure you:"
            echo "1. Added the SSH key to GitHub"
            echo "2. The key is correct"
            echo ""
            echo "Or try Method 1 (Personal Access Token) instead."
        fi
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac


