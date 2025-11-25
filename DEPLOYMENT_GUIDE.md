# Deployment Guide - IAB OptionsBot

This guide covers deploying IAB OptionsBot from local development to staging and production environments.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (for production)
- Tradier API credentials
- OpenAI API key
- Server/hosting environment (AWS, Heroku, DigitalOcean, etc.)

---

## Step 1: Pre-Deployment Checklist

### 1.1 Environment Variables

Create a `.env` file for your deployment environment with the following variables:

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=<generate-strong-random-key>
JWT_SECRET_KEY=<generate-strong-random-key>

# Database
DATABASE_URL=postgresql://user:password@host:5432/iab_optionsbot

# Tradier API (REQUIRED for production)
TRADIER_API_KEY=your-tradier-api-key
TRADIER_API_SECRET=your-tradier-api-secret
TRADIER_ACCOUNT_ID=your-tradier-account-id
TRADIER_BASE_URL=https://api.tradier.com/v1
TRADIER_SANDBOX=false  # Set to false for production

# Application Settings
USE_MOCK_DATA=false  # Must be false in production
USE_YAHOO_DATA=true  # Recommended as backup data source
USE_POLYGON_DATA=false  # Optional
DISABLE_AUTH=false  # Must be false in production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
USE_OPENAI_ALERTS=true

# CORS Configuration (REQUIRED)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Generate Strong Secret Keys:**
```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 1.2 Database Setup

**For Production:**
1. Set up PostgreSQL database
2. Create database: `CREATE DATABASE iab_optionsbot;`
3. Update `DATABASE_URL` in `.env`

**Initialize Migrations:**
```bash
# Activate virtual environment
source venv/bin/activate

# Initialize migrations (first time only)
flask db init

# Create initial migration
flask db migrate -m "Initial migration"

# Apply migrations
flask db upgrade
```

### 1.3 Dependencies

**Backend:**
```bash
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## Step 2: Backend Deployment

### 2.1 Using Gunicorn (Recommended)

**Install Gunicorn:**
```bash
pip install gunicorn
```

**Create `gunicorn_config.py`:**
```python
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
preload_app = True
```

**Run with Gunicorn:**
```bash
gunicorn -c gunicorn_config.py "app:create_app()"
```

### 2.2 Using Systemd (Linux)

Create `/etc/systemd/system/iab-optionsbot.service`:

```ini
[Unit]
Description=IAB OptionsBot API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/iab-options-bot
Environment="PATH=/path/to/iab-options-bot/venv/bin"
ExecStart=/path/to/iab-options-bot/venv/bin/gunicorn -c gunicorn_config.py "app:create_app()"
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable iab-optionsbot
sudo systemctl start iab-optionsbot
sudo systemctl status iab-optionsbot
```

### 2.3 Using Docker

**Build:**
```bash
docker build -t iab-optionsbot-backend .
```

**Run:**
```bash
docker run -d \
  --name iab-optionsbot-backend \
  -p 5000:5000 \
  --env-file .env \
  iab-optionsbot-backend
```

---

## Step 3: Frontend Deployment

### 3.1 Build Production Bundle

```bash
cd frontend

# Set production API URL
export REACT_APP_API_URL=https://api.yourdomain.com/api

# Build
npm run build
```

### 3.2 Serve with Nginx

**Install Nginx:**
```bash
sudo apt-get install nginx
```

