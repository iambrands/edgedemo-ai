# Starting the App Locally

## Quick Start

### Option 1: Start Both Backend and Frontend (Recommended)

**Terminal 1 - Backend:**
```bash
cd /Users/iabadvisors/Projects/iab-options-bot
source venv/bin/activate  # Activate virtual environment
python app.py
```
Backend will run on: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd /Users/iabadvisors/Projects/iab-options-bot/frontend
npm start
```
Frontend will run on: http://localhost:6002

### Option 2: Using Docker (If configured)

```bash
docker-compose up
```

## Step-by-Step Setup (First Time)

### 1. Backend Setup

```bash
# Navigate to project
cd /Users/iabadvisors/Projects/iab-options-bot

# Activate virtual environment
source venv/bin/activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Make sure .env file exists with your settings
# Check that DATABASE_URL is set (or it will use SQLite)

# Start the backend
python app.py
```

### 2. Frontend Setup

```bash
# Open a new terminal window
cd /Users/iabadvisors/Projects/iab-options-bot/frontend

# Install dependencies (if not already installed)
npm install

# Start the frontend
npm start
```

## Access the App

- **Frontend:** http://localhost:6002
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

## Default Login (if you have a user)

You can register a new user or use existing credentials if you have them.

## Troubleshooting

### Backend won't start:
- Check if port 5000 is already in use
- Make sure virtual environment is activated
- Check .env file exists and has correct settings

### Frontend won't start:
- Check if port 6002 is already in use
- Make sure node_modules are installed (`npm install`)
- Check that backend is running on port 5000

### Database errors:
- If using SQLite: Database file will be created automatically
- If using PostgreSQL: Make sure DATABASE_URL is set correctly in .env

