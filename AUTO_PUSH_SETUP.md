# Automatic Push Setup - One-Time Configuration

## Quick Setup (Choose One Method)

### Method 1: Personal Access Token (Recommended for Auto-Push)

1. **Create Token:**
   - Go to: https://github.com/settings/tokens/new
   - Name: `EdgeAI Auto Push`
   - Expiration: `90 days` (or your preference)
   - Select scope: `repo` (all checkboxes under "repo")
   - Click "Generate token"
   - **COPY THE TOKEN** (starts with `ghp_`)

2. **Configure Git:**
   ```bash
   cd /Users/iabadvisors/Projects/edgeai-demo
   
   # Store token securely
   git config credential.helper osxkeychain
   
   # Push once (will prompt for token, then save it)
   git push origin main
   ```
   
   When prompted:
   - Username: `iambrands`
   - Password: `paste your token here`

3. **After first push, token is saved!** ✅
   - Future pushes will work automatically

---

### Method 2: SSH Key (If you prefer SSH)

1. **Add your SSH key to GitHub:**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Title: `EdgeAI Demo`
   - Key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPgvw2CAZSV7Ix0yVolIKgf6JbgoklGW8TFSxSa10B4j leslie.wilson@iambrands.com`
   - Click "Add SSH key"

2. **Test:**
   ```bash
   ssh -T git@github.com
   ```

3. **Push:**
   ```bash
   git push origin main
   ```

---

## After Setup - Automatic Pushing

Once configured, I can automatically push changes with:
```bash
git push origin main
```

No more manual steps needed! 🚀


