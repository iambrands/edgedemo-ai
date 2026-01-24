# OptionsEdge

An AI-powered options trading platform with intelligent analysis and automated trading capabilities.

Built by IAB Advisors, Inc.

## Features

- **Intelligent Options Chain Analysis**: Advanced scoring algorithm based on Greeks, liquidity, spreads, and DTE
- **Stock Watchlist Management**: Track stocks with tags, notes, and real-time price updates
- **Automated Trading System**: Rule-based automation with profit targets, stop losses, and entry/exit criteria
- **Comprehensive Dashboard**: Performance metrics, P/L tracking, and interactive charts
- **Complete Trade History**: Detailed trade logs with filtering and analytics

## Tech Stack

### Backend
- Python 3.11
- Flask
- SQLAlchemy
- PostgreSQL (SQLite for development)
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Chart.js
- React Router

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (optional, SQLite used by default)
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd iab-options-bot
```

2. **Backend Setup**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Initialize database
python app.py
```

3. **Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

4. **Using Docker (Recommended)**
```bash
# Build and start all services
docker-compose up --build

# Backend will be available at http://localhost:5000
# Frontend will be available at http://localhost:4000
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=sqlite:///iab_optionsbot.db
USE_MOCK_DATA=true
```

### Tradier API Integration

To use real market data, configure Tradier API credentials:

```env
TRADIER_API_KEY=your-api-key
TRADIER_API_SECRET=your-api-secret
TRADIER_ACCOUNT_ID=your-account-id
TRADIER_SANDBOX=true
USE_MOCK_DATA=false
```

**Note**: The application uses mock data by default for development. Set `USE_MOCK_DATA=false` to use real Tradier API.

## Usage

1. **Register/Login**: Create an account or login with existing credentials (http://localhost:4000)
2. **Options Analyzer**: Enter a symbol, select expiration, and analyze options chains
3. **Watchlist**: Add stocks to track with tags and notes
4. **Automations**: Create rule-based trading strategies
5. **Dashboard**: View performance metrics and active positions
6. **History**: Review trade history with detailed analytics

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user

### Options
- `POST /api/options/analyze` - Analyze options chain
- `GET /api/options/expirations/:symbol` - Get expiration dates
- `GET /api/options/chain/:symbol/:expiration` - Get options chain
- `GET /api/options/signals/:symbol` - Get AI signals

### Watchlist
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist/add` - Add stock
- `DELETE /api/watchlist/:symbol` - Remove stock
- `PUT /api/watchlist/:symbol/notes` - Update notes

### Trades
- `POST /api/trades/execute` - Execute trade
- `GET /api/trades/history` - Get trade history
- `GET /api/trades/positions` - Get positions

### Automations
- `GET /api/automations` - Get automations
- `POST /api/automations/create` - Create automation
- `PUT /api/automations/:id/toggle` - Toggle automation
- `DELETE /api/automations/:id` - Delete automation

## Options Scoring Algorithm

The options analyzer uses a sophisticated scoring system:

- **Liquidity Score (0-0.3)**: Based on volume and open interest
- **Spread Score (0-0.2)**: Lower spread gets higher score
- **DTE Score (0-0.2)**: Preference-based (income: ~21 days, balanced: ~38 days, growth: up to 60 days)
- **Delta Score (0-0.3)**: Strategy-based target deltas

Total score ranges from 0-1.0, with recommendations categorized as:
- **Aggressive**: Score ≥ 0.7
- **Balanced**: Score 0.5-0.7
- **Conservative**: Score < 0.5

## Development

### Running Tests
```bash
# Backend tests (when implemented)
pytest

# Frontend tests
cd frontend
npm test
```

### Database Migrations
```bash
flask db init
flask db migrate -m "Description"
flask db upgrade
```

## Security

- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention via SQLAlchemy
- CORS configuration for API access

## Deployment

### Production Checklist

1. Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
2. Configure PostgreSQL database
3. Set `USE_MOCK_DATA=false` for real API
4. Configure Tradier API credentials
5. Set `FLASK_ENV=production`
6. Enable HTTPS
7. Configure proper CORS origins
8. Set up logging and monitoring

## Testing & Verification

### Quick Verification (Post-Deployment)

After deploying migration changes, run:

```bash
# Verify deployment succeeded
python scripts/verify_deployment.py

# Test rate limiting
python scripts/test_rate_limiting.py --email your@email.com --password yourpass

# Test debit spreads
python scripts/test_spreads.py --email your@email.com --password yourpass

# Monitor costs
python scripts/monitor_ai_costs.py
```

### Comprehensive Test Suite

Run all tests at once:

```bash
python scripts/run_all_tests.py --email your@email.com --password yourpass
```

### Expected Results

- ✅ Migration creates spreads table (21 columns, 5 indices)
- ✅ Rate limiting enforces 100 analyses/day per user
- ✅ Debit spreads calculate and execute correctly
- ✅ AI costs reduced 97-98% ($375/month → $4-10/month)
- ✅ Cache hit rate >85%

### Troubleshooting

If tests fail, check Railway logs:
```bash
railway logs --follow
```

Look for migration success message:
```
✅ MIGRATION COMPLETED SUCCESSFULLY!
```

## License

This project is proprietary software.

## Support

For issues and questions, please contact the development team.

