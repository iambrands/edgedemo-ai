#!/usr/bin/env python3
"""
IAB Options Bot - Advanced API Test Suite
Tests API functionality with detailed assertions and reporting
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
import os

# Configuration
BASE_URL = os.getenv('TEST_BASE_URL', 'https://web-production-8b7ae.up.railway.app')
ADMIN_API_KEY = os.getenv('ADMIN_API_KEY', '')

# ANSI colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

@dataclass
class TestResult:
    name: str
    passed: bool
    duration_ms: int
    status_code: int
    expected_code: int
    error: str = None

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.results: List[TestResult] = []
        
    def test(self, name: str, method: str, endpoint: str, 
             expected_code: int = 200, data: Dict = None, 
             headers: Dict = None, validate: callable = None) -> TestResult:
        """Execute a test case"""
        url = f"{self.base_url}{endpoint}"
        
        print(f"Testing {name}... ", end='', flush=True)
        
        start = time.time()
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            duration_ms = int((time.time() - start) * 1000)
            
            passed = response.status_code == expected_code
            error = None
            
            # Additional validation if provided
            if passed and validate:
                try:
                    validate(response.json())
                except Exception as e:
                    passed = False
                    error = f"Validation failed: {e}"
            
            result = TestResult(
                name=name,
                passed=passed,
                duration_ms=duration_ms,
                status_code=response.status_code,
                expected_code=expected_code,
                error=error
            )
            
            if passed:
                print(f"{GREEN}✅ PASS{NC} ({duration_ms}ms)")
            else:
                print(f"{RED}❌ FAIL{NC} (Expected {expected_code}, got {response.status_code})")
                if error:
                    print(f"  Error: {error}")
            
            if duration_ms > 3000:
                print(f"  {YELLOW}⚠️  Slow response: {duration_ms}ms{NC}")
            
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            result = TestResult(
                name=name,
                passed=False,
                duration_ms=duration_ms,
                status_code=0,
                expected_code=expected_code,
                error=str(e)
            )
            print(f"{RED}❌ FAIL{NC} ({e})")
        
        self.results.append(result)
        return result
    
    def test_cache_performance(self, name: str, method: str, endpoint: str, data: Dict = None):
        """Test that caching improves performance"""
        print(f"\nTesting cache performance for {name}...")
        
        # First request (cache miss)
        print("  → First request (cache miss)... ", end='', flush=True)
        start1 = time.time()
        r1 = self.session.request(method, f"{self.base_url}{endpoint}", json=data, timeout=30)
        duration1 = int((time.time() - start1) * 1000)
        print(f"{GREEN}✅{NC} {duration1}ms")
        
        time.sleep(1)  # Brief pause
        
        # Second request (cache hit)
        print("  → Second request (cache hit)... ", end='', flush=True)
        start2 = time.time()
        r2 = self.session.request(method, f"{self.base_url}{endpoint}", json=data, timeout=30)
        duration2 = int((time.time() - start2) * 1000)
        print(f"{GREEN}✅{NC} {duration2}ms")
        
        if duration2 < duration1:
            improvement = int(((duration1 - duration2) / duration1) * 100)
            print(f"  {GREEN}💾 Cache improved response time by {improvement}%{NC}")
            self.results.append(TestResult(
                name=f"{name} - Cache Performance",
                passed=True,
                duration_ms=duration2,
                status_code=200,
                expected_code=200
            ))
        else:
            print(f"  {YELLOW}⚠️  Cache did not improve performance{NC}")
            self.results.append(TestResult(
                name=f"{name} - Cache Performance",
                passed=False,
                duration_ms=duration2,
                status_code=200,
                expected_code=200,
                error="Cache did not improve performance"
            ))
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate test report"""
        if not self.results:
            return {
                'timestamp': datetime.now().isoformat(),
                'base_url': self.base_url,
                'summary': {'total': 0, 'passed': 0, 'failed': 0, 'pass_rate': '0%', 'avg_duration_ms': 0},
                'results': []
            }
        
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        avg_duration = int(sum(r.duration_ms for r in self.results) / len(self.results))
        
        return {
            'timestamp': datetime.now().isoformat(),
            'base_url': self.base_url,
            'summary': {
                'total': len(self.results),
                'passed': passed,
                'failed': failed,
                'pass_rate': f"{(passed / len(self.results) * 100):.1f}%",
                'avg_duration_ms': avg_duration
            },
            'results': [
                {
                    'name': r.name,
                    'passed': r.passed,
                    'duration_ms': r.duration_ms,
                    'status_code': r.status_code,
                    'error': r.error
                }
                for r in self.results
            ]
        }

