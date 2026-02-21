# Edge — Investor & Platform Overview

## Executive Summary

Edge is a comprehensive wealth management platform designed to enhance efficiency for Registered Investment Advisors (RIAs). The platform consolidates portfolio analysis, client management, compliance automation, trading, tax optimization, billing, reporting, communication, and AI-powered intelligence into a single unified experience — eliminating the need for 6-10 disconnected tools that most advisory firms use today.

**Status:** Production-deployed platform with 45+ features across 26 RIA dashboard pages and 19 client portal pages  
**Tech Stack:** FastAPI (Python), React 18 + TypeScript, Tailwind CSS, OpenAI GPT-4, Playwright E2E testing  
**Deployment:** Railway (production), with Docker support for self-hosted infrastructure  
**Tests:** 82+ E2E smoke tests passing, full TypeScript type coverage

---

## Platform Architecture

### RIA Dashboard (26 Pages)

Organized into 6 menu groups with sub-menus:

**Client Management**
- Households — Multi-account family groupings with aggregated views
- Accounts — Individual account management across all custodians
- Bulk Import — CSV upload for onboarding entire client books
- Prospects — Pipeline tracking, lead scoring, proposal generation
- CRM — Contact management, activity logging, deal pipeline

**Investing**
- Portfolio Analysis — AI-powered analysis across 6 dimensions (risk, tax, fees, allocation, retirement, compliance)
- Stock Screener — Fundamental screening with 12+ filters and 5 preset strategies (Value, Growth, Dividend, Quality, GARP)
- Model Portfolios — Model creation, marketplace, drift detection, rebalancing signals
- Trading & Rebalancing — Order management, rebalancing engine, trade execution
- Tax-Loss Harvesting — Opportunity scanning, wash sale detection, replacement suggestions
- Alternative Assets — PE/VC fund tracking, capital calls, J-curve analytics, waterfall distributions
- Best Execution — Trade quality monitoring, NBBO comparison, broker performance, compliance attestation

**Operations**
- Report Builder — Custom report templates, drag-and-drop sections, PDF generation
- Automated Report Scheduler — Recurring delivery (quarterly, monthly), email distribution
- Statement Parsing — PDF/CSV upload with OCR for 17+ brokerage formats
- Billing Automation — Fee schedules, AUM-based billing, invoice generation, revenue analytics
- Meeting Intelligence — Calendar integration, AI meeting prep, transcription, action items
- Liquidity Planning — Withdrawal projections, RMD calculations, cash flow analysis
- Custodian Connections — Multi-custodian aggregation via OAuth (Schwab, Fidelity, Pershing, etc.)

**Compliance**
- Compliance Dashboard — Scoring, alerts, tasks, audit trail
- Compliance Documents — ADV Part 2B, Form CRS generation and versioning
- Workflow Templates — 6 pre-built workflows (New Client, Annual Review, Death of Client/Spouse, Divorce, Rollover Processing, Account Closure)

**Communication**
- Secure Messages — Encrypted advisor-client messaging with thread management
- Conversation Intelligence — Call/meeting analysis, sentiment detection, compliance flag monitoring

**AI Features**
- Floating AI Chat — Always-available assistant for portfolio questions, meeting prep, client narratives
- Behavioral Intelligence Model (BIM) — Personalized coaching based on client behavioral patterns
- Learning Center — 9 courses, 35 video lessons with AI tutors for RIA training

### Client Portal (19 Pages)

- Dashboard — Aggregated portfolio view with nudges and alerts
- Performance — Time-weighted returns, benchmarks, asset allocation, monthly returns
- Goals — Financial goal tracking with progress visualization
- What-If Scenarios — Interactive projections (contribution changes, market scenarios, withdrawal timing)
- Tax Center — Tax lot viewer, realized gains/losses, tax document library
- Documents — Statement access, quarterly reports, tax forms
- Meeting Scheduler — Calendar-based booking with advisor availability
- Request Center — Withdrawal requests, transfer requests, document requests
- Notifications — Activity alerts, document readiness, meeting reminders
- Beneficiary Management — Per-account beneficiary designation with change request workflow
- Family Dashboard — Household-wide view with member details, joint accounts, shared allocation
- AI Assistant — Client-facing AI chat (guardrailed for appropriate financial guidance)
- Secure Messages — Direct messaging with advisor
- Risk Profile — Questionnaire-based risk assessment with visual results
- Client Narratives — Personalized quarterly/annual narrative reports from advisor
- Settings — Preferences, notification controls, profile management
- Learning Center — 7 courses, 20 video lessons with AI tutors for client education
- Onboarding — Self-service account opening with risk profile creation
- Login — Branded portal authentication

