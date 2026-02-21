# Edge Platform — Third-Party API Integration Map

> This document maps every feature in the Edge platform to the external APIs and data services needed to power it in production. Each section corresponds to a sidebar menu group.

---

## Quick Reference: Core API Providers

| Provider | What It Powers | Pricing Model | Priority |
|----------|---------------|---------------|----------|
| **Tradier** | Stock screener, real-time quotes, trading execution | $0/mo (delayed) or $10/mo (real-time) | **P0 — Critical** |
| **Plaid** | Account aggregation, balances, transactions, investment positions | Per-connection pricing (~$1-3/link) | **P0 — Critical** |
| **OpenAI** | AI chat, analysis, narratives, meeting prep, compliance NLP | Pay-per-token ($0.01-0.03/1K tokens) | **P0 — Critical** |
| **Stripe** | Billing automation, fee collection, invoicing | 2.9% + $0.30 per charge | **P0 — Critical** |
| **SendGrid** | Email delivery (reports, notifications, invites) | Free tier (100/day) or $19.95/mo | **P1 — Important** |
| **Nylas** | Calendar sync, email sync, scheduling | $0.75/account/mo | **P1 — Important** |
| **Stream** | Real-time messaging (advisor-client chat) | Free tier (25 MAU) or $499/mo | **P1 — Important** |
| **Polygon.io** | Historical market data, fundamentals, reference data | $29/mo (starter) or $199/mo (business) | **P1 — Important** |
| **Salesforce / Redtail / Wealthbox** | CRM sync (contacts, activities, pipeline) | Varies by CRM | **P2 — Enhancement** |
| **DocuSign** | E-signatures for account opening, beneficiary changes | $10-25/mo per envelope | **P2 — Enhancement** |
| **Twilio** | SMS notifications, video meeting links | Pay-per-use ($0.0075/SMS) | **P2 — Enhancement** |
| **AWS Textract / Google Document AI** | Statement parsing, PDF extraction | $1.50 per 1K pages | **P2 — Enhancement** |

---

## Dashboard → Overview

| Data Needed | Current State | Production API |
|---|---|---|
| Total AUM, household count, account count | Backend API (mock) | **Plaid** for aggregated account balances; internal DB for household/account counts |
| Active alerts | Backend API (mock) | Internal rules engine processing **Plaid** position data + compliance rules |
| Recent activity | Backend API (mock) | Internal audit log (no external API needed) |

---

## Client Management

### Households & Accounts

| Data Needed | Current State | Production API |
|---|---|---|
| Client account balances, positions, transactions | Backend API (mock) | **Plaid Investments** — pulls holdings, balances, and transactions from 12,000+ institutions |
| Custodian connections | Backend API (mock) | **Plaid Link** for OAuth-based custodian connections; direct APIs for **Schwab**, **Fidelity**, **Pershing** institutional feeds |
| Account types, tax types | Backend API (mock) | Internal DB (populated during onboarding) |

### Bulk Import

| Data Needed | Current State | Production API |
|---|---|---|
| CSV parsing, validation | Client-side parsing | Internal API (no external dependency — CSV parsing is handled server-side) |
| Account creation | Local mock | Internal DB + **Plaid** to verify/link accounts post-import |

### Prospects

| Data Needed | Current State | Production API |
|---|---|---|
| Prospect pipeline, activities, scoring | Backend API (mock) | **Salesforce** / **Redtail** / **Wealthbox** CRM API for two-way sync; internal DB for pipeline |

### CRM

| Data Needed | Current State | Production API |
|---|---|---|
| Contacts, activities, pipeline deals | Local mock | **Salesforce API** (REST, $25/user/mo), **Redtail API** ($99/mo), or **Wealthbox API** ($59/mo) for bidirectional sync |

---

## Investing

### Analysis (Portfolio Analysis)

