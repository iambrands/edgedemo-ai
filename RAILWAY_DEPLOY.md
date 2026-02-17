# Edge Railway Deployment Guide

## Quick Start

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Empty Project"
3. Name it `edgeai-staging`

---

## Step 2: Add PostgreSQL Database

1. In your project, click "+ New" → "Database" → "PostgreSQL"
2. Wait for provisioning (~30 seconds)
3. The `DATABASE_URL` variable is automatically available

---

## Step 3: Add Redis Cache (Optional)

1. Click "+ New" → "Database" → "Redis"
2. Wait for provisioning
3. The `REDIS_URL` variable is automatically available

---

## Step 4: Deploy Backend

1. Click "+ New" → "GitHub Repo"
2. Select your Edge repository
3. **Important**: Set root directory to `backend`
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (if using Redis) |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` |
| `ENVIRONMENT` | `production` |
| `OPENAI_API_KEY` | Your key (optional) |
| `ANTHROPIC_API_KEY` | Your key (optional) |

5. Click Deploy

---

## Step 5: Get Backend URL

1. Go to backend service → Settings → Networking
2. Click "Generate Domain"
3. Copy URL (e.g., `https://edgeai-backend-xxx.up.railway.app`)

---

## Step 6: Deploy Frontend

1. Click "+ New" → "GitHub Repo"
2. Select same repository
3. **Important**: Set root directory to `frontend`
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your backend URL from Step 5 |

5. Click Deploy

---

## Step 7: Get Frontend URL & Update CORS

1. Go to frontend service → Settings → Networking
2. Click "Generate Domain"
3. Copy URL
4. Go back to **backend** service → Variables
5. Add: `RAILWAY_FRONTEND_URL` = your frontend URL
6. Redeploy backend

---

## Step 8: Seed Database

Option A - Railway Shell:
1. Go to backend service
2. Click "Shell" tab
3. Run: `python seed.py`

Option B - Railway CLI:
```bash
railway run python seed.py
```

---

## Verification Checklist

- [ ] Backend health: `https://your-backend.up.railway.app/api/health`
- [ ] Frontend loads: `https://your-frontend.up.railway.app`
- [ ] Login: `leslie@iabadvisors.com` / `CreateWealth2026$`
- [ ] Dashboard shows data (4 households, 12 accounts)

---

## Environment Variables Reference

### Backend (Required)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<your-32-char-secret>
ENVIRONMENT=production
```

### Backend (Optional)
```
REDIS_URL=${{Redis.REDIS_URL}}
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RAILWAY_FRONTEND_URL=https://your-frontend.up.railway.app
```

### Frontend
```
VITE_API_URL=https://your-backend.up.railway.app
```

---

## Troubleshooting

### CORS Errors
- Ensure `RAILWAY_FRONTEND_URL` is set in backend
- Redeploy backend after adding the variable

### 502 Bad Gateway
- Backend still starting (wait 30s)
- Check logs for startup errors

### Database Connection Failed
- Verify PostgreSQL addon is provisioned
- Use `${{Postgres.DATABASE_URL}}` syntax

### Frontend Can't Reach Backend
- Verify `VITE_API_URL` is set before build
- Rebuild frontend after env var change

---

## Rollback

1. Go to service → Deployments
2. Find last working deployment
3. Click "..." → "Rollback"

---

## Cost Estimate (Hobby Plan)

- PostgreSQL: ~$0.50/day
- Redis: ~$0.50/day
- Backend (512MB): ~$1/day
- Frontend (256MB): ~$0.50/day

**Total**: ~$75-90/month for staging