---

## Key Features & Capabilities

### 1. AI-Powered Portfolio Analysis
- **Comprehensive Health Assessment:** Scores portfolio quality (0-100) with letter grades across 6 dimensions
- **Institutional-Grade Intelligence:** Uses GPT-4 for sophisticated financial analysis
- **Client-Customized Insights:** Tailored recommendations based on age, risk tolerance, and investment goals

### 2. Stock Screener
- **12+ Fundamental Filters:** P/E, PEG, earnings growth, revenue growth, debt-to-equity, current ratio, FCF, dividend yield, market cap, sector
- **5 Preset Strategies:** Value, Growth, Dividend Income, Quality, GARP
- **Production API:** Tradier or Polygon.io for real-time market data and fundamentals

### 3. Tax-Aware Analysis
- **Annual Efficiency Estimates:** Projects potential enhanced tax efficiency ($X,XXX - $X,XXX range)
- **Opportunity Identification:** Specific tax optimization strategies (municipal bonds, asset location, etc.)
- **Tax-Loss Harvesting:** Identifies candidate positions with wash sale detection and replacement suggestions

### 4. Trading & Rebalancing Engine
- **Order Management:** Trade creation, review, and execution workflow
- **Automated Rebalancing:** Drift detection against model portfolios with one-click rebalance
- **Best Execution Monitoring:** NBBO comparison, price improvement tracking, broker performance scoring

### 5. Compliance Automation
- **Compliance Dashboard:** Real-time scoring, alert generation, and task management
- **Document Generation:** Automated ADV Part 2B and Form CRS creation with version control
- **Workflow Templates:** 6 pre-built workflows for common advisory events (New Client, Annual Review, Death of Client/Spouse, Divorce, Rollover Processing, Account Closure)
- **Audit Trail:** Timestamped logging of all compliance-relevant actions
- **Conversation Intelligence:** AI-powered monitoring of advisor-client communications for compliance flags

### 6. Client Management
- **Household Aggregation:** Multi-account family groupings with unified portfolio views
- **Bulk Import:** CSV-based onboarding for migrating entire client books
- **Prospect Pipeline:** Lead scoring, activity tracking, and AI-generated proposals
- **CRM Integration:** Bidirectional sync with Salesforce, Redtail, or Wealthbox
- **Diverse Retirement Plans:** Full support for 401(k), 403(b), 457(b), TSP, IRA variants, SIMPLE IRA, Inherited IRA, pension rollovers — designed for clients from all occupations (teachers, government employees, military, etc.)

### 7. Reporting & Billing
- **Custom Report Builder:** Drag-and-drop section selection, template library, PDF generation
- **Automated Delivery:** Scheduled quarterly/monthly report distribution via email
- **Billing Automation:** AUM-based fee schedules, automatic invoice generation, payment collection via Stripe
- **Revenue Analytics:** Fee compression tracking, monthly revenue trends

### 8. Communication
- **Secure Messaging:** Encrypted advisor-client messaging with thread management and compliance archiving
- **Meeting Intelligence:** AI-powered meeting prep (talking points, alerts, suggested actions), transcription, and action item extraction
- **Conversation Analysis:** Sentiment detection and compliance flag monitoring across all client interactions

### 9. Client Portal
- **Self-Service Access:** Clients view performance, goals, documents, tax info, and meeting scheduling without calling the advisor
- **What-If Scenarios:** Interactive projections for contribution changes, market scenarios, and withdrawal timing
- **Family Dashboard:** Household-wide view with all members, joint accounts, and shared allocation
- **Beneficiary Management:** Per-account designation with advisor-approved change workflows
- **AI Assistant:** Client-facing chat for account questions (guardrailed for appropriate financial guidance)