| Data Needed | Current State | Production API |
|---|---|---|
| Portfolio risk scores, fee analysis, allocation breakdown | Backend API (mock) | **Plaid** for positions → internal analysis engine using **OpenAI** for AI-powered insights |
| Benchmark comparisons | Internal mock | **Polygon.io** or **Tradier** for benchmark index data (S&P 500, AGG, etc.) |

### Stock Screener

| Data Needed | Current State | Production API |
|---|---|---|
| Stock fundamentals (P/E, PEG, earnings growth, D/E, dividend yield, market cap, FCF) | Local `MOCK_STOCKS` array — **currently blank in production** | **Tradier Market Data API** — fundamental data for all US equities |
| Sector/industry classification | Local mock | **Tradier** or **Polygon.io** reference data |
| Real-time/delayed prices | Local mock | **Tradier** (free delayed, $10/mo real-time) or **Polygon.io** ($29/mo) |
| Preset screening criteria | Local constants | Internal logic (no external API) |

**Recommended: Tradier** — Offers fundamentals, quotes, and trading in one API. Free tier available for delayed data.

**Alternative: Polygon.io** — Better historical data and websocket streaming. $29/mo starter.

**Alternative: Financial Modeling Prep (FMP)** — Dedicated stock screener API with 50+ fundamental metrics. $14/mo.

### Model Portfolios

| Data Needed | Current State | Production API |
|---|---|---|
| Model definitions, target allocations | Backend API (mock) | Internal DB (advisor-defined models) |
| Drift detection | Backend API (mock) | Internal engine comparing **Plaid** positions against model targets |
| Marketplace models | Backend API (mock) | **Riskalyze** / **Morningstar** model marketplace APIs (optional) |

### Trading & Rebalancing

| Data Needed | Current State | Production API |
|---|---|---|
| Order placement, execution | Local mock | **Tradier Brokerage API** (commission-free trading) or **Alpaca API** (commission-free) |
| Rebalancing calculations | Local mock | Internal engine using **Plaid** positions and model targets |
| Trade execution history | Local mock | **Tradier** order history or custodian-specific APIs |
| Real-time order status | Local mock | **Tradier** websocket or polling |

**Recommended: Tradier** — $0 commissions, full brokerage API, same provider as screener data. One integration for data + execution.

**Alternative: Alpaca** — Commission-free, modern REST API, good developer experience.

### Tax-Loss Harvesting

| Data Needed | Current State | Production API |
|---|---|---|
| Unrealized gains/losses, cost basis | Backend API (mock) | **Plaid Investments** for cost basis data; custodian feeds for lot-level detail |
| Wash sale detection | Backend API (mock) | Internal rules engine (30-day lookback on **Plaid** transaction data) |
| Replacement security suggestions | Backend API (mock) | Internal logic + **Tradier** for correlated ETF lookup |

### Alternative Assets

| Data Needed | Current State | Production API |
|---|---|---|
| PE fund NAVs, capital calls, distributions | Backend API (mock) | **Addepar API** (enterprise) or **iCapital** / **CAIS** for alts data |
| K-1 document tracking | Backend API (mock) | Internal document management + **DocuSign** for document delivery |
| J-curve, waterfall calculations | Backend API (mock) | Internal calculation engine (no external API) |

### Best Execution

| Data Needed | Current State | Production API |
|---|---|---|
| Trade execution quality, NBBO data | Local mock | **Tradier** execution reports + **SIP/CTA** NBBO feed (via **Polygon.io**) |
| Broker comparison stats | Local mock | Aggregated from **Tradier** / custodian execution data |
| Compliance attestation | Local mock | Internal workflow (no external API) |

---

## Operations

### Reports (Report Builder & Scheduler)

| Data Needed | Current State | Production API |
|---|---|---|
| Portfolio data for reports | Local mock | **Plaid** for position data, internal analysis engine |
| PDF generation | Local mock | **Puppeteer** / **wkhtmltopdf** (self-hosted) or **DocRaptor** ($15/mo) |
| Email delivery (scheduled reports) | Local mock | **SendGrid** ($19.95/mo) or **AWS SES** ($0.10/1K emails) |
| Report scheduling | Local mock | Internal scheduler (cron/Bull queue — no external API) |

