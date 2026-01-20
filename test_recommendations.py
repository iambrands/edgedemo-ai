#!/usr/bin/env python3
"""Test recommendations to see CALL vs PUT distribution"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from services.options_analyzer import OptionsAnalyzer

app = create_app()

with app.app_context():
    symbol = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    expiration = sys.argv[2] if len(sys.argv) > 2 else "2026-01-23"
    preference = sys.argv[3] if len(sys.argv) > 3 else "balanced"
    
    print("Testing Top Recommendations")
    print("=" * 60)
    print(f"Symbol: {symbol}")
    print(f"Expiration: {expiration}")
    print(f"Preference: {preference}")
    print("=" * 60)
    
    analyzer = OptionsAnalyzer()
    
    print("\nRunning analysis...")
    recommendations = analyzer.analyze_options_chain(
        symbol=symbol,
        expiration=expiration,
        preference=preference,
        user_risk_tolerance='moderate'
    )
    
    print(f"\n✅ Analysis complete: {len(recommendations)} recommendations")
    
    # Count by type
    calls = [r for r in recommendations if (r.get('contract_type') or '').lower() == 'call']
    puts = [r for r in recommendations if (r.get('contract_type') or '').lower() == 'put']
    unknown = [r for r in recommendations if (r.get('contract_type') or '').lower() not in ['call', 'put']]
    
    print(f"\nCALL/PUT Distribution:")
    print(f"  Total: {len(recommendations)}")
    print(f"  CALLs: {len(calls)} ({len(calls)/len(recommendations)*100:.1f}%)" if recommendations else "  CALLs: 0")
    print(f"  PUTs:  {len(puts)} ({len(puts)/len(recommendations)*100:.1f}%)" if recommendations else "  PUTs: 0")
    if unknown:
        print(f"  Unknown: {len(unknown)}")
    
    if len(puts) == 0 and len(recommendations) > 0:
        print("\n⚠️  WARNING: No PUT options in recommendations!")
        print("   This indicates a bias in the recommendation algorithm.")
        print("\n   Possible causes:")
        print("   1. Scoring algorithm favors CALLs")
        print("   2. Filtering excludes PUTs")
        print("   3. Data source doesn't include PUTs")
        print("   4. 'option_type' field not being read correctly")
    
    print("\n" + "=" * 60)
    print("Top 10 Recommendations:")
    print("=" * 60)
    for i, rec in enumerate(recommendations[:10], 1):
        contract_type = (rec.get('contract_type') or 'unknown').upper()
        strike = rec.get('strike', 'N/A')
        score = rec.get('score', 'N/A')
        delta = rec.get('delta', 'N/A')
        print(f"{i:2}. {contract_type:4} ${strike:>8} - Score: {score:>6.4f} - Delta: {delta:>6.3f}")
    
    if len(puts) > 0:
        print("\n" + "=" * 60)
        print("Top PUT Recommendations:")
        print("=" * 60)
        for i, rec in enumerate(puts[:5], 1):
            strike = rec.get('strike', 'N/A')
            score = rec.get('score', 'N/A')
            delta = rec.get('delta', 'N/A')
            print(f"{i}. PUT ${strike:>8} - Score: {score:>6.4f} - Delta: {delta:>6.3f}")