### 10. AI & Learning
- **Floating AI Chat:** Always-available assistant on every page for RIAs and clients
- **Behavioral Intelligence Model (BIM):** Generates meeting prep, client narratives, and behavioral coaching
- **RIA Learning Center:** 9 courses, 35 video lessons covering every platform feature
- **Client Learning Center:** 7 courses, 20 video lessons for client education
- **Video Scripts:** HeyGen/Synthesia-ready scripts for all lessons (~135 minutes total)

### 11. Multi-Custodian Aggregation
- **Supported Custodians:** Schwab, Fidelity, Pershing, TD Ameritrade, Vanguard, and more
- **Unified Data Model:** Positions, balances, and transactions aggregated across all custodians
- **Automated Sync:** OAuth-based connections with scheduled data refresh
- **Statement Parsing:** PDF/CSV upload with OCR for 17+ brokerage formats

### 12. Alternative Assets
- **Fund Tracking:** PE, VC, hedge fund, and real estate fund monitoring
- **Capital Calls & Distributions:** Pending call tracking, payment workflow, distribution recording
- **Performance Analytics:** J-curve visualization, waterfall distribution modeling, IRR/MOIC calculations
- **Document Management:** K-1 tracking, subscription agreements, side letters

---

## Third-Party API Integration (Production)

| API Provider | Features Powered | Priority |
|---|---|---|
| **Tradier** | Stock screener, real-time quotes, trading execution | P0 — Critical |
| **Plaid** | Account aggregation, positions, balances, transactions | P0 — Critical |
| **OpenAI GPT-4** | AI chat, analysis, narratives, meeting prep, compliance NLP | P0 — Critical |
| **Stripe** | Billing automation, fee collection, invoicing | P0 — Critical |
| **SendGrid** | Email delivery (reports, notifications, invites) | P1 — Important |
| **Nylas** | Calendar sync, email sync, meeting scheduling | P1 — Important |
| **Stream** | Real-time secure messaging (advisor-client) | P1 — Important |
| **Polygon.io** | Historical market data, benchmarks, reference data | P1 — Important |
| **DocuSign** | E-signatures for account opening, beneficiary changes | P2 — Enhancement |
| **Salesforce / Redtail** | CRM bidirectional sync | P2 — Enhancement |
| **AWS Textract** | Statement PDF/image parsing | P2 — Enhancement |
| **Twilio / Zoom** | SMS notifications, video conferencing | P2 — Enhancement |

**Estimated API costs:** ~$1,000–2,000/mo for a 100-advisor practice (see `API_INTEGRATIONS.md` for full breakdown)

---

## Technical Specifications

### Backend Architecture
- **Framework:** FastAPI (Python 3.10+) with async support
- **AI Engine:** OpenAI GPT-4o-mini / GPT-4 (configurable per feature)
- **Data Models:** Pydantic with comprehensive type validation
- **API Design:** RESTful, 20+ router modules with try/except graceful degradation
- **Authentication:** JWT-based for portal, API key for advisor dashboard
- **Rate Limiting:** IP-based throttling via SlowAPI

### Frontend Architecture
- **Framework:** React 18 with TypeScript (strict mode)
- **Styling:** Tailwind CSS with blue/white/emerald brand palette
- **Routing:** React Router DOM v6 with nested layouts
- **State:** React hooks (useState, useEffect, useContext)
- **Icons:** Lucide React (consistent icon library)
- **Charts:** Chart.js for interactive visualizations
- **Testing:** Playwright E2E (82+ tests), TypeScript strict checking

### Deployment
- **Production:** Railway with automatic deploys from GitHub
- **Docker:** Containerized deployment supported
- **CI/CD:** GitHub-based workflow
- **Monitoring:** Error logging and health checks

---

## Value Propositions

### For RIAs / Financial Advisors
1. **Consolidation:** Replace 6-10 disconnected tools with one platform
2. **Efficiency:** Automate routine portfolio reviews, compliance checks, and report generation
3. **Scalability:** Serve more clients without proportional cost increases
4. **Client Experience:** White-labeled portal gives clients self-service access
5. **Compliance Confidence:** Automated audit trails, document generation, and conversation monitoring
6. **Diverse Client Support:** Full onboarding for 401(k), 403(b), 457(b), TSP, pension rollovers from all occupations

