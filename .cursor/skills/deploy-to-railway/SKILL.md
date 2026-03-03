---
name: deploy-to-railway
description: Deploy the Edge platform to Railway, verify deployments, check logs, and troubleshoot failures. Use when the user asks to deploy, check deployment status, view Railway logs, or fix production issues.
---

# Deploy to Railway

## Prerequisites
- Railway CLI installed (`railway` command available)
- Git remote `origin` points to `github.com/iambrands/edgedemo-ai`
- Railway auto-deploys from `main` branch

## Deployment Workflow

### Step 1: Commit and Push
```bash
git add -A
git commit -m "descriptive message"
git push origin main
```

### Step 2: Monitor Deployment
```bash
# Watch deployment logs (most recent)
railway logs -n 50

# Check for startup errors — look for:
# - "Mock-data routers mounted for: ..." (expected)
# - "Failed to mount ... router" (investigate)
# - "Frontend dist directory found at ..." (good)
# - "Frontend dist not found" (bad — Dockerfile issue)
```

### Step 3: Verify Health
```bash
# Health endpoint
curl -s https://edgedemo-ai-production.up.railway.app/api/health | python3 -m json.tool

# Frontend serves HTML (not JSON)
curl -s https://edgedemo-ai-production.up.railway.app/ | head -5
# Should contain <!DOCTYPE html>

# Auth works
curl -s -X POST https://edgedemo-ai-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leslie@iabadvisors.com","password":"CreateWealth2026$"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'access_token' in d else 'FAIL:', d)"
```

### Step 4: Spot-Check Key Endpoints
```bash
BASE="https://edgedemo-ai-production.up.railway.app"
for ep in /api/v1/prospects /api/v1/custodians/connections /api/v1/tax-harvest/opportunities /api/v1/model-portfolios /api/v1/meetings /api/v1/portal/dashboard; do
  echo -n "$ep: " && curl -s -w "%{http_code}" -o /dev/null "$BASE$ep"
  echo
done
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 500 on feature endpoints | DB router mounted but no DATABASE_URL | Add feature to `_db_routers` in `app.py` |
| 405 Method Not Allowed | Router failed to mount at startup | Check `railway logs` for import errors |
| Frontend returns JSON, not HTML | Dockerfile not used / frontend not built | Verify builder=NIXPACKS, dockerfilePath=Dockerfile |
| CORS errors in browser | Origin not in allowed list | Check `RAILWAY_PUBLIC_DOMAIN` env var |
| App crashes on startup | JWT secret check or import error | Check for `RuntimeError` in logs |

## Environment Variables
Set in Railway dashboard (Settings > Variables):
- `ANTHROPIC_API_KEY` — Anthropic Claude for AI features
- `JWT_SECRET_KEY` — RIA auth secret
- `PORTAL_JWT_SECRET` — Client portal auth secret
- `TRADIER_API_KEY` — Stock screener market data
- `ENVIRONMENT` — Set to `production`