def main():
    print(f"{BLUE}🧪 IAB Options Bot - Advanced API Test Suite{NC}")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    tester = APITester(BASE_URL)
    
    # Section 1: Health Checks
    print(f"{BLUE}📍 Section 1: Health Checks{NC}")
    print("-" * 40)
    
    tester.test(
        "Overall Health",
        "GET", "/health",
        validate=lambda d: 'status' in d and 'components' in d
    )
    
    tester.test(
        "Cache Health",
        "GET", "/health/cache",
        validate=lambda d: 'enabled' in d or 'using_redis' in d
    )
    
    tester.test(
        "Position Health",
        "GET", "/health/positions",
        validate=lambda d: 'positions' in d
    )
    print()
    
    # Section 2: Core API
    print(f"{BLUE}📍 Section 2: Core API Endpoints{NC}")
    print("-" * 40)
    
    tester.test(
        "Get Expirations (AAPL)",
        "GET", "/api/options/expirations?symbol=AAPL",
        validate=lambda d: 'expirations' in d and isinstance(d['expirations'], list)
    )
    
    tester.test(
        "Get Quote (AAPL)",
        "GET", "/api/options/quote?symbol=AAPL",
        validate=lambda d: 'symbol' in d and d['symbol'] == 'AAPL'
    )
    print()
    
    # Section 3: Options Analysis
    print(f"{BLUE}📍 Section 3: Options Analysis{NC}")
    print("-" * 40)
    
    tester.test(
        "Analyze Options (AAPL)",
        "POST", "/api/options/analyze",
        data={
            "symbol": "AAPL",
            "expiration": "2026-01-30",
            "preference": "balanced"
        },
        validate=lambda d: 'recommendations' in d or 'opportunities' in d or 'analysis' in d
    )
    print()
    
    # Section 4: Cache Performance
    print(f"{BLUE}📍 Section 4: Cache Performance{NC}")
    print("-" * 40)
    
    tester.test_cache_performance(
        "AAPL Analysis",
        "POST", "/api/options/analyze",
        data={"symbol": "AAPL", "expiration": "2026-01-30", "preference": "balanced"}
    )
    
    tester.test_cache_performance(
        "AAPL Expirations",
        "GET", "/api/options/expirations?symbol=AAPL"
    )
    print()
    
    # Section 5: Admin Endpoints (if API key available)
    if ADMIN_API_KEY:
        print(f"{BLUE}📍 Section 5: Admin Endpoints{NC}")
        print("-" * 40)
        
        headers = {'X-API-Key': ADMIN_API_KEY}
        
        tester.test(
            "Get Expiring Positions",
            "GET", "/api/admin/positions/expiring",
            headers=headers
        )
        
        tester.test(
            "Get Stale Positions",
            "GET", "/api/admin/positions/stale",
            headers=headers
        )
        
        tester.test(
            "Get Cache Stats",
            "GET", "/api/admin/cache/stats",
            headers=headers
        )
        print()
    
    # Section 6: Error Handling
    print(f"{BLUE}📍 Section 6: Error Handling{NC}")
    print("-" * 40)
    
    tester.test(
        "Invalid Endpoint",
        "GET", "/api/invalid/endpoint",
        expected_code=404
    )
    
    tester.test(
        "Missing Required Param",
        "POST", "/api/options/analyze",
        data={"symbol": "AAPL"},  # Missing expiration
        expected_code=400
    )
    print()
    
    # Generate report
    report = tester.generate_report()
    
    # Save report
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f"test_results_{timestamp}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print("=" * 60)
    print(f"{BLUE}📊 Test Results Summary{NC}")
    print("=" * 60)
    print(f"Total Tests: {report['summary']['total']}")
    print(f"{GREEN}Passed: {report['summary']['passed']}{NC}")
    print(f"{RED}Failed: {report['summary']['failed']}{NC}")
    print(f"Pass Rate: {report['summary']['pass_rate']}")
    print(f"Avg Duration: {report['summary']['avg_duration_ms']}ms")
    print(f"\nDetailed report saved to: {report_file}")
    print()
    
    # Exit code
    if report['summary']['failed'] == 0:
        print(f"{GREEN}🎉 ALL TESTS PASSED!{NC}")
        sys.exit(0)
    else:
        print(f"{RED}⚠️  SOME TESTS FAILED{NC}")
        sys.exit(1)

if __name__ == '__main__':
    main()