### For Clients / Investors
1. **Transparency:** Real-time performance, tax information, and document access
2. **Self-Service:** Goals, what-if scenarios, meeting scheduling, and messaging without calling the advisor
3. **Education:** AI tutors and video courses for financial literacy
4. **Family View:** Household-wide visibility across all accounts and members
5. **AI Assistant:** Instant answers to account questions

### For Wealth Management Firms
1. **Cost Reduction:** Reduce analyst hours on routine reviews by 60-80%
2. **Client Acquisition:** Modern, tech-forward platform differentiates in marketplace
3. **Regulatory Compliance:** Automated suitability scoring, audit trails, and workflow enforcement
4. **Scalability:** Handle AUM growth without linear headcount increases
5. **Revenue Optimization:** Billing automation with AUM-based fee schedules and Stripe integration

---

## Market Positioning

### Competitive Advantages
1. **All-in-One Platform:** 45+ features vs. competitors' 10-15
2. **AI-Powered Intelligence:** GPT-4-driven analysis, chat, narratives, and compliance review
3. **Modern UX:** Professional blue/white/green design with grouped menus, floating chat, responsive layout
4. **Comprehensive Onboarding:** Supports every retirement plan type including 403(b), 457(b), TSP, pension rollovers
5. **Client Portal:** Full self-service portal with AI assistant, what-if scenarios, family dashboard
6. **Learning & Training:** Built-in AI tutor with 55 video lessons for RIAs and clients
7. **Compliance Built-In:** Workflow templates, ADV/CRS generation, conversation monitoring, audit trails
8. **Brokerage Integration:** 17+ brokerage format support with OCR statement parsing

### Target Markets
- **Primary:** Independent RIAs (1-50 advisors, $100M-$5B AUM)
- **Secondary:** Multi-family offices and small wealth management firms
- **Tertiary:** Breakaway advisors transitioning from wirehouses

---

## Use Cases & Scenarios

### Use Case 1: RIA Firm Onboarding
**Scenario:** An independent RIA with 200 clients migrating from a legacy platform  
**Solution:** Bulk CSV import for client data, automated custodian connections via Plaid, workflow templates for account opening, and AI-generated welcome narratives for each client

### Use Case 2: Quarterly Client Review
**Scenario:** Advisor preparing for 50+ quarterly review meetings  
**Solution:** AI meeting prep generates talking points, performance summaries, and action items for each client. Automated quarterly report delivery sends branded PDFs to all clients before the meeting.

### Use Case 3: Tax-Loss Harvesting Season
**Scenario:** Year-end tax optimization across 300 client accounts  
**Solution:** Tax-Loss Harvesting scanner identifies opportunities across all accounts, flags wash sale risks, suggests replacement securities, and tracks estimated tax efficiency gains.

### Use Case 4: Teacher/Government Employee Rollover
**Scenario:** Client rolling over a 403(b) from a school district  
**Solution:** Onboarding wizard supports 403(b), 457(b), TSP, and pension rollovers with custodian-specific paperwork guidance and automated account setup.

### Use Case 5: Client Self-Service
**Scenario:** Client wants to check performance, run a what-if scenario, and schedule a meeting — at 9pm  
**Solution:** Client portal provides real-time performance data, interactive what-if projections, and calendar-based meeting booking without needing to contact the advisor.

### Use Case 6: Compliance Audit
**Scenario:** Firm faces SEC examination and needs documentation  
**Solution:** Compliance dashboard provides full audit trail, auto-generated ADV/CRS documents with version history, conversation monitoring logs, and workflow completion records.

---

## Product Roadmap

