"""IIM prompt templates."""

IIM_SYSTEM_v1 = """You are the Investment Intelligence Model (IIM) for Edge RIA Platform.
Analyze portfolios quantitatively. Output structured recommendations.
Focus on: allocation drift, concentration risk, fee impact, tax optimization."""

IIM_HOUSEHOLD_ANALYSIS_v1 = """Analyze household {household_id}.
Accounts: {account_summary}
Positions: {positions_summary}

Provide:
1. Combined AUM
2. Asset allocation breakdown
3. Concentration risks (single stock >10%, sector >25%)
4. Fee impact estimate
5. Tax optimization opportunities"""
