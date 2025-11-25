# How to Start IAB OptionsBot

## Quick Start Guide

### Option 1: Start Both Servers (Recommended)

**Open Terminal 1 - Backend:**
```bash
cd /Users/iabadvisors/Projects/iab-options-bot
source venv/bin/activate
python app.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

**Open Terminal 2 - Frontend:**
```bash
cd /Users/iabadvisors/Projects/iab-options-bot/frontend
npm start
```

You should see:
```
Compiled successfully!
You can now view iab-optionsbot-frontend in the browser.
  Local:            http://localhost:4000
```

### Option 2: Use Docker (All-in-One)

```bash
cd /Users/iabadvisors/Projects/iab-options-bot
docker-compose up --build
```

This starts:
- PostgreSQL database
- Backend API (port 5000)
- Frontend (port 3000)

## Access the Application

1. **Open your browser** and go to: **http://localhost:4000**

2. **First Time Setup:**
   - Click "Sign up" or go to http://localhost:4000/register
   - Create a new account (username, email, password)
   - You'll be automatically logged in

3. **Explore the Features:**
   - **Dashboard**: View performance metrics and positions
   - **Options Analyzer**: Analyze options chains (try "AAPL")
   - **Watchlist**: Add stocks to track
   - **Automations**: Create automated trading strategies
   - **History**: View your trade history

## What You'll See

### Login/Register Page
- Clean, modern interface
- Register a new account or login

### Dashboard
- Performance metrics (P/L, win rate)
- Interactive charts
- Active positions
- Recent trades

### Options Analyzer
- Enter any stock symbol (e.g., AAPL, TSLA, MSFT)
- Select expiration date
- Choose strategy preference (Income/Balanced/Growth)
- View scored options with explanations

### Watchlist
- Add stocks with tags
- Real-time price updates
- Notes and metadata

## Troubleshooting

### Backend won't start
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Check if port 5000 is in use
lsof -ti:5000

# Kill if needed
kill $(lsof -ti:5000)
```

### Frontend won't start
```bash
# Make sure you're in frontend directory
cd frontend

# Check if port 4000 is in use
lsof -ti:4000

# Kill if needed
kill $(lsof -ti:4000)

# Clear cache and reinstall if needed
rm -rf node_modules/.cache
npm start
```

### Database issues
```bash
# The database is created automatically on first run
# If you need to reset:
rm iab_optionsbot.db
python app.py  # This will recreate it
```

## Stopping the Servers

- **Terminal**: Press `Ctrl+C` in each terminal
- **Docker**: Press `Ctrl+C` or run `docker-compose down`

## Default Configuration

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:4000
- **Database**: SQLite (development) or PostgreSQL (Docker)
- **Mock Data**: Enabled by default (no API keys needed)

## Next Steps

1. Start both servers
2. Open http://localhost:4000
3. Register an account
4. Try the Options Analyzer with "AAPL"
5. Add some stocks to your watchlist
6. Explore all features!

Enjoy exploring IAB OptionsBot! 🚀