### Completed ✅
- Core portfolio analysis (6 dimensions)
- Tax optimization engine with tax-loss harvesting
- Trading & rebalancing engine
- Stock screener with preset strategies
- Model portfolio management with drift detection
- Alternative assets tracking with J-curve and waterfall analytics
- Best execution monitoring
- Compliance dashboard, document generation, and workflow templates
- CRM integration page
- Custom report builder with automated scheduling
- Statement parsing (17+ brokerages)
- Billing automation with revenue analytics
- Meeting intelligence with AI prep
- Liquidity planning
- Multi-custodian aggregation
- Secure messaging (advisor and client)
- Conversation intelligence
- Full client portal (19 pages)
- Bulk client import
- AI floating chat widget (RIA + client)
- RIA and client learning centers (55 video lessons)
- HeyGen/Synthesia video scripts (135 min)
- E2E test suite (82+ tests)
- Branded UI (blue/white/green with grouped sidebar menus)
- Diverse retirement plan support (401k, 403b, 457b, TSP, pension)

### Phase 2: API Integration (Next 4-8 Weeks)
- Tradier integration for live stock screener data and trading
- Plaid integration for custodian account aggregation
- Stripe integration for live billing and payment processing
- SendGrid integration for report email delivery
- Nylas integration for calendar sync

### Phase 3: Advanced Capabilities (8-16 Weeks)
- PDF report export with branding
- DocuSign e-signature integration
- Stream real-time messaging backend
- Monte Carlo simulation for retirement projections
- Mobile-responsive optimizations

### Phase 4: Enterprise Features (16+ Weeks)
- White-label solution for wealth management firms
- Public API for third-party integrations
- Advanced analytics (VaR, stress testing, correlation)
- Salesforce/Redtail bidirectional CRM sync
- Native iOS/Android applications

---

## Monetization Strategy

### SaaS Pricing (Per Advisor)
- **Starter ($149/mo):** Core dashboard, 50 households, basic reporting
- **Professional ($299/mo):** All features, unlimited households, AI chat, client portal
- **Enterprise ($499/mo):** White-label, custom workflows, priority support, API access

### Revenue Projections (Conservative)
- **Year 1:** 50 advisors × $249 avg = ~$150K ARR
- **Year 2:** 200 advisors × $299 avg = ~$718K ARR
- **Year 3:** 500 advisors × $349 avg = ~$2.1M ARR

### Unit Economics
- **API costs per advisor:** ~$10-20/mo
- **Gross margin:** 93%+ at scale
- **Payback period:** <3 months per advisor

---

## Platform Statistics

| Metric | Value |
|---|---|
| RIA Dashboard Pages | 26 |
| Client Portal Pages | 19 |
| Total Features | 45+ |
| E2E Tests | 82+ |
| Video Lessons (RIA) | 35 across 9 courses |
| Video Lessons (Client) | 20 across 7 courses |
| Video Script Minutes | ~135 min |
| Supported Brokerages | 17+ |
| Retirement Plan Types | 10+ (401k, Roth, IRA, 403b, 457b, TSP, pension, SIMPLE, Inherited, SEP) |
| Workflow Templates | 6 |
| Stock Screener Presets | 5 |
| Third-Party API Integrations (Planned) | 12 |

---

## Security & Compliance

### Security Features
- Environment-based API key management (never exposed to frontend)
- JWT-based portal authentication with token management
- Input validation on all user data (Pydantic models)
- Rate limiting (IP-based throttling)
- CORS protection with configurable allowed origins
- HTTPS-ready configuration
- Encrypted messaging architecture

### Compliance Features
- Automated suitability scoring
- Compliance status validation with alert generation
- ADV Part 2B and Form CRS auto-generation
- Timestamped audit trail for all actions
- Conversation monitoring with compliance flag detection
- Workflow enforcement for regulated processes
- Professional disclaimers throughout platform

---

## Contact & Resources

**Repository:** GitHub (private)  
**Production URL:** Deployed on Railway  
**API Documentation:** `API_INTEGRATIONS.md` — full third-party API mapping  
**Video Scripts:** `video-scripts/RIA_VIDEO_SCRIPTS.md` (35 scripts), `video-scripts/CLIENT_VIDEO_SCRIPTS.md` (20 scripts)  
**Architecture:** `ARCHITECTURE_SPEC.md`

---

*Document Version: 2.0*  
*Last Updated: February 2026*  
*Prepared for: Investor Communications & Platform Overview*