### Statements

| Data Needed | Current State | Production API |
|---|---|---|
| PDF/CSV statement parsing | Backend API (mock) | **AWS Textract** ($1.50/1K pages) or **Google Document AI** for OCR/extraction |
| Brokerage format detection | Backend API (mock) | Internal parser library (17+ formats already defined) |

### Billing

| Data Needed | Current State | Production API |
|---|---|---|
| Fee calculation, invoicing | Local mock | **Stripe Billing API** (2.9% + $0.30) — recurring invoices, fee schedules, payment collection |
| AUM-based fee computation | Local mock | Internal engine using **Plaid** account values |
| Payment processing | Local mock | **Stripe** for ACH/card payments |
| Revenue analytics | Local mock | **Stripe** reporting APIs + internal aggregation |

### Meetings

| Data Needed | Current State | Production API |
|---|---|---|
| Calendar availability, booking | Backend API (mock) | **Nylas Calendar API** ($0.75/account/mo) for Google/Outlook calendar sync |
| Video conferencing links | Backend API (mock) | **Zoom API** (free tier) or **Twilio Video** |
| Meeting transcription | Backend API (mock) | **OpenAI Whisper** ($0.006/min) or **Assembly AI** ($0.0125/min) |
| AI meeting prep | Backend API (mock) | **OpenAI** GPT-4 for generating talking points from portfolio data |

### Liquidity

| Data Needed | Current State | Production API |
|---|---|---|
| Withdrawal projections, RMD calculations | Backend API (mock) | Internal calculation engine (IRS RMD tables built-in) |
| Cash flow analysis | Backend API (mock) | **Plaid** transaction data + internal projection models |

### Custodians

| Data Needed | Current State | Production API |
|---|---|---|
| Custodian OAuth connections | Backend API (mock) | **Plaid Link** for consumer accounts; **Schwab OpenAPI** / **Fidelity WealthScape** / **Pershing NetX360** for institutional feeds |
| Position/transaction sync | Backend API (mock) | **Plaid Investments** or direct custodian APIs |
| Multi-custodian aggregation | Backend API (mock) | **Plaid** unified data model across custodians |

---

## Compliance

### Compliance Dashboard & Documents

| Data Needed | Current State | Production API |
|---|---|---|
| Compliance scoring, alert generation | Backend API (mock) | Internal rules engine + **OpenAI** for NLP-based compliance review |
| ADV Part 2B / Form CRS generation | Backend API (mock) | Internal templates + **OpenAI** for content generation |
| Audit trail | Backend API (mock) | Internal database (no external API — all actions logged) |
| SEC/FINRA regulatory data | Backend API (mock) | **SEC EDGAR API** (free) for filing data; **FINRA BrokerCheck API** (free) for advisor verification |

### Workflow Templates

| Data Needed | Current State | Production API |
|---|---|---|
| Task management, workflow tracking | Local mock | Internal workflow engine (no external API) |
| E-signature for account opening docs | Not yet implemented | **DocuSign** ($10-25/envelope) or **HelloSign** ($15/mo) |

---

## Communication

### Messages (Secure Messaging)

| Data Needed | Current State | Production API |
|---|---|---|
| Real-time messaging, thread management | Local mock | **Stream Chat API** (free tier 25 MAU, $499/mo business) — real-time, encrypted, HIPAA-eligible |
| Push notifications | Not yet implemented | **Firebase Cloud Messaging** (free) or **OneSignal** (free tier) |
| Message archiving (compliance) | Local mock | **Stream** exports + internal archive DB |

**Alternative: Twilio Conversations** — $0.05/active user/mo. Good if already using Twilio for SMS/video.

