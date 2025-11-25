# GitHub SSH Key Setup Guide

## 🔐 Option 1: SSH Keys (Recommended - Most Secure)

### Step 1: Check for Existing SSH Keys

```bash
ls -al ~/.ssh
```

If you see files like `id_ed25519` or `id_rsa`, you already have SSH keys. Skip to Step 3.

### Step 2: Generate New SSH Key

```bash
# Generate a new SSH key (replace with your GitHub email)
ssh-keygen -t ed25519 -C "your_email@example.com"

# When prompted:
# - Press Enter to accept default file location (~/.ssh/id_ed25519)
# - Enter a passphrase (recommended) or press Enter for no passphrase
```

**Example:**
```bash
ssh-keygen -t ed25519 -C "iambrands@example.com"
```

### Step 3: Start SSH Agent

```bash
# Start the ssh-agent
eval "$(ssh-agent -s)"

# Add your SSH key to the agent
ssh-add ~/.ssh/id_ed25519
```

### Step 4: Copy Your Public Key

```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub

# Or copy it directly to clipboard (macOS)
pbcopy < ~/.ssh/id_ed25519.pub
```

### Step 5: Add SSH Key to GitHub

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/keys
   - Or: GitHub → Settings → SSH and GPG keys

2. **Add New SSH Key:**
   - Click "New SSH key" or "Add SSH key"
   - **Title:** `MacBook - iab-options-bot` (or any descriptive name)
   - **Key type:** Authentication Key
   - **Key:** Paste your public key (from Step 4)
   - Click "Add SSH key"

### Step 6: Test SSH Connection

```bash
ssh -T git@github.com
```

You should see:
```
Hi iambrands! You've successfully authenticated, but GitHub does not provide shell access.
```

### Step 7: Update Git Remote to Use SSH

```bash
cd /Users/iabadvisors/Projects/iab-options-bot

# Change remote URL from HTTPS to SSH
git remote set-url origin git@github.com:iambrands/iab-options-bot.git

# Verify
git remote -v
```

You should see:
```
origin  git@github.com:iambrands/iab-options-bot.git (fetch)
origin  git@github.com:iambrands/iab-options-bot.git (push)
```

### Step 8: Test Push (Optional)

```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: SSH authentication"
git push

# If successful, remove the test change
git reset HEAD~1
git checkout README.md
```

---

## 🚀 Option 2: GitHub CLI (Easier but Less Secure)

### Step 1: Install GitHub CLI

**macOS (using Homebrew):**
```bash
brew install gh
```

**Or download from:**
https://cli.github.com/

### Step 2: Authenticate

```bash
gh auth login
```

Follow the prompts:
- **What account do you want to log into?** → GitHub.com
- **What is your preferred protocol?** → HTTPS (or SSH)
- **Authenticate Git with your GitHub credentials?** → Yes
- **How would you like to authenticate?** → Login with a web browser (easiest)

### Step 3: Verify Authentication

```bash
gh auth status
```

### Step 4: Test Push

```bash
cd /Users/iabadvisors/Projects/iab-options-bot
git push
```

---

## ✅ Verification

After setup, verify everything works:

```bash
# Check remote URL (should show SSH for Option 1)
git remote -v

# Test connection (SSH)
ssh -T git@github.com

# Or check auth status (GitHub CLI)
gh auth status
```

---

## 🔄 Using SSH Keys Going Forward

Once SSH is set up, you can push/pull without entering credentials:

```bash
git push
git pull
```

No tokens or passwords needed!

---

## 🆘 Troubleshooting

### "Permission denied (publickey)"
- Make sure you added the **public** key (`.pub` file) to GitHub
- Verify SSH agent is running: `eval "$(ssh-agent -s)"`
- Add key to agent: `ssh-add ~/.ssh/id_ed25519`

### "Could not resolve hostname"
- Check your internet connection
- Try: `ssh -T git@github.com -v` for verbose output

### "Host key verification failed"
- Remove old GitHub key: `ssh-keygen -R github.com`
- Try connecting again

### GitHub CLI not working
- Re-authenticate: `gh auth login`
- Check installation: `gh --version`

---

## 📝 Quick Reference

**SSH Key Location:**
- Private key: `~/.ssh/id_ed25519` (keep secret!)
- Public key: `~/.ssh/id_ed25519.pub` (safe to share)

**GitHub SSH Key Settings:**
https://github.com/settings/keys

**Test SSH Connection:**
```bash
ssh -T git@github.com
```

**Change Remote to SSH:**
```bash
git remote set-url origin git@github.com:iambrands/iab-options-bot.git
```

---

**Recommendation:** Use SSH keys (Option 1) for better security and convenience.

