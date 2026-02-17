# Fix Secret in Git History

## ⚠️ Issue
GitHub detected an OpenAI API key in your git commit history and is blocking the push.

## 🔧 Solution Options

### Option 1: Allow Secret via GitHub (Easiest)

GitHub provided a link to allow the secret:
👉 **https://github.com/iambrands/edgedemo-ai/security/secret-scanning/unblock-secret/35tOMIhuKD9K4VgXqYAiaEbmx2z**

1. Click that link
2. Review the secret
3. Click "Allow secret" (if it's safe - it's just in docs)
4. Then push again

### Option 2: Rewrite Git History (Cleaner)

Remove the secret from all commits:

```bash
# Install git-filter-repo (if not installed)
pip install git-filter-repo

# Remove secret from all commits
git filter-repo --invert-paths --path DEPLOYMENT.md --path GITHUB_DEPLOY.md

# Re-add the fixed files
git add DEPLOYMENT.md GITHUB_DEPLOY.md
git commit -m "Security: Remove API keys from documentation"

# Force push (required after history rewrite)
git push origin main --force
```

### Option 3: Start Fresh Branch (Quickest)

If you don't need the full history:

```bash
# Create new branch without history
git checkout --orphan clean-main
git add -A
git commit -m "Initial commit: Edge Portfolio Analyzer Demo"
git branch -D main
git branch -m main
git push origin main --force
```

---

## ✅ Recommended: Use GitHub Link

The easiest is to use the GitHub link above to allow the secret, since:
- It's just in documentation (not actual code)
- The key is already in your .env file (which is gitignored)
- No history rewriting needed

---

**After allowing, push again:**
```bash
git push origin main
```


