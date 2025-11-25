# Quick SSH Setup Steps

## ✅ Your SSH Key is Ready!

Your public key has been copied to your clipboard. Here's what to do next:

### Step 1: Add SSH Key to GitHub

1. **Go to GitHub SSH Settings:**
   - Visit: https://github.com/settings/keys
   - Or: GitHub → Your Profile → Settings → SSH and GPG keys

2. **Add New SSH Key:**
   - Click "New SSH key" button (green button, top right)
   - **Title:** `MacBook - iab-options-bot` (or any name you like)
   - **Key type:** Authentication Key
   - **Key:** Paste your public key (it's already in your clipboard!)
     - The key starts with: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...`
   - Click "Add SSH key"
   - You may need to enter your GitHub password to confirm

### Step 2: Test SSH Connection

After adding the key, run this command:

```bash
ssh -T git@github.com
```

You should see:
```
Hi iambrands! You've successfully authenticated, but GitHub does not provide shell access.
```

**Note:** You'll be prompted for your SSH key passphrase (the one you set when creating the key).

### Step 3: Update Git Remote to Use SSH

Once SSH is working, update your repository:

```bash
cd /Users/iabadvisors/Projects/iab-options-bot
git remote set-url origin git@github.com:iambrands/iab-options-bot.git
git remote -v
```

You should see:
```
origin  git@github.com:iambrands/iab-options-bot.git (fetch)
origin  git@github.com:iambrands/iab-options-bot.git (push)
```

### Step 4: Test Push

```bash
git push
```

You'll be prompted for your SSH key passphrase (one time per session).

---

## 🔐 Your SSH Public Key

If you need to copy it again:

```bash
cat ~/.ssh/id_ed25519.pub
# Or copy to clipboard:
pbcopy < ~/.ssh/id_ed25519.pub
```

**Your key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPgvw2CAZSV7Ix0yVolIKgf6JbgoklGW8TFSxSa10B4j leslie.wilson@iambrands.com
```

---

## ✅ After Setup

Once SSH is configured:
- ✅ No more token needed
- ✅ Just enter your SSH passphrase when prompted
- ✅ Push/pull works seamlessly

---

**Next:** Add the key to GitHub at https://github.com/settings/keys

