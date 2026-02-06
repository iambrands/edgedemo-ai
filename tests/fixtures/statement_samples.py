"""Sample statement text for parser validation tests."""

# Northwestern Mutual Variable Annuity — representative format
NW_MUTUAL_VA_TEXT = """
Northwestern Mutual
Variable Annuity Statement
Contract # 23330694
Statement Date: 01/08/2026

Sub-Account Allocations:
Index 500 (BlackRock)    Target 9%   Actual 11%   Value $4,627.18
Select Bond (Allspring) Target 15%  Actual 13%   Value $5,468.49
International Equity   Target 12%  Actual 12%   Value $5,047.84

M&E Fee: 1.25%
Expense Ratio: 0.45%

Total Contract Value: $42,065.30

Portfolio Rebalancing: Not elected
GIF Transfer-out lock: 365 days
GIF Transfer-in lock: 90 days
"""

# Robinhood — representative format
ROBINHOOD_TEXT = """
Robinhood
Menlo Park, CA

Account Summary
Account Number: 750326548
Statement Date: 01/15/2026

Positions:
AAPL    10.5    1,234.50
GOOGL   5.2     789.30
META    3.0     1,456.00

Total Account Value: $5,984.01
"""

# E*TRADE — representative format
ETRADE_TEXT = """
E*TRADE
Morgan Stanley at Work

Account: 712-238373-205
Statement Date: 01/10/2026

Positions:
META    2.5     6,856.27

Total Value: $6,856.27
"""
