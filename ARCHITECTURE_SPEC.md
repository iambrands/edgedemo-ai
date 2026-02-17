# Edge RIA Platform — Architecture & Development Spec

## Platform Vision

**IAB Advisors** — AI-powered RIA platform beyond Betterment/Wealthfront/Schwab:

1. **Multi-custodian household aggregation**
2. **AI/ML compliance validation** (FINRA 2111, 2330, SEC Reg BI)
3. **Behavioral intelligence coaching**
4. **Statement parsing from any custodian**
5. **B2B white-label + B2C direct**

---

## Three-Model AI Pipeline

### IIM — Investment Intelligence Model
- Household consolidation, fee impact, concentration risk
- Tax-aware rebalancing, cash flow analysis
- Share class evaluation, performance attribution
- Withdrawal strategy, income projection

### CIM — Compliance Investment Model
- Household suitability, VA suitability (FINRA 2330)
- Reg BI compliance, objective reconciliation
- Fee reasonableness, concentration limits
- Audit trail, complaint detection, annual review generation

### BIM — Behavioral Intelligence Model
- Client profile, cash flow coaching
- Risk communication, market context
- Action plan, milestone tracking
- Nudge engine, meeting prep, quarterly reports

---

## Stack

- **Backend:** Python/FastAPI (adapted from Flask spec)
- **ORM:** SQLAlchemy
- **DB:** PostgreSQL
- **Cache:** Redis
- **AI:** Anthropic Claude, OpenAI fallback
- **Deploy:** Railway / GCP Cloud Run

---

## Development Phases

| Phase | Focus |
|-------|-------|
| 1 | DB schema, statement upload, NW Mutual parsers, IIM consolidation |
| 2 | Full IIM/CIM/BIM pipeline, AI orchestrator, Robinhood/ETrade parsers |
| 3 | B2C onboarding, Stripe billing, mobile UI |
| 4 | B2B multi-tenant, advisor dashboard, white-label |
| 5 | Optimization engine, anomaly detection, custodian APIs |

---

*Full spec in project docs. This file is the canonical architecture reference.*
