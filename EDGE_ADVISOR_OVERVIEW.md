# Edge — Platform Overview for Advisors

> The all-in-one wealth management platform built for independent RIAs. Replace 6-10 disconnected tools with a single, AI-powered command center.

**Production URL:** https://edgedemo-ai-production.up.railway.app
**Login:** Your credentials will be provided during onboarding

---

## What Edge Does

Edge is a comprehensive practice management platform that consolidates portfolio analysis, client management, financial planning, compliance automation, trading, tax optimization, billing, reporting, communication, and AI-powered intelligence into a single unified experience.

| By the Numbers | |
|---|---|
| **RIA Dashboard Pages** | 38 |
| **Client Portal Pages** | 19 |
| **Total Features** | 57+ |
| **Supported Brokerages** | 17+ |
| **E2E Test Coverage** | 293 automated tests |
| **AI Engine** | GPT-4 powered analysis, chat, and planning |

---

## Platform at a Glance

### Your Dashboard

When you log in, you land on a unified command center showing:
- **Total AUM** across all households with trend indicators
- **Active Alerts** — compliance flags, concentration warnings, and action items
- **Recent Activity** — latest account changes, trades, and client interactions
- **Household Overview** — sortable table of every household with total value and status

### Navigation

The sidebar organizes everything into 8 collapsible groups:

| Group | What's Inside |
|-------|--------------|
| **Client Management** | Households, Accounts, Bulk Import, Prospects, CRM |
| **Investing** | Portfolio Review, Client Portfolios, Performance, Analysis, Rebalancing, Direct Indexing, Stock Screener, Model Portfolios, Trading, Tax Harvest, Alt Assets, Best Execution |
| **Financial Planning** | Goals, Monte Carlo Simulation, Social Security Optimization, Roth Conversion Analysis, Estate Planning |
| **Operations** | Reports, Statements, Billing, Meetings, Liquidity, Custodians, Data Feeds, Document Vault |
| **Compliance** | Dashboard (scoring + alerts + tasks + audit), Documents (ADV/CRS), Workflows, Communication Archiving |
| **Communication** | Secure Messages, Conversation Intelligence |
| **Administration** | Firm Management, Engagement Analytics, CRM Integrations |
| **AI & Learning** | AI Chat Widget, Learning Center (35 video lessons) |

---

## Key Capabilities

### 1. AI-Powered Portfolio Analysis

Run comprehensive analysis across 6 dimensions for any client in seconds:

- **Portfolio Health** — Overall score (0-100) with letter grade
- **Fee Analysis** — Identifies high-fee funds with lower-cost alternatives
- **Tax Optimization** — Harvesting opportunities, asset location strategies
- **Risk Assessment** — Beta, Sharpe ratio, concentration risk, drawdown
- **ETF Builder** — Optimized portfolio recommendations
- **IPS Generator** — Auto-generated Investment Policy Statements

### 2. Financial Planning Suite

Comprehensive planning tools directly integrated into the platform:

- **Multi-Goal Tracking** — Retirement, education, emergency fund, and custom goals with probability of success
- **Monte Carlo Simulation** — 1,000 iterations with configurable assumptions, producing success rate and wealth percentiles (P10/P50/P90)
- **Social Security Optimization** — Compare claiming ages 62-70 with monthly benefit, lifetime benefit, and break-even analysis
- **Roth Conversion Analysis** — Multi-year ladder with tax rate projections and optimal conversion schedule
- **Estate Planning** — Document inventory, beneficiary summary, and estate tax exposure

### 3. Performance & Accounting

Institutional-grade performance measurement:

- **TWRR & MWRR** calculations at account, household, and firm level
- **Brinson-Fachler Attribution** — Sector-level allocation and selection effects
- **Daily NAV Series** with period selection (1M through ALL)
- **Firm Overview** — Total AUM, YTD return, and aggregate statistics

### 4. Automated Rebalancing

Drift detection and tax-aware trade generation:

- Accounts flagged when drift exceeds model thresholds
- Tax-aware trades with lot selection (FIFO, specific ID, tax-optimized)
- Batch selection and one-click trade generation
- Full rebalancing history for audit

### 5. Direct Indexing

Personalized index construction for tax-efficient investing:

- Custom S&P 500 or Russell 1000 indices
- ESG/values-based exclusions (Tobacco, Firearms, Fossil Fuels, etc.)
- Sector tilts (e.g., Technology +5%)
- Continuous tax-loss harvesting with wash sale compliance
- Basis-point level tracking error monitoring

### 6. Compliance Co-Pilot

Real-time compliance monitoring and automation:

