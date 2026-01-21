#!/usr/bin/env python3
"""
Master Test Runner

Runs all verification and test scripts in sequence.

Usage:
    python scripts/run_all_tests.py --email user@example.com --password pass123
"""

import subprocess
import sys
import argparse
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description='Run all deployment verification tests')
    parser.add_argument('--email', required=True, help='User email for authenticated tests')
    parser.add_argument('--password', required=True, help='User password')
    parser.add_argument('--base-url', default='https://web-production-8b7ae.up.railway.app', help='Base URL')
    parser.add_argument('--skip-spreads', action='store_true', help='Skip spreads test')
    
    args = parser.parse_args()
    
    tests = [
        {
            'name': 'Deployment Verification',
            'script': 'scripts/verify_deployment.py',
            'args': [],
            'critical': True
        },
        {
            'name': 'Rate Limiting Test',
            'script': 'scripts/test_rate_limiting.py',
            'args': ['--email', args.email, '--password', args.password, '--base-url', args.base_url],
            'critical': True
        },
        {
            'name': 'Debit Spreads Test',
            'script': 'scripts/test_spreads.py',
            'args': ['--email', args.email, '--password', args.password, '--base-url', args.base_url],
            'critical': not args.skip_spreads,
            'skip': args.skip_spreads
        },
        {
            'name': 'AI Cost Monitoring',
            'script': 'scripts/monitor_ai_costs.py',
            'args': [],
            'critical': False
        }
    ]
    
    results = {'passed': 0, 'failed': 0, 'skipped': 0}
    
    print("=" * 70)
    print("  IAB Options Bot - Comprehensive Test Suite")
    print("=" * 70)
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Target: {args.base_url}")
    print("=" * 70)
    print()
    
    for test in tests:
        if test.get('skip'):
            print(f"⏭️  Skipping: {test['name']}")
            results['skipped'] += 1
            continue
        
        print(f"Running: {test['name']}")
        print("-" * 70)
        
        try:
            result = subprocess.run(
                ['python3', test['script']] + test['args'],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            print(result.stdout)
            
            if result.returncode == 0:
                print(f"✅ {test['name']} PASSED")
                results['passed'] += 1
            else:
                print(f"❌ {test['name']} FAILED")
                if result.stderr:
                    print(result.stderr)
                results['failed'] += 1
                
                if test['critical']:
                    print()
                    print("Critical test failed. Stopping test suite.")
                    break
        
        except subprocess.TimeoutExpired:
            print(f"❌ {test['name']} TIMEOUT (exceeded 120 seconds)")
            results['failed'] += 1
            
            if test['critical']:
                print()
                print("Critical test failed. Stopping test suite.")
                break
                
        except Exception as e:
            print(f"❌ {test['name']} ERROR: {str(e)}")
            results['failed'] += 1
            
            if test['critical']:
                print()
                print("Critical test failed. Stopping test suite.")
                break
        
        print()
    
    print("=" * 70)
    print("  Test Summary")
    print("=" * 70)
    print(f"✅ Passed:  {results['passed']}")
    print(f"❌ Failed:  {results['failed']}")
    print(f"⏭️  Skipped: {results['skipped']}")
    print("=" * 70)
    
    if results['failed'] == 0:
        print()
        print("✅ ALL TESTS PASSED - DEPLOYMENT SUCCESSFUL")
        print()
        return 0
    else:
        print()
        print("❌ SOME TESTS FAILED - REVIEW OUTPUT ABOVE")
        print()
        return 1

if __name__ == '__main__':
    sys.exit(main())

