#!/bin/bash
# OptionsEdge Production Deployment Script

set -e  # Exit on error

echo "=========================================="
echo "OptionsEdge Production Deployment"
echo "=========================================="

# Pre-flight checks
echo ""
echo "Pre-flight checks..."

# Check we're on the right branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "production" ]; then
    echo "Warning: Not on main/production branch (currently on $BRANCH)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Uncommitted changes detected"
    echo "Please commit or stash changes before deploying"
    exit 1
fi

echo "  Branch: $BRANCH"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  Message: $(git log -1 --pretty=%B | head -1)"

echo "  Pre-flight checks passed"

# Confirm deployment
echo ""
echo "Ready to deploy to PRODUCTION"
echo "This will affect live users!"
read -p "Are you sure? (type 'deploy' to confirm) " CONFIRM

if [ "$CONFIRM" != "deploy" ]; then
    echo "Deployment cancelled"
    exit 1
fi

# Deploy
echo ""
echo "Deploying..."

# Push to main
git push origin "$BRANCH"

# If using Railway CLI directly
if command -v railway &> /dev/null; then
    echo ""
    echo "Triggering Railway deployment..."
    railway up
    echo ""
    echo "  Railway deployment initiated"
else
    echo ""
    echo "  Code pushed to origin/$BRANCH"
    echo "  Railway should auto-deploy from the push"
fi

echo ""
echo "  Deployment initiated"
echo ""
echo "Next steps:"
echo "1. Monitor Railway dashboard for build status"
echo "2. Check /health endpoint after deploy"
echo "3. Run: python scripts/verify_security.py"
echo "4. Test critical user flows"
echo ""
echo "Rollback command (if needed):"
echo "  git revert HEAD && git push origin $BRANCH"
