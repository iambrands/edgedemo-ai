# Update OpenAI API Key

## ⚠️ Issue
Your OpenAI API key is invalid or expired (401 Unauthorized error).

## 🔧 How to Fix

### Option 1: Get New API Key
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-` or `sk-`)
4. Share it with me to update automatically

### Option 2: Update Manually

1. **Update `.env` file:**
   ```bash
   OPENAI_API_KEY=your_new_key_here
   ```

2. **Update Cloud Run:**
   ```bash
   export OPENAI_KEY=your_new_key_here
   gcloud run services update edgeai-demo \
     --region us-central1 \
     --update-env-vars OPENAI_API_KEY="$OPENAI_KEY"
   ```

## ✅ After Update

The service will automatically use the new key and the 503 errors will be resolved.

---

**Quick fix: Just share your new API key and I'll update everything automatically!** 🚀