**Create `/etc/nginx/sites-available/iab-optionsbot`:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /path/to/iab-options-bot/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/iab-optionsbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3 SSL/HTTPS (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Step 4: Tradier Integration

### 4.1 Get Tradier API Credentials

1. Sign up at https://developer.tradier.com
2. Create an application
3. Get API key, secret, and account ID
4. Add to `.env` file

### 4.2 Test Integration

```bash
# Test Tradier connection
python -c "
from app import create_app
from services.tradier_connector import TradierConnector
app = create_app()
with app.app_context():
    tradier = TradierConnector()
    quote = tradier.get_quote('AAPL')
    print(quote)
"
```

### 4.3 Switch from Sandbox to Production

1. Update `TRADIER_SANDBOX=false` in `.env`
2. Restart backend service
3. Test with small trade first

---

## Step 5: Monitoring & Logging

### 5.1 Application Logs

**Configure logging in production:**
```python
# Add to config.py
import logging
from logging.handlers import RotatingFileHandler

if not app.debug:
    file_handler = RotatingFileHandler('logs/iab_optionsbot.log', maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('IAB OptionsBot startup')
```

### 5.2 Error Tracking

**Set up Sentry (recommended):**
```bash
pip install sentry-sdk[flask]
```

**Add to `app.py`:**
```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

if not app.config.get('DEBUG'):
    sentry_sdk.init(
        dsn="your-sentry-dsn",
        integrations=[FlaskIntegration()],
        traces_sample_rate=1.0
    )
```

### 5.3 Health Checks

The application includes a health check endpoint:
```bash
curl https://api.yourdomain.com/health
```

Set up monitoring to check this endpoint regularly.

---

## Step 6: Database Migrations

### 6.1 Initial Migration

```bash
# Activate virtual environment
source venv/bin/activate

# Initialize (first time only)
flask db init

# Create migration
flask db migrate -m "Initial migration"

# Apply
flask db upgrade
```

### 6.2 Future Migrations

When you make model changes:
```bash
# Create migration
flask db migrate -m "Description of changes"

# Review migration file in migrations/versions/

# Apply migration
flask db upgrade
```

### 6.3 Rollback

If needed:
```bash
flask db downgrade -1  # Rollback one version
```

---

## Step 7: Post-Deployment Verification

### 7.1 Smoke Tests

1. **Health Check:**
   ```bash
   curl https://api.yourdomain.com/health
   ```

2. **Authentication:**
   - Test user registration
   - Test login
   - Test token refresh

3. **API Endpoints:**
   - Test options analysis
   - Test watchlist
   - Test trade execution (paper trading)

4. **Tradier Integration:**
   - Test quote fetching
   - Test options chain
   - Test trade execution (if live trading enabled)

### 7.2 Monitoring

- Check application logs
- Monitor error rates
- Check database connections
- Monitor API response times
- Check Tradier API usage

---

## Step 8: Backup Strategy

### 8.1 Database Backups

**Automated PostgreSQL Backup:**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * pg_dump -U user iab_optionsbot > /backups/iab_optionsbot_$(date +\%Y\%m\%d).sql
```

### 8.2 Configuration Backups

- Backup `.env` file (securely)
- Backup SSL certificates
- Document all environment variables

---

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Check `CORS_ORIGINS` environment variable
   - Ensure frontend URL is included

2. **Database Connection:**
   - Verify `DATABASE_URL` is correct
   - Check PostgreSQL is running
   - Verify user permissions

3. **Tradier API Errors:**
   - Verify API credentials
   - Check sandbox vs production mode
   - Review API rate limits

4. **Frontend Not Loading:**
   - Check `REACT_APP_API_URL` is set correctly
   - Verify Nginx configuration
   - Check browser console for errors

---

## Security Checklist

- [ ] Strong `SECRET_KEY` and `JWT_SECRET_KEY` generated
- [ ] `DISABLE_AUTH=false` in production
- [ ] `USE_MOCK_DATA=false` in production
- [ ] CORS origins restricted to production domain
- [ ] SSL/HTTPS enabled
- [ ] Database credentials secured
- [ ] API keys stored securely (not in code)
- [ ] Error messages don't expose sensitive info
- [ ] Rate limiting configured
- [ ] Regular security updates

---

## Support

For issues or questions:
1. Check logs: `tail -f logs/iab_optionsbot.log`
2. Review error tracking (Sentry)
3. Check application health endpoint
4. Review this deployment guide

---

**Last Updated:** 2025-01-26

