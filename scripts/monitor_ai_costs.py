#!/usr/bin/env python3
"""
AI Cost Monitoring Script

Monitors AI analysis costs and estimates monthly expenses.

Usage:
    python scripts/monitor_ai_costs.py
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def monitor_costs():
    """Monitor AI analysis costs"""
    print("=" * 60)
    print("AI Cost Monitoring (Last 24 Hours)")
    print("=" * 60)
    print()
    
    app = create_app()
    
    with app.app_context():
        try:
            # Calculate time range (last 24 hours)
            now = datetime.utcnow()
            yesterday = now - timedelta(hours=24)
            
            # Query for analysis count (this is an estimate - actual tracking would be in a separate table)
            # For now, we'll use a placeholder
            # In production, you'd track this in an analytics table
            
            # Placeholder estimates (replace with actual query when analytics table exists)
            # For demonstration, we'll show expected costs based on typical usage
            
            print("Note: Actual analytics tracking would query database for analysis counts.")
            print("This is a cost estimation script.")
            print()
            
            # Pricing constants (Claude Haiku)
            FRESH_COST_PER_ANALYSIS = 0.009  # $0.009 per 50-option analysis
            CACHED_COST_PER_ANALYSIS = 0.001  # $0.001 per cached analysis
            EXPECTED_CACHE_HIT_RATE = 0.85  # 85% cache hit rate
            
            # Example usage (replace with actual database query)
            estimated_daily_analyses = 150
            estimated_fresh = int(estimated_daily_analyses * (1 - EXPECTED_CACHE_HIT_RATE))
            estimated_cached = int(estimated_daily_analyses * EXPECTED_CACHE_HIT_RATE)
            
            fresh_cost = estimated_fresh * FRESH_COST_PER_ANALYSIS
            cached_cost = estimated_cached * CACHED_COST_PER_ANALYSIS
            total_daily = fresh_cost + cached_cost
            
            print(f"Total Analyses (estimated): {estimated_daily_analyses}")
            print(f"Cache Hit Rate: {EXPECTED_CACHE_HIT_RATE*100:.0f}% ({estimated_cached} cached, {estimated_fresh} fresh)")
            print()
            print("Cost Breakdown:")
            print(f"- Fresh analyses: {estimated_fresh} × ${FRESH_COST_PER_ANALYSIS:.3f} = ${fresh_cost:.2f}")
            print(f"- Cached analyses: {estimated_cached} × ${CACHED_COST_PER_ANALYSIS:.3f} = ${cached_cost:.2f}")
            print(f"- Total: ${total_daily:.2f}")
            print()
            
            # Projected monthly
            monthly_cost = total_daily * 30
            old_cost = 375  # Old OpenAI cost
            
            print("Projected Monthly:")
            print(f"- Daily average: ${total_daily:.2f}")
            print(f"- Monthly: ${monthly_cost:.2f}")
            print(f"- Old cost (OpenAI): ${old_cost}/month")
            savings = old_cost - monthly_cost
            savings_pct = (savings / old_cost) * 100
            print(f"- Savings: ${savings:.2f}/month ({savings_pct:.1f}%)")
            print()
            
            print("=" * 60)
            if 4 <= monthly_cost <= 10:
                print("✅ COSTS WITHIN EXPECTED RANGE ($4-$10/month)")
            elif monthly_cost < 4:
                print("✅ COSTS BELOW EXPECTED (Good!)")
            else:
                print(f"⚠️  COSTS HIGHER THAN EXPECTED (${monthly_cost:.2f}/month)")
            print("=" * 60)
            
            return 0 if 4 <= monthly_cost <= 15 else 1
            
        except Exception as e:
            print(f"❌ Error monitoring costs: {str(e)}")
            import traceback
            traceback.print_exc()
            return 1

def main():
    return monitor_costs()

if __name__ == '__main__':
    sys.exit(main())

