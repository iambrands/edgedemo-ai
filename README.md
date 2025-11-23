# EdgeAI Portfolio Analyzer Demo

Production-ready portfolio analysis application powered by OpenAI GPT, featuring a professional FinTech design.

## Features

- **Professional FinTech UI**: Clean, modern design with Wealthfront/Betterment-style aesthetic
- **AI-Powered Analysis**: Comprehensive portfolio analysis using OpenAI GPT API
- **Backend API**: FastAPI server with rate limiting, CORS, and security best practices
- **Production Ready**: Docker support, environment-based configuration, deployment guides

## Architecture

- **Backend**: FastAPI (Python 3.11+) with OpenAI SDK
- **Frontend**: React (via CDN, no build process needed)
- **Rate Limiting**: 10 requests per IP per hour (configurable)
- **Security**: API key protection, input validation, CORS configuration

## Quick Start

### Prerequisites

- Python 3.11 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Docker (optional, for containerized deployment)

### Local Development

1. **Clone the repository**
   ```bash
   cd edgeai-demo
   ```

2. **Create environment file**
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` file**
   ```env
   OPENAI_API_KEY=your_api_key_here
   ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
   PORT=8000
   ```

4. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

5. **Run the server**
   ```bash
   python app.py
   # Or using uvicorn directly:
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

6. **Open in browser**
   ```
   http://localhost:8000
   ```

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Create `.env` file** (see Quick Start above)

2. **Build and run**
   ```bash
   docker-compose up -d
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services**
   ```bash
   docker-compose down
   ```

### Using Docker Directly

```bash
# Build the image
docker build -t edgeai-demo .

# Run the container
docker run -d \
  -p 8000:8000 \
  -e OPENAI_API_KEY=your_api_key \
  -e ALLOWED_ORIGINS=https://demo.edgeadvisors.ai \
  --name edgeai-demo \
  edgeai-demo
```

## Production Deployment

### Railway

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Initialize and deploy**
   ```bash
   railway init
   railway up
   ```

3. **Set environment variables**
   ```bash
   railway variables set OPENAI_API_KEY=your_key
   railway variables set ALLOWED_ORIGINS=https://demo.edgeadvisors.ai
   ```

4. **Open your deployed app**
   ```bash
   railway open
   ```

### DigitalOcean App Platform

1. **Create `app.yaml`** (see example below)
2. **Deploy via DigitalOcean dashboard** or CLI
3. **Set environment variables** in the App Platform settings

**Example `app.yaml`:**
```yaml
name: edgeai-demo
services:
- name: api
  github:
    repo: your-username/edgeai-demo
    branch: main
  run_command: uvicorn backend.app:app --host 0.0.0.0 --port 8080
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: OPENAI_API_KEY
    scope: RUN_TIME
    value: ${OPENAI_API_KEY}
  - key: ALLOWED_ORIGINS
    scope: RUN_TIME
    value: https://demo.edgeadvisors.ai
  http_port: 8080
  routes:
  - path: /
```

### Heroku

1. **Install Heroku CLI** and login
   ```bash
   heroku login
   ```

2. **Create app**
   ```bash
   heroku create edgeai-demo
   ```

3. **Set environment variables**
   ```bash
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set ALLOWED_ORIGINS=https://demo.edgeadvisors.ai
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### VPS/Server Deployment (Nginx + Systemd)

1. **Install dependencies on server**
   ```bash
   sudo apt update
   sudo apt install python3.11 python3.11-venv nginx
   ```

2. **Clone and setup**
   ```bash
   git clone <your-repo-url> /var/www/edgeai-demo
   cd /var/www/edgeai-demo
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. **Create systemd service** (`/etc/systemd/system/edgeai.service`):
   ```ini
   [Unit]
   Description=EdgeAI Portfolio Analyzer API
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/edgeai-demo
   Environment="PATH=/var/www/edgeai-demo/venv/bin"
   Environment="OPENAI_API_KEY=your_key"
   Environment="ALLOWED_ORIGINS=https://demo.edgeadvisors.ai"
   ExecStart=/var/www/edgeai-demo/venv/bin/uvicorn backend.app:app --host 127.0.0.1 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

