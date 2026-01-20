#!/usr/bin/env python3
"""
Quick test script to check Tradier API connectivity and response times
"""
import os
import requests
import time
import json

TRADIER_TOKEN = os.getenv('TRADIER_API_KEY')
url = "https://sandbox.tradier.com/v1/markets/options/chains"

headers = {'Authorization': f'Bearer {TRADIER_TOKEN}', 'Accept': 'application/json'}
params = {'symbol': 'META', 'expiration': '2026-02-27', 'greeks': 'true'}

print("=" * 60)
print("Testing Tradier API connectivity for META options chain")
print("=" * 60)
print(f"URL: {url}")
print(f"Token present: {bool(TRADIER_TOKEN)}")
print(f"Token length: {len(TRADIER_TOKEN) if TRADIER_TOKEN else 0}")
print(f"Token preview: {TRADIER_TOKEN[:10]}..." if TRADIER_TOKEN else "No token")
print()

for timeout in [5, 10, 15, 20]:
    print(f"Trying with {timeout}s timeout...")
    start = time.time()
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=timeout)
        elapsed = time.time() - start
        
        print(f"  ✅ Success! Status: {response.status_code}, Time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            options_count = 0
            
            print(f"  Response keys: {list(data.keys())}")
            
            if 'options' in data:
                opts = data['options']
                print(f"  Options data type: {type(opts)}")
                
                if isinstance(opts, dict):
                    if 'option' in opts:
                        option_data = opts['option']
                        if isinstance(option_data, list):
                            options_count = len(option_data)
                        else:
                            options_count = 1
                            option_data = [option_data]
                        
                        print(f"  📊 Options in chain: {options_count}")
                        
                        if options_count > 0:
                            print(f"  📋 First option keys: {list(option_data[0].keys())}")
                            print(f"  📋 First option type field: {option_data[0].get('type', 'NOT FOUND')}")
                            print(f"  📋 First option contract_type field: {option_data[0].get('contract_type', 'NOT FOUND')}")
                            print(f"  📋 First option sample:")
                            try:
                                sample = json.dumps(option_data[0], indent=2, default=str)
                                print(f"  {sample[:800]}")
                            except:
                                print(f"  {str(option_data[0])[:800]}")
                elif isinstance(opts, list):
                    options_count = len(opts)
                    print(f"  📊 Options in chain: {options_count}")
                    
                    if options_count > 0:
                        print(f"  📋 First option keys: {list(opts[0].keys())}")
                        print(f"  📋 First option type field: {opts[0].get('type', 'NOT FOUND')}")
                        print(f"  📋 First option contract_type field: {opts[0].get('contract_type', 'NOT FOUND')}")
            
            print()
            print("✅ Test completed successfully!")
            break
        else:
            print(f"  ❌ Error: {response.text[:200]}")
            
    except requests.exceptions.Timeout:
        elapsed = time.time() - start
        print(f"  ⏱️ Timeout after {elapsed:.2f}s")
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print()

print("=" * 60)

