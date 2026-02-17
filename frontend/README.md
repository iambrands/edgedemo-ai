# Edge Frontend

## Structure

- **`index.html`** — Legacy portfolio analysis wizard (served by backend at http://localhost:8000)
- **`dashboard/`** — New professional dashboard (React + Vite)

## Development

1. **Start the backend** (terminal 1):
   ```bash
   cd .. && uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the dashboard** (terminal 2):
   ```bash
   cd dashboard && npm run dev
   ```

3. Open **http://localhost:5173** for the new dashboard, or **http://localhost:8000** for the legacy portfolio wizard.

The Vite dev server proxies `/api` requests to the backend on port 8000.

## Build (Dashboard)

```bash
cd dashboard && npm run build
```

Output is in `dashboard/dist/`.

## Dashboard Routes

| Path | Page |
|------|------|
| `/dashboard` | Dashboard (home) |
| `/households` | Households list |
| `/accounts` | Accounts list |
| `/statements` | Statement upload |
| `/analysis/portfolio` | Portfolio analysis |
| `/analysis/fees` | Fee analysis |
| `/analysis/tax` | Tax optimization |
| `/analysis/risk` | Risk analysis |
| `/planning/etf-builder` | ETF portfolio builder |
| `/planning/ips` | IPS generator |
| `/planning/rebalance` | Rebalancing center |
| `/compliance` | Compliance dashboard |
| `/chat` | AI chat |
| `/settings` | Settings |
