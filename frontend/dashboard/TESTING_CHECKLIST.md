# Edge Dashboard — Full Local Integration Testing Checklist

## Prerequisites

1. **Backend** running at `http://localhost:8000`:
   ```bash
   cd backend && uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend** running at `http://localhost:5173`:
   ```bash
   cd frontend/dashboard && npm run dev
   ```

3. **Environment**: `.env` with `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (optional)

## API Health

- [ ] `GET /api/health` returns `{ "status": "healthy", ... }`
- [ ] CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`

## Pages & Features

### Dashboard (`/` or `/dashboard`)

- [ ] Loads without error
- [ ] Shows metric cards (AUM, Households, Accounts, Compliance)
- [ ] Performance chart renders and period buttons (1M, 3M, etc.) work
- [ ] Recent Activity list displays
- [ ] Alerts & Actions with links
- [ ] Market Summary (SPY, QQQ, etc.)
- [ ] Loading spinner while fetching
- [ ] Error state with retry if API fails

### Households (`/households`)

- [ ] Household list loads from API
- [ ] Search filters households
- [ ] "View" links to household detail
- [ ] Empty state when no results
- [ ] Loading and error states

### Household Detail (`/households/:id`)

- [ ] Loads household by ID
- [ ] Shows clients and accounts
- [ ] Links to account detail
- [ ] Back to Households works

### Accounts (`/accounts`)

- [ ] Account list loads from API
- [ ] Table shows account, type, custodian, value, status
- [ ] Links to account detail
- [ ] Empty state when no accounts

### Account Detail (`/accounts/:id`)

- [ ] Loads account by ID
- [ ] Shows positions table
- [ ] Back to Accounts works

### Statements (`/statements`)

- [ ] Drag & drop zone visible
- [ ] File upload (CSV/XLSX) works and shows parsed holdings
- [ ] Recent uploads list updates
- [ ] Error handling for invalid files

### Portfolio Analysis (`/analysis/portfolio`)

- [ ] Page loads
- [ ] "Open Portfolio Analysis Wizard" links to legacy report

### Fee Analysis (`/analysis/fees`)

- [ ] Account selector populates from API
- [ ] Fee metrics load when account selected
- [ ] Loading and error states

### Tax Optimization (`/analysis/tax`)

- [ ] Household selector populates
- [ ] Tax report loads (savings, TLH opportunities, asset location)
- [ ] Loading and error states

### Risk Analysis (`/analysis/risk`)

- [ ] Household selector populates
- [ ] Risk metrics and concentration risks load
- [ ] Loading and error states

### ETF Portfolio Builder (`/planning/etf-builder`)

- [ ] Multi-step wizard UI
- [ ] Build Portfolio calls API and shows holdings
- [ ] Allocation breakdown displays

### IPS Generator (`/planning/ips`)

- [ ] Household selector populates
- [ ] Generate IPS calls API
- [ ] IPS preview (executive summary) displays

### Rebalancing (`/planning/rebalance`)

- [ ] Account selector populates
- [ ] Generate Rebalance Plan calls API
- [ ] Trades table displays when plan returned

### Compliance (`/compliance`)

- [ ] Compliance dashboard loads
- [ ] Metric cards (Total Checks, Passed, Warnings, Failed)
- [ ] Pending Reviews table
- [ ] Recent Audit Log table
- [ ] Loading and error states

### AI Chat (`/chat`)

- [ ] Chat UI loads
- [ ] Send message calls API and displays response
- [ ] Quick action buttons populate input
- [ ] Loading indicator while waiting for response
- [ ] Error handling for API failures

### Settings (`/settings`)

- [ ] Page loads

## Navigation

- [ ] Sidebar links navigate correctly
- [ ] Header and footer render
- [ ] 404 redirects to `/dashboard`

## Common Components

- [ ] `LoadingSpinner` shows during API calls
- [ ] `ErrorDisplay` shows with retry on API errors
- [ ] `EmptyState` shows when no data
- [ ] `MetricCard` displays with icons and change indicators

## End-to-End Flow

1. Start backend and frontend
2. Visit `http://localhost:5173`
3. Confirm Dashboard loads with data
4. Navigate to Households → click View on a household
5. From household detail, click an account link
6. Navigate to Compliance, verify dashboard loads
7. Go to Chat, send a message, verify response
8. Go to ETF Builder, complete flow and build portfolio
9. Go to IPS Generator, generate IPS for a household
