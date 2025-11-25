# IAB OptionsBot API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication via JWT token.

Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "default_strategy": "income|balanced|growth" (optional),
  "risk_tolerance": "low|moderate|high" (optional)
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

### Get Current User
```http
GET /api/auth/user
Authorization: Bearer <token>
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

---

## Options Endpoints

### Analyze Options Chain
```http
POST /api/options/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "expiration": "2024-01-19",
  "preference": "income|balanced|growth"
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "expiration": "2024-01-19",
  "preference": "balanced",
  "options": [
    {
      "option_symbol": "AAPL240119C00150000",
      "description": "AAPL 2024-01-19 150 Call",
      "contract_type": "call",
      "strike": 150,
      "expiration_date": "2024-01-19",
      "last_price": 5.50,
      "bid": 5.45,
      "ask": 5.55,
      "mid_price": 5.50,
      "spread_percent": 1.82,
      "volume": 1250,
      "open_interest": 5000,
      "delta": 0.5234,
      "gamma": 0.0123,
      "theta": -0.0234,
      "vega": 0.0456,
      "implied_volatility": 0.25,
      "days_to_expiration": 38,
      "score": 0.7234,
      "category": "Balanced",
      "explanation": "This option shows good potential...",
      "stock_price": 148.50
    }
  ],
  "count": 50
}
```

### Get Expiration Dates
```http
GET /api/options/expirations/AAPL
Authorization: Bearer <token>
```

### Get Options Chain
```http
GET /api/options/chain/AAPL/2024-01-19
Authorization: Bearer <token>
```

### Get AI Signals
```http
GET /api/options/signals/AAPL?preference=balanced
Authorization: Bearer <token>
```

---

## Watchlist Endpoints

### Get Watchlist
```http
GET /api/watchlist
Authorization: Bearer <token>
```

### Add Stock to Watchlist
```http
POST /api/watchlist/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "tags": ["Tech", "Momentum"],
  "notes": "Strong earnings expected"
}
```

### Remove Stock from Watchlist
```http
DELETE /api/watchlist/AAPL
Authorization: Bearer <token>
```

### Update Stock Notes
```http
PUT /api/watchlist/AAPL/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Updated notes"
}
```

### Update Stock Tags
```http
PUT /api/watchlist/AAPL/tags
Authorization: Bearer <token>
Content-Type: application/json

{
  "tags": ["Tech", "Growth"]
}
```

### Refresh Watchlist Prices
```http
POST /api/watchlist/refresh
Authorization: Bearer <token>
```

---

## Trading Endpoints

### Execute Trade
```http
POST /api/trades/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "action": "buy|sell",
  "quantity": 1,
  "option_symbol": "AAPL240119C00150000" (optional),
  "strike": 150 (optional),
  "expiration_date": "2024-01-19" (optional),
  "contract_type": "call|put" (optional),
  "price": 5.50 (optional),
  "strategy_source": "manual|automation|signal",
  "automation_id": 1 (optional),
  "notes": "Trade notes" (optional)
}
```

### Get Trade History
```http
GET /api/trades/history?symbol=AAPL&start_date=2024-01-01&end_date=2024-01-31&strategy_source=manual
Authorization: Bearer <token>
```

### Get Positions
```http
GET /api/trades/positions
Authorization: Bearer <token>
```

### Close Position
```http
POST /api/trades/positions/1/close
Authorization: Bearer <token>
Content-Type: application/json

{
  "exit_price": 5.75 (optional)
}
```

---

## Automation Endpoints

### Get Automations
```http
GET /api/automations
Authorization: Bearer <token>
```

### Create Automation
```http
POST /api/automations/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "AAPL Covered Calls",
  "description": "Weekly covered calls on AAPL",
  "symbol": "AAPL",
  "strategy_type": "covered_call",
  "target_delta": 0.35,
  "min_delta": 0.30,
  "max_delta": 0.40,
  "preferred_dte": 7,
  "min_dte": 5,
  "max_dte": 14,
  "entry_condition": "iv_rank_above",
  "entry_value": 50,
  "min_volume": 20,
  "min_open_interest": 100,
  "max_spread_percent": 10.0,
  "profit_target_percent": 50.0,
  "stop_loss_percent": 25.0,
  "max_days_to_hold": 14,
  "exit_at_profit_target": true,
  "exit_at_stop_loss": true,
  "exit_at_max_days": true,
  "is_active": true,
  "is_paused": false
}
```

### Update Automation
```http
PUT /api/automations/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated name",
  "is_active": true,
  "is_paused": false
}
```

### Toggle Automation
```http
PUT /api/automations/1/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "pause|resume|activate|deactivate|toggle"
}
```

### Delete Automation
```http
DELETE /api/automations/1
Authorization: Bearer <token>
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Health Check

```http
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "service": "IAB OptionsBot"
}
```