4. **Create Nginx config** (`/etc/nginx/sites-available/edgeai-demo`):
   ```nginx
   server {
       listen 80;
       server_name demo.edgeadvisors.ai;

       # Redirect HTTP to HTTPS (use certbot for SSL)
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name demo.edgeadvisors.ai;

       ssl_certificate /etc/letsencrypt/live/demo.edgeadvisors.ai/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/demo.edgeadvisors.ai/privkey.pem;

       client_max_body_size 1M;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

5. **Enable and start services**
   ```bash
   sudo systemctl enable edgeai
   sudo systemctl start edgeai
   sudo ln -s /etc/nginx/sites-available/edgeai-demo /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d demo.edgeadvisors.ai
   ```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key | - |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed CORS origins | `*` |
| `PORT` | No | Server port | `8000` |

**Important**: Never commit `.env` file to version control. Always use environment variables in production.

## API Endpoints

### `GET /`
Serves the frontend HTML file.

### `GET /health`
Health check endpoint. Returns `{"status": "healthy"}`.

### `POST /api/analyze-portfolio`
Analyzes a portfolio using OpenAI GPT.

**Request Body:**
```json
{
  "client": {
    "name": "John Smith",
    "age": 45,
    "riskTolerance": "Moderate",
    "primaryGoal": "Retirement"
  },
  "holdings": [
    {"ticker": "AAPL", "amount": 50000},
    {"ticker": "VTI", "amount": 75000}
  ]
}
```

**Response:**
```json
{
  "portfolioHealth": {
    "score": 87,
    "grade": "A-",
    "summary": "..."
  },
  "taxOptimization": {
    "annualSavings": "$3,200 - $5,600",
    "opportunities": [...],
    "tlhCandidates": [...]
  },
  "rebalancing": {
    "needsRebalancing": false,
    "recommendations": [...],
    "targetAllocation": "..."
  },
  "retirementReadiness": {
    "score": 91,
    "monthlyNeeded": "$2,100",
    "onTrack": true,
    "recommendation": "..."
  },
  "compliance": {
    "suitabilityScore": 98,
    "issues": [...],
    "status": "Compliant"
  },
  "behavioralCoaching": {
    "message": "...",
    "sentiment": "Positive"
  }
}
```

**Rate Limit**: 10 requests per IP per hour

**Error Responses:**
- `400`: Invalid request data
- `422`: Validation error
- `429`: Rate limit exceeded
- `503`: AI service unavailable
- `500`: Internal server error

## Security Features

- ✅ API key stored server-side only (never exposed to frontend)
- ✅ Rate limiting (10 requests/IP/hour)
- ✅ Input validation (Pydantic models)
- ✅ CORS configuration
- ✅ HTTPS-ready configuration
- ✅ Request size limits
- ✅ Error handling without exposing internals

## Project Structure

```
edgeai-demo/
├── backend/
│   ├── app.py              # FastAPI application
│   └── requirements.txt    # Python dependencies
├── frontend/
│   └── index.html          # React frontend
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose config
├── env.example             # Environment variables template
└── README.md               # This file
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests (create tests when ready)
pytest
```

### Code Style

```bash
# Format code
black backend/

# Lint code
flake8 backend/
```

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your frontend domain
- Check that the frontend is using the correct API base URL

### Rate Limit Errors
- Default limit is 10 requests per IP per hour
- For production, consider Redis-backed rate limiting

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI API status and quotas
- Review API logs for detailed error messages

### Frontend Not Loading
- Ensure `frontend/index.html` exists in the project root
- Check that the root route (`/`) is serving the HTML file
- Verify file permissions

## License

Proprietary - All Rights Reserved

## Support

For issues or questions, please contact the development team.

