# Deploy EdgeAI to Vercel

## Option 1: Frontend Only on Vercel (Recommended for Hybrid Setup)

Deploy the React frontend to Vercel and keep the backend on GCP.

### Setup Steps

1. **Create `vercel.json` configuration:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "frontend/index.html",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/frontend/index.html"
       }
     ],
     "env": {
       "API_BASE_URL": "https://your-backend-url.run.app"
     }
   }
   ```

2. **Update frontend to use environment variable for API URL:**
   - Modify `frontend/index.html` to check for `Vercel` environment variable
   - Or create a separate config file

3. **Deploy:**
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

4. **Configure custom domain:**
   - In Vercel dashboard → Settings → Domains
   - Add `demo.edgeadvisors.ai`
   - Add DNS records as instructed

---

## Option 2: Full Stack on Vercel (Serverless Functions)

Convert backend to Vercel serverless functions.

### Create Serverless Function Structure

1. **Create `api/analyze-portfolio.py`:**
   ```python
   from fastapi import FastAPI
   from mangum import Mangum
   # ... import your existing code ...
   
   app = FastAPI()
   
   # Mount all your existing routes
   # ...
   
   handler = Mangum(app)
   ```

2. **Create `vercel.json`:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "api/**/*.py",
         "use": "@vercel/python"
       },
       {
         "src": "frontend/index.html",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/api/$1"
       },
       {
         "src": "/(.*)",
         "dest": "/frontend/index.html"
       }
     ]
   }
   ```

3. **Update `requirements.txt` for Vercel:**
   - Add `mangum` for FastAPI → AWS Lambda adapter
   - Ensure all dependencies are listed

4. **Set environment variables in Vercel:**
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGINS`

5. **Deploy:**
   ```bash
   vercel --prod
   ```

**Note:** Vercel serverless functions have timeout limits (10s hobby, 60s pro). For AI analysis, GCP Cloud Run is better.

---

## Recommended: Frontend on Vercel + Backend on GCP

Best of both worlds:
- **Vercel**: Fast CDN for frontend, automatic SSL
- **GCP Cloud Run**: Better for long-running AI requests, no timeout issues

See `GCP_DEPLOY.md` for backend setup.

