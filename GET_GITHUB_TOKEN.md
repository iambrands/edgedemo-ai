# How to Get Your GitHub Personal Access Token

## 📍 Where to Go

**Personal Access Tokens are in your ACCOUNT settings, not repository settings.**

### Step-by-Step:

1. **From the screenshot you showed**, you're on the repository settings page.
   
2. **Click your profile picture** (top right corner of GitHub) 

3. **Click "Settings"** (your account settings, not repository settings)

4. **In the left sidebar**, scroll down and click:
   - **"Developer settings"** (at the bottom of the left menu)

5. **Click "Personal access tokens"**
   - Then click **"Tokens (classic)"** 
   - Or **"Fine-grained tokens"** (newer option)

6. **Click "Generate new token"**
   - Classic: "Generate new token (classic)"
   - Fine-grained: "Generate new token"

7. **Configure your token:**
   - **Note/Name:** `EdgeAI Auto Push`
   - **Expiration:** Choose your preference (30/60/90 days, or no expiration)
   - **Select scopes:** Check **`repo`** (this selects all repository permissions)
     - For classic tokens, just check the `repo` box
     - For fine-grained, select the repository: `iambrands/edgedemo-ai` and give it `Contents: Read and write` permission

8. **Click "Generate token"**

9. **COPY THE TOKEN IMMEDIATELY!**
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **You won't be able to see it again!**

---

## 🔗 Direct Links

**Classic Token:**
https://github.com/settings/tokens/new

**Fine-grained Token:**
https://github.com/settings/tokens/new?type=beta

**Token List (to manage existing tokens):**
https://github.com/settings/tokens

---

## 📝 Quick Visual Guide

From where you are in the screenshot:
1. **Top right** → Click your profile picture
2. **Settings** (in the dropdown)
3. **Left sidebar** → Scroll down → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token (classic)**
6. Name it, select `repo` scope, generate
7. Copy token!

---

## ✅ After You Have the Token

**Option 1: Set as environment variable (recommended)**
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

**Option 2: Use the interactive script**
```bash
./setup-auto-push.sh
```
(Enter token when prompted)

**Option 3: Edit the token file**
Edit `.git-push-token` and replace `YOUR_TOKEN_HERE` with your token.

---

**Once you have the token, I can set it up and push automatically!** 🚀


