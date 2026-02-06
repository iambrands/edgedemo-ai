#!/bin/bash

# Setup Git Authentication for Automatic Pushing
# This script sets up either SSH or Personal Access Token authentication

echo "🔐 Setting up Git Authentication for Automatic Pushing"
echo "====================================================="
echo ""

# Check current remote
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)
echo "Current remote: $CURRENT_REMOTE"
echo ""

echo "Choose authentication method:"
echo "1) SSH Keys (recommended, more secure)"
echo "2) Personal Access Token (easier setup)"
echo ""
read -p "Enter choice (1 or 2): " AUTH_CHOICE

case $AUTH_CHOICE in
    1)
        echo ""
        echo "🔑 Setting up SSH authentication..."
        
        # Check if SSH key exists
        if [ ! -f ~/.ssh/id_ed25519.pub ] && [ ! -f ~/.ssh/id_rsa.pub ]; then
            echo "No SSH key found. Generating new SSH key..."
            read -p "Enter your GitHub email: " GITHUB_EMAIL
            ssh-keygen -t ed25519 -C "$GITHUB_EMAIL" -f ~/.ssh/id_ed25519 -N ""
            
            echo ""
            echo "✅ SSH key generated!"
            echo ""
            echo "📋 Add this public key to GitHub:"
            echo "-----------------------------------"
            cat ~/.ssh/id_ed25519.pub
            echo "-----------------------------------"
            echo ""
            echo "1. Go to: https://github.com/settings/keys"
            echo "2. Click 'New SSH key'"
            echo "3. Paste the key above"
            echo ""
            read -p "Press enter after you've added the key to GitHub..."
        else
            # Use existing key
            if [ -f ~/.ssh/id_ed25519.pub ]; then
                KEY_FILE=~/.ssh/id_ed25519.pub
            else
                KEY_FILE=~/.ssh/id_rsa.pub
            fi
            
            echo "Found existing SSH key: $KEY_FILE"
            echo ""
            echo "If not already added to GitHub, add this key:"
            cat $KEY_FILE
            echo ""
            read -p "Press enter to continue..."
        fi
        
        # Test SSH connection
        echo "Testing SSH connection..."
        ssh -T git@github.com 2>&1 | grep -q "successfully authenticated" && SSH_WORKS=true || SSH_WORKS=false
        
        if [ "$SSH_WORKS" = true ]; then
            echo "✅ SSH authentication works!"
            git remote set-url origin git@github.com:iambrands/edgedemo-ai.git
            echo "✅ Remote URL updated to use SSH"
        else
            echo "⚠️ SSH authentication failed. You may need to add the key to GitHub first."
            exit 1
        fi
        ;;
        
    2)
        echo ""
        echo "🔑 Setting up Personal Access Token authentication..."
        echo ""
        echo "1. Go to: https://github.com/settings/tokens"
        echo "2. Click 'Generate new token (classic)'"
        echo "3. Name it: 'EdgeAI Auto Push'"
        echo "4. Select scope: 'repo' (full control)"
        echo "5. Click 'Generate token'"
        echo "6. COPY THE TOKEN (you won't see it again!)"
        echo ""
        read -sp "Paste your Personal Access Token here: " GITHUB_TOKEN
        echo ""
        
        if [ -z "$GITHUB_TOKEN" ]; then
            echo "❌ Token is required"
            exit 1
        fi
        
        # Update remote to use token
        git remote set-url origin https://${GITHUB_TOKEN}@github.com/iambrands/edgedemo-ai.git
        
        echo ""
        echo "✅ Remote URL updated with token"
        echo "✅ Authentication configured!"
        
        # Store token securely (optional - user can also use credential helper)
        echo ""
        echo "💡 Tip: To avoid entering token again, set up credential helper:"
        echo "   git config --global credential.helper osxkeychain"
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🧪 Testing push access..."
git ls-remote origin HEAD > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Authentication successful! You can now push automatically."
    echo ""
    echo "📦 Ready to push? Run:"
    echo "   git push origin main"
else
    echo "❌ Authentication failed. Please check your setup."
    exit 1
fi