### Conversations (Intelligence)

| Data Needed | Current State | Production API |
|---|---|---|
| Conversation analysis, sentiment | Backend API (mock) | **OpenAI** for sentiment analysis and compliance flag detection |
| Transcription | Backend API (mock) | **OpenAI Whisper** or **Assembly AI** for audio transcription |
| Compliance flag detection | Backend API (mock) | **OpenAI** NLP + internal compliance rules |

---

## AI Features (Floating Chat Widget + Chat Page)

| Data Needed | Current State | Production API |
|---|---|---|
| Natural language Q&A over portfolio data | Backend API (mock) | **OpenAI GPT-4** with RAG (Retrieval Augmented Generation) over client data |
| Meeting prep generation | Backend service (mock) | **OpenAI** + internal client data context |
| Client narrative generation | Backend service (mock) | **OpenAI** with portfolio performance data |
| Behavioral intelligence | Backend service (mock) | **OpenAI** + internal behavioral models |

---

## Client Portal (All Portal Pages)

| Feature | Production API |
|---|---|
| Dashboard, Performance, Allocation | **Plaid Investments** for positions/balances → internal calculation |
| Goals & What-If Scenarios | Internal projection engine (Monte Carlo, linear) — no external API |
| Tax Center | **Plaid** for cost basis data; internal tax-lot engine |
| Documents | Internal document store (S3/GCS) + **SendGrid** for delivery |
| Meetings & Scheduling | **Nylas** calendar sync + **Zoom** video links |
| Requests (Withdrawals, Transfers) | Internal workflow → custodian APIs for execution |
| Notifications | **Firebase Cloud Messaging** or **OneSignal** |
| Beneficiaries | Internal DB + **DocuSign** for beneficiary change forms |
| Family Dashboard | Internal DB aggregating **Plaid** data across household members |
| AI Assistant | **OpenAI** GPT-4 (client-facing, guardrailed) |
| Secure Messages | **Stream Chat** (same instance as advisor side) |

---

## Recommended Implementation Order

### Phase 1: Core Data (Weeks 1-4)
1. **Tradier** — Stock screener + market data + trading execution
2. **Plaid** — Account aggregation, positions, balances, transactions
3. **OpenAI** — AI chat, analysis, narratives (already partially integrated)
4. **Stripe** — Billing and fee collection

### Phase 2: Communication (Weeks 5-8)
5. **SendGrid** — Email delivery for reports, notifications, invites
6. **Nylas** — Calendar sync for meeting scheduling
7. **Stream** — Real-time secure messaging

### Phase 3: Advanced (Weeks 9-12)
8. **DocuSign** — E-signatures for account opening, beneficiary changes
9. **Polygon.io** — Enhanced market data, benchmarks, historical data
10. **AWS Textract** — Statement PDF parsing

### Phase 4: CRM & Enterprise (Weeks 13+)
11. **Salesforce / Redtail / Wealthbox** — CRM bidirectional sync
12. **Zoom / Twilio** — Video conferencing integration
13. **Assembly AI / Whisper** — Meeting transcription

---

## Estimated Monthly API Costs (Per 100 Advisor Practice)

| Provider | Est. Monthly Cost | Notes |
|----------|------------------|-------|
| Tradier | $10-50 | Real-time data + trading |
| Plaid | $300-900 | ~300-900 linked accounts |
| OpenAI | $50-200 | ~50K-200K tokens/day |
| Stripe | $50-150 | 2.9% on ~$5K billing |
| SendGrid | $20 | Starter plan |
| Nylas | $75-225 | 100-300 calendar accounts |
| Stream | $499 | Business plan |
| **Total** | **~$1,000-2,050/mo** | Scales with usage |

At $299/mo per advisor, a 100-advisor practice generates $29,900/mo in revenue against ~$2,000/mo in API costs — **93% gross margin**.

---

*Document Version: 1.0*
*Last Updated: February 2026*
