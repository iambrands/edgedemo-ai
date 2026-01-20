#!/usr/bin/env python3
"""Test option chain analyzer performance"""

import time
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from services.tradier_connector import TradierConnector
from services.options_analyzer import OptionsAnalyzer

app = create_app()

with app.app_context():
    symbol = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    expiration = sys.argv[2] if len(sys.argv) > 2 else "2026-01-23"
    
    print(f"Testing performance for {symbol} exp {expiration}")
    print("=" * 60)
    
    tradier = TradierConnector()
    analyzer = OptionsAnalyzer()
    
    # Test 1: API call only
    print("\n[TEST 1] Tradier API call...")
    start = time.time()
    chain = tradier.get_options_chain(symbol, expiration)
    api_time = time.time() - start
    chain_count = len(chain) if isinstance(chain, list) else 0
    print(f"✅ API call: {api_time:.2f}s ({chain_count} options)")
    
    if chain_count == 0:
        print("❌ No options returned - cannot continue tests")
        sys.exit(1)
    
    # Test 2: Basic processing (filter by type)
    print("\n[TEST 2] Filter by type...")
    start = time.time()
    calls = [
        o for o in chain 
        if isinstance(o, dict) and 
        (o.get('option_type') or o.get('type') or '').lower().strip() == 'call'
    ]
    puts = [
        o for o in chain 
        if isinstance(o, dict) and 
        (o.get('option_type') or o.get('type') or '').lower().strip() == 'put'
    ]
    process_time = time.time() - start
    print(f"✅ Filter by type: {process_time:.3f}s ({len(calls)} calls, {len(puts)} puts)")
    
    # Test 3: Basic analysis (no AI)
    print("\n[TEST 3] Basic analysis (no AI)...")
    start = time.time()
    analyzed = []
    for i, option in enumerate(chain[:50]):  # Test first 50 only
        result = analyzer._analyze_option_basic(
            option, 
            preference='balanced', 
            stock_price=150.0,  # Mock price
            user_risk_tolerance='moderate',
            use_ai=False
        )
        if result:
            analyzed.append(result)
    basic_time = time.time() - start
    print(f"✅ Basic analysis: {basic_time:.3f}s ({len(analyzed)} analyzed)")
    
    # Test 4: Full analysis (with AI - limited)
    print("\n[TEST 4] Full analysis (with AI - first 5 only)...")
    start = time.time()
    full_analyzed = []
    for option in chain[:5]:  # Only test 5 to avoid API rate limits
        result = analyzer._analyze_option_with_ai(
            option,
            preference='balanced',
            stock_price=150.0,
            user_risk_tolerance='moderate',
            basic_analysis=None
        )
        if result:
            full_analyzed.append(result)
    full_time = time.time() - start
    print(f"✅ Full analysis (5 options): {full_time:.3f}s")
    
    # Summary
    print("\n" + "=" * 60)
    print("PERFORMANCE SUMMARY")
    print("=" * 60)
    print(f"API call:        {api_time:.3f}s")
    print(f"Filter by type: {process_time:.3f}s")
    print(f"Basic analysis: {basic_time:.3f}s (50 options)")
    print(f"Full analysis:  {full_time:.3f}s (5 options)")
    print(f"\nEstimated full chain analysis (50 options): {api_time + process_time + basic_time + (full_time * 10):.3f}s")
    print(f"\nCALL/PUT distribution:")
    print(f"  CALLs: {len(calls)} ({len(calls)/chain_count*100:.1f}%)")
    print(f"  PUTs:  {len(puts)} ({len(puts)/chain_count*100:.1f}%)")
    
    if len(puts) == 0:
        print("\n⚠️  WARNING: No PUT options found in chain!")
        print("   This could indicate a data issue or filtering problem.")

