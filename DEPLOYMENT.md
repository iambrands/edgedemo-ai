# Platform-Agnostic Docker Deployment Guide

## Overview

This application uses a **multi-stage Docker build** that works on:
- ✅ Railway (current)
- ✅ Google Cloud Platform (GCP) - Cloud Run
- ✅ AWS - ECS/Fargate
- ✅ Azure - Container Instances
- ✅ Any Kubernetes cluster

## Architecture

```
Stage 1: Build Frontend (Node 18)
    ↓
Stage 2: Build Backend (Python 3.11)
    ↓
Stage 3: Production Runtime (Gunicorn)
```

**Final Image Size:** ~400-500MB (optimized)

## Quick Start

### Railway (Current)

1. **Push to GitHub** - Railway auto-deploys
2. **Set Environment Variables** in Railway dashboard
3. **Done!** - App deploys automatically

### Local Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access at http://localhost:8080
```

### GCP Cloud Run (Future)

```bash
# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Or manually:
docker build -t gcr.io/YOUR_PROJECT/optionsedge:latest .
docker push gcr.io/YOUR_PROJECT/optionsedge:latest
gcloud run deploy optionsedge --image gcr.io/YOUR_PROJECT/optionsedge:latest
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key

### Optional
- `PORT` - Server port (default: 8080)
- `GUNICORN_WORKERS` - Worker count (default: 4)
- `GUNICORN_TIMEOUT` - Request timeout (default: 120s)
- `FLASK_ENV` - Environment (production/development)

## Scaling

### Small (1-1,000 users)
- **Platform:** Railway
- **Instances:** 1-2
- **Cost:** $30-50/month

### Medium (1,000-5,000 users)
- **Platform:** GCP Cloud Run
- **Instances:** Auto-scale 1-20
- **Cost:** $200-500/month

### Large (5,000-10,000 users)
- **Platform:** GCP GKE (Kubernetes)
- **Instances:** Auto-scale 3-50 pods
- **Cost:** $800-2,000/month

## Health Checks

The app exposes `/health` endpoint for:
- Railway health checks
- Kubernetes liveness/readiness probes
- Load balancer health checks

## Troubleshooting

### Build Fails
- Check memory limits (frontend build needs 4GB)
- Verify Node.js version (18.x)
- Check for missing dependencies

### App Won't Start
- Verify `PORT` environment variable is set
- Check database connection (`DATABASE_URL`)
- Review logs: `railway logs` or `kubectl logs`

### Performance Issues
- Increase `GUNICORN_WORKERS` (default: 4)
- Increase `GUNICORN_TIMEOUT` for long operations
- Add Redis for caching
- Use CDN for static assets

## Migration Path

1. **Now:** Railway (Dockerfile)
2. **1,000 users:** GCP Cloud Run (same Dockerfile)
3. **5,000 users:** GCP GKE (Kubernetes)
4. **10,000+ users:** Multi-region GKE

**No code changes needed** - same Dockerfile works everywhere!

