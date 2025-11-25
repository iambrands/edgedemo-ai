#!/usr/bin/env python3
"""
Quick verification script to confirm real Yahoo Finance data is being used
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🔍 VERIFYING REAL DATA CONFIGURATION")
print("=" * 60)

# Check .env configuration
use_yahoo = os.environ.get('USE_YAHOO_DATA', 'false').lower() == 'true'
use_mock = os.environ.get('USE_MOCK_DATA', 'true').lower() == 'true'
use_polygon = os.environ.get('USE_POLYGON_DATA', 'false').lower() == 'true'

print("\n📋 Configuration Status:")
print(f"   USE_YAHOO_DATA: {'✅ ENABLED' if use_yahoo else '❌ DISABLED'}")
print(f"   USE_MOCK_DATA: {'❌ ENABLED (using fake data!)' if use_mock else '✅ DISABLED (good!)'}")
print(f"   USE_POLYGON_DATA: {'✅ ENABLED' if use_polygon else '❌ DISABLED'}")

if use_yahoo and not use_mock:
    print("\n✅ CORRECT CONFIGURATION: Using real Yahoo Finance data!")
elif use_polygon and not use_mock:
    print("\n✅ CORRECT CONFIGURATION: Using real Polygon.io data!")
else:
    print("\n⚠️  WARNING: You might be using mock data!")
    if use_mock:
        print("   → Set USE_MOCK_DATA=false in .env")
    if not use_yahoo and not use_polygon:
        print("   → Set USE_YAHOO_DATA=true or USE_POLYGON_DATA=true in .env")

# Test direct Yahoo Finance connection
print("\n" + "=" * 60)
print("🧪 Testing Direct Yahoo Finance Connection...")
print("=" * 60)

try:
    import yfinance as yf
    from datetime import datetime
    
    # Test AAPL
    symbol = 'AAPL'
    print(f"\n📊 Testing {symbol}:")
    
    ticker = yf.Ticker(symbol)
    info = ticker.info
    history = ticker.history(period='1d')
    
    if not history.empty:
        last_price = history['Close'].iloc[-1]
        volume = history['Volume'].iloc[-1]
        print(f"   ✅ Stock Price: ${last_price:.2f}")
        print(f"   ✅ Volume: {int(volume):,}")
        print(f"   ✅ Company: {info.get('longName', 'N/A')}")
    else:
        print(f"   ✅ Stock Price: ${info.get('currentPrice', 0):.2f}")
        print(f"   ✅ Company: {info.get('longName', 'N/A')}")
    
    # Test options
    expirations = ticker.options
    print(f"   ✅ Options Expirations: {len(expirations)} dates found")
    
    if len(expirations) > 0:
        first_exp = expirations[0]
        option_chain = ticker.option_chain(first_exp)
        calls = option_chain.calls
        puts = option_chain.puts
        
        print(f"   ✅ Options Chain ({first_exp}):")
        print(f"      • Calls: {len(calls)} contracts")
        print(f"      • Puts: {len(puts)} contracts")
        
        if len(calls) > 0:
            sample = calls.iloc[len(calls)//2]  # Middle strike
            print(f"      • Sample Call: Strike ${sample['strike']:.2f}, Last ${sample.get('lastPrice', 0):.2f}")
    
    print("\n" + "=" * 60)
    print("✅ YAHOO FINANCE IS WORKING - REAL DATA CONFIRMED!")
    print("=" * 60)
    print("\n💡 To verify in your app:")
    print("   1. Go to Options Analyzer page")
    print("   2. Enter AAPL")
    print("   3. Compare prices with: https://finance.yahoo.com/quote/AAPL/options")
    print("   4. Prices should MATCH (or be very close)")
    
except ImportError:
    print("\n❌ ERROR: yfinance not installed!")
    print("   Run: pip install yfinance")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    sys.exit(1)


