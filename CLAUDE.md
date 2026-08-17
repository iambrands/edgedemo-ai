# edgeai-demo — Claude Code Context

## Deployment (HARD CONSTRAINTS)
- Mac Mini ONLY (ZeroTier: 10.58.146.142, user: iabadvisors)
- Screen session: edgeai-demo | Port: 5006
- Start: `cd backend && uvicorn app:app --host 0.0.0.0 --port 5006`
- Migrations: `alembic upgrade head` from backend/
- NEVER generate railway.json or Docker Compose for prod

## Stack (DO NOT SUBSTITUTE)
- FastAPI + uvicorn (Python)
- PostgreSQL via asyncpg + SQLAlchemy async
- Redis for caching
- OpenAI + Anthropic for AI features
- Stripe for billing (financial data — treat as sensitive)
- JWT auth via python-jose

## Architecture
- Backend in `backend/`, frontend built to `frontend/dist/`
- `mock_portal.py`, `analysis_extended.py`, `compliance_dashboard.py` are demo-only — all data is hardcoded mock data, intentionally no auth enforcement
- Auth on real endpoints uses `Depends(get_current_user)` pattern

## Security (REAL FINDING)
- `backend/config.py` line 29: `jwt_secret: str = "change-me-in-production"` — insecure default. JWT_SECRET env var MUST be set before any production deploy. Rotate immediately.
- Verify `JWT_SECRET` is in `.env.beta` before Mac Mini deploy

## Do NOT
- Add Railway config or Docker Compose for production
- Add hardcoded credentials or API keys in source
- Call LLM synchronously without timeout

## Pre-Deploy Checklist
- Always run demo_check.sh before any production push
- demo_check.sh must exit 0 before declaring any task complete
- Confirm JWT_SECRET is set in .env.beta (not the default "change-me-in-production")

## Security Rules
- NEVER return 403 for cross-tenant resource access — always return 404 to avoid IDOR information disclosure