- **Compliance Score** — Firm-wide scoring with alert-driven deductions
- **Alert Management** — Concentration, suitability, documentation, and regulatory alerts with severity and resolution workflow
- **Task Tracking** — ADV updates, client reviews, training, with due dates and assignees
- **Audit Trail** — Every compliance-relevant action logged with timestamps
- **Document Generation** — AI-assisted ADV Part 2B and Form CRS with version control
- **6 Workflow Templates** — New Client, Annual Review, Death of Client/Spouse, Divorce, Rollover, Account Closure
- **Communication Archiving** — SEC Rule 17a-4 compliant retention of all communications

### 7. Client Management

Complete lifecycle management:

- **Household Groupings** — Multi-account families with aggregated views
- **Bulk Import** — CSV upload to onboard entire client books
- **Prospect Pipeline** — Lead scoring, activity tracking, AI-generated proposals
- **CRM Integration** — Bidirectional sync with Salesforce, Redtail, and Wealthbox

### 8. Operations

Streamline your back office:

- **Report Builder** — Custom templates, drag-and-drop sections, scheduled delivery
- **Statement Parsing** — Upload PDFs from 17+ brokerages, auto-extract holdings
- **Billing Automation** — AUM-based fee schedules, Stripe invoicing
- **Meeting Intelligence** — AI-powered meeting prep, transcription, action items
- **Custodian Data Feeds** — Real-time integration with Schwab, Fidelity, Pershing, Vanguard
- **Document Vault** — Secure storage with DocuSign e-signature tracking

### 9. Firm Administration

Multi-advisor practice management:

- **7 Role Types** — Firm Owner, Senior Advisor, Financial Advisor, Associate Advisor, Operations Manager, CCO, Paraplanner
- **Team Management** — Create teams with lead designation and combined AUM tracking
- **Engagement Analytics** — Client engagement scoring, at-risk identification, portal adoption rates, NPS insights
- **CRM Integrations** — Sync with Salesforce, Redtail, or Wealthbox with configurable field mappings

---

## Client Portal

Your clients get their own branded portal with 19 pages:

| Feature | What Clients Can Do |
|---------|-------------------|
| **Dashboard** | See total portfolio value, accounts, gain/loss, and action items |
| **Performance** | View returns vs. benchmark, asset allocation, monthly returns |
| **Goals** | Create and track financial goals with progress bars |
| **What-If Scenarios** | Model retirement timing, contribution changes, market scenarios |
| **Tax Center** | View realized/unrealized gains, tax lots, and download tax forms |
| **Documents** | Access statements, reports, and agreements |
| **Meetings** | Book meetings directly from the calendar |
| **Messages** | Secure, encrypted messaging with you |
| **Requests** | Submit withdrawal, transfer, and document requests |
| **AI Assistant** | Ask questions about their accounts (guardrailed) |
| **Risk Profile** | Complete risk assessment questionnaire |
| **Beneficiaries** | Review and request beneficiary changes |
| **Family Dashboard** | Household-wide view with all members |
| **Learning Center** | 20 video lessons on using the portal and understanding finances |
| **Notifications** | Activity alerts, document readiness, meeting reminders |

---

## AI Throughout

An AI assistant is available on every page of both portals:

- **For You:** Portfolio analysis, meeting prep, client narratives, compliance checks
- **For Clients:** Account questions, goal guidance, general financial literacy
- **Quick Prompts:** "Summarize my practice," "Review compliance alerts," "Prepare for next meeting," "Draft a client narrative"

---

## Stock Screener

Built-in fundamental screener with 12+ filters and 5 preset strategies:

- **Value** — Low P/E, low PEG, positive free cash flow
- **Growth** — High earnings/revenue growth
- **Dividend Income** — High yield, low debt, positive FCF
- **Quality** — Low leverage, high liquidity, consistent growth
- **GARP** — Growth at a reasonable price

---

## Getting Started

1. **Log in** at the production URL with your provided credentials
2. **Explore the Dashboard** — familiarize yourself with KPIs and navigation
3. **Visit Learning Center** — 35 video lessons covering every feature (~90 min total)
4. **Import Clients** — Use Bulk Import to upload your client book via CSV
5. **Connect Custodians** — Link Schwab, Fidelity, or other custodians
6. **Run Analysis** — Try the AI-powered portfolio analysis on a household
7. **Set Up Compliance** — Review alerts, configure workflows, generate ADV/CRS

---

## Technical Details

| Component | Technology |
|-----------|-----------|
| **Backend** | FastAPI (Python) with async support |
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **AI Engine** | OpenAI GPT-4 |
| **Authentication** | JWT-based with role separation |
| **Deployment** | Railway (auto-deploy from GitHub) |
| **Testing** | 293 Playwright E2E tests |
| **Mobile** | Progressive Web App — installable from browser |

---

## Support

- **AI Chat** — Available on every page, 24/7
- **Help Center** — Searchable knowledge base accessible from the sidebar
- **Learning Center** — 9 courses with 35 video lessons

---

*Edge by IAB Advisors, Inc.*
*Platform Version: 1.3.0*
*Document Version: 1.0 — March 2026*
