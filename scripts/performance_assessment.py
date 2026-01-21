#!/usr/bin/env python3
"""
Performance Assessment Script

Comprehensive performance testing for all IAB Options Bot pages and features.

Usage:
    python scripts/performance_assessment.py
    python scripts/performance_assessment.py --verbose
    python scripts/performance_assessment.py --page opportunities
    python scripts/performance_assessment.py --email YOUR_EMAIL --password YOUR_PASS
"""

import argparse
import requests
import time
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class PerformanceAssessment:
    def __init__(self, base_url: str, auth_token: str = None):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        if auth_token:
            self.session.headers['Authorization'] = f'Bearer {auth_token}'
        
        self.results = {
            'endpoints': [],
            'pages': [],
            'slow_queries': [],
            'recommendations': []
        }
    
    def login(self, email: str, password: str) -> bool:
        """Login and set auth token."""
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('access_token')
                if token:
                    self.session.headers['Authorization'] = f'Bearer {token}'
                    return True
            return False
        except Exception as e:
            print(f"Login failed: {str(e)}")
            return False
    
    def test_endpoint(self, path: str, method: str = 'GET', data: dict = None) -> Tuple[float, int, dict]:
        """Test a single endpoint and return (time, status_code, response_data)."""
        start = time.perf_counter()
        
        try:
            if method == 'GET':
                response = self.session.get(f"{self.base_url}{path}", timeout=30)
            elif method == 'POST':
                response = self.session.post(
                    f"{self.base_url}{path}",
                    json=data,
                    timeout=30
                )
            
            elapsed = time.perf_counter() - start
            
            try:
                response_data = response.json()
            except:
                response_data = {'raw': response.text[:200]}
            
            return elapsed, response.status_code, response_data
            
        except requests.exceptions.Timeout:
            return 30.0, 408, {'error': 'Request timeout'}
        except Exception as e:
            return 0, 500, {'error': str(e)}
    
    def test_all_endpoints(self):
        """Test all API endpoints."""
        print("\n" + "=" * 70)
        print("API Endpoint Performance Testing")
        print("=" * 70)
        
        endpoints = [
            # Dashboard
            ('Dashboard Stats', '/api/dashboard/stats', 'GET', None),
            ('Dashboard Positions', '/api/dashboard/positions', 'GET', None),
            
            # Options
            ('Expirations - TSLA', '/api/options/expirations/TSLA', 'GET', None),
            ('Expirations - AAPL', '/api/options/expirations/AAPL', 'GET', None),
            ('Quote - TSLA', '/api/options/quote/TSLA', 'GET', None),
            
            # Opportunities - Today's opportunities (main endpoint)
            ('Opportunities: Today', '/api/opportunities/today', 'GET', None),
            ('Opportunities: Market Movers', '/api/opportunities/market-movers', 'GET', None),
            
            # Health
            ('Health Check', '/health', 'GET', None),
            
            # Alerts
            ('Alerts List', '/api/alerts', 'GET', None),
        ]
        
        for name, path, method, data in endpoints:
            elapsed, status, response_data = self.test_endpoint(path, method, data)
            
            # Determine status
            if status >= 500:
                status_icon = '❌'
                status_text = f'ERROR ({status})'
            elif status >= 400:
                status_icon = '⚠️'
                status_text = f'CLIENT ERROR ({status})'
            elif elapsed > 5.0:
                status_icon = '❌'
                status_text = f'CRITICAL SLOW ({elapsed:.2f}s)'
            elif elapsed > 2.0:
                status_icon = '⚠️'
                status_text = f'SLOW ({elapsed:.2f}s)'
            elif elapsed > 1.0:
                status_icon = '⚡'
                status_text = f'OK ({elapsed:.2f}s)'
            else:
                status_icon = '✅'
                status_text = f'FAST ({elapsed:.2f}s)'
            
            print(f"{status_icon} {name:40s} {status_text}")
            
            # Store result
            self.results['endpoints'].append({
                'name': name,
                'path': path,
                'elapsed': elapsed,
                'status': status,
                'response_size': len(str(response_data))
            })
            
            # Add to recommendations if slow
            if elapsed > 2.0 and status < 400:
                self.results['recommendations'].append({
                    'type': 'slow_endpoint',
                    'endpoint': path,
                    'time': elapsed,
                    'recommendation': f'Optimize {name} - currently taking {elapsed:.2f}s (target: <2s)'
                })
    
    def test_opportunities_page(self):
        """Deep dive into Opportunities page performance."""
        print("\n" + "=" * 70)
        print("Opportunities Page Deep Dive")
        print("=" * 70)
        
        # Test the main opportunities endpoints
        tabs = [
            ('Today\'s Opportunities', '/api/opportunities/today'),
            ('Market Movers', '/api/opportunities/market-movers?limit=20'),
        ]
        
        for tab_name, endpoint in tabs:
            print(f"\n📊 {tab_name}:")
            print("-" * 60)
            
            elapsed, status, data = self.test_endpoint(endpoint)
            
            if status == 200:
                opportunities = data.get('opportunities', [])
                if not opportunities:
                    opportunities = data.get('data', [])
                
                count = len(opportunities)
                
                print(f"   ⏱️  Load time: {elapsed:.2f}s")
                print(f"   📈 Items: {count}")
                
                if count > 0:
                    print(f"   ⚡ Time per item: {elapsed/count:.3f}s")
                
                # Analyze data structure
                if opportunities:
                    sample = opportunities[0]
                    fields = len(sample.keys()) if isinstance(sample, dict) else 0
                    print(f"   📝 Fields per item: {fields}")
                    
                    # Show sample fields
                    if isinstance(sample, dict):
                        field_names = list(sample.keys())[:10]
                        print(f"   📋 Sample fields: {', '.join(field_names)}")
                
                # Performance assessment
                if elapsed > 5.0:
                    print(f"   ❌ CRITICAL: {elapsed:.2f}s is unacceptable")
                    self.results['recommendations'].append({
                        'type': 'critical_slow',
                        'page': f'Opportunities - {tab_name}',
                        'time': elapsed,
                        'recommendation': f'Urgent: Optimize {tab_name} tab (target: <2s, current: {elapsed:.2f}s)'
                    })
                elif elapsed > 2.0:
                    print(f"   ⚠️  WARNING: {elapsed:.2f}s exceeds 2s target")
                    self.results['recommendations'].append({
                        'type': 'slow',
                        'page': f'Opportunities - {tab_name}',
                        'time': elapsed,
                        'recommendation': f'Optimize {tab_name} tab (target: <2s, current: {elapsed:.2f}s)'
                    })
                else:
                    print(f"   ✅ OK: {elapsed:.2f}s is acceptable")
                    
            elif status == 404:
                print(f"   ⚠️  Endpoint not found: {endpoint}")
            elif status == 401:
                print(f"   ⚠️  Authentication required for: {endpoint}")
            else:
                print(f"   ❌ ERROR: Status {status}")
                if isinstance(data, dict) and 'error' in data:
                    print(f"   Message: {data.get('error', 'Unknown error')}")
    
    def test_dashboard_performance(self):
        """Test dashboard page performance."""
        print("\n" + "=" * 70)
        print("Dashboard Page Performance")
        print("=" * 70)
        
        endpoints = [
            ('Stats', '/api/dashboard/stats'),
            ('Positions', '/api/dashboard/positions'),
            ('Performance', '/api/performance/summary'),
        ]
        
        for name, endpoint in endpoints:
            print(f"\n📊 {name}:")
            print("-" * 60)
            
            elapsed, status, data = self.test_endpoint(endpoint)
            
            if status == 200:
                print(f"   ⏱️  Load time: {elapsed:.2f}s")
                
                if elapsed > 2.0:
                    print(f"   ⚠️  WARNING: {elapsed:.2f}s exceeds 2s target")
                else:
                    print(f"   ✅ OK: {elapsed:.2f}s is acceptable")
            else:
                print(f"   ⚠️  Status: {status}")
    
    def test_alerts_performance(self):
        """Test alerts system performance."""
        print("\n" + "=" * 70)
        print("Alerts System Performance")
        print("=" * 70)
        
        # Test alert retrieval
        print("\n📊 Alerts List:")
        print("-" * 60)
        
        elapsed, status, data = self.test_endpoint('/api/alerts')
        
        if status == 200:
            alerts = data.get('alerts', [])
            if not alerts:
                alerts = data.get('data', [])
            
            count = len(alerts)
            
            print(f"   ⏱️  Load time: {elapsed:.2f}s")
            print(f"   📈 Alert count: {count}")
            
            if count > 0:
                print(f"   ⚡ Time per alert: {elapsed/count:.3f}s")
            
            if elapsed > 2.0:
                print(f"   ⚠️  Alerts loading slowly ({elapsed:.2f}s for {count} alerts)")
                self.results['recommendations'].append({
                    'type': 'slow',
                    'page': 'Alerts',
                    'time': elapsed,
                    'recommendation': f'Optimize alerts loading (target: <2s, current: {elapsed:.2f}s)'
                })
            else:
                print(f"   ✅ Alerts load time acceptable")
            
            # Test alert filtering if authenticated
            if self.session.headers.get('Authorization'):
                print("\n📊 Active Alerts Filter:")
                print("-" * 60)
                
                elapsed_filter, status_filter, data_filter = self.test_endpoint('/api/alerts?status=active')
                
                if status_filter == 200:
                    print(f"   ⏱️  Filter time: {elapsed_filter:.2f}s")
                    if elapsed_filter > 1.0:
                        print(f"   ⚠️  Filtering takes {elapsed_filter:.2f}s")
                    else:
                        print(f"   ✅ Filtering acceptable")
        elif status == 401:
            print(f"   ⚠️  Authentication required")
        else:
            print(f"   ❌ ERROR: Status {status}")
    
    def generate_report(self):
        """Generate comprehensive performance report."""
        print("\n" + "=" * 70)
        print("Performance Assessment Summary")
        print("=" * 70)
        
        # Endpoint summary
        total_endpoints = len(self.results['endpoints'])
        if total_endpoints == 0:
            print("\n⚠️  No endpoints tested")
            return
        
        fast = sum(1 for e in self.results['endpoints'] if e['elapsed'] < 1.0)
        ok = sum(1 for e in self.results['endpoints'] if 1.0 <= e['elapsed'] < 2.0)
        slow = sum(1 for e in self.results['endpoints'] if 2.0 <= e['elapsed'] < 5.0)
        critical = sum(1 for e in self.results['endpoints'] if e['elapsed'] >= 5.0)
        errors = sum(1 for e in self.results['endpoints'] if e['status'] >= 400)
        
        print(f"\n📊 Endpoint Performance:")
        print(f"   ✅ Fast (<1s):     {fast}/{total_endpoints}")
        print(f"   ⚡ OK (1-2s):      {ok}/{total_endpoints}")
        print(f"   ⚠️  Slow (2-5s):   {slow}/{total_endpoints}")
        print(f"   ❌ Critical (>5s): {critical}/{total_endpoints}")
        print(f"   ❌ Errors:         {errors}/{total_endpoints}")
        
        # Slowest endpoints
        valid_endpoints = [e for e in self.results['endpoints'] if e['status'] < 400]
        if valid_endpoints:
            slowest = sorted(valid_endpoints, key=lambda x: x['elapsed'], reverse=True)[:5]
            
            print(f"\n🐌 Top 5 Slowest Endpoints:")
            for i, endpoint in enumerate(slowest, 1):
                print(f"   {i}. {endpoint['name']:40s} {endpoint['elapsed']:.2f}s")
        
        # Recommendations
        if self.results['recommendations']:
            print(f"\n💡 Optimization Recommendations:")
            critical_recs = [r for r in self.results['recommendations'] if r['type'] == 'critical_slow']
            slow_recs = [r for r in self.results['recommendations'] if r['type'] == 'slow']
            
            if critical_recs:
                print(f"\n   🔴 CRITICAL (Urgent):")
                for i, rec in enumerate(critical_recs, 1):
                    print(f"      {i}. {rec['recommendation']}")
            
            if slow_recs:
                print(f"\n   🟡 SLOW (Optimize):")
                for i, rec in enumerate(slow_recs, 1):
                    print(f"      {i}. {rec['recommendation']}")
        else:
            print(f"\n✅ No critical performance issues found!")
        
        # Overall score
        valid_times = [e['elapsed'] for e in self.results['endpoints'] if e['status'] < 400]
        if valid_times:
            avg_time = sum(valid_times) / len(valid_times)
            
            print(f"\n📈 Overall Performance Score:")
            print(f"   Average response time: {avg_time:.2f}s")
            
            if avg_time < 1.0:
                print(f"   Rating: ⭐⭐⭐⭐⭐ Excellent")
            elif avg_time < 2.0:
                print(f"   Rating: ⭐⭐⭐⭐ Good")
            elif avg_time < 3.0:
                print(f"   Rating: ⭐⭐⭐ Fair")
            else:
                print(f"   Rating: ⭐⭐ Needs Improvement")
        
        # General recommendations
        print(f"\n💡 General Optimization Recommendations:")
        print(f"   1. Implement pagination for endpoints returning >50 items")
        print(f"   2. Add response caching for frequently accessed data")
        print(f"   3. Use database indexes for filtered queries")
        print(f"   4. Implement lazy loading for Opportunities tabs")
        print(f"   5. Add query result limits where appropriate")
        print(f"   6. Consider background workers for slow operations")


def main():
    parser = argparse.ArgumentParser(description='Performance Assessment for IAB Options Bot')
    parser.add_argument(
        '--base-url',
        default='https://web-production-8b7ae.up.railway.app',
        help='Base URL of the application'
    )
    parser.add_argument(
        '--email',
        help='Email for authentication'
    )
    parser.add_argument(
        '--password',
        help='Password for authentication'
    )
    parser.add_argument(
        '--page',
        choices=['all', 'opportunities', 'dashboard', 'alerts'],
        default='all',
        help='Specific page to test'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Verbose output'
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("IAB Options Bot - Performance Assessment")
    print("=" * 70)
    print(f"Target: {args.base_url}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Create assessment instance
    assessment = PerformanceAssessment(args.base_url)
    
    # Login if credentials provided
    if args.email and args.password:
        print("\n🔐 Logging in...")
        if assessment.login(args.email, args.password):
            print("✅ Login successful")
        else:
            print("⚠️  Login failed - testing public endpoints only")
    
    # Run tests based on page selection
    if args.page == 'all' or args.page == 'opportunities':
        assessment.test_opportunities_page()
    
    if args.page == 'all' or args.page == 'dashboard':
        assessment.test_dashboard_performance()
    
    if args.page == 'all' or args.page == 'alerts':
        assessment.test_alerts_performance()
    
    # Always test all endpoints for comprehensive view
    assessment.test_all_endpoints()
    
    # Generate report
    assessment.generate_report()
    
    print("\n" + "=" * 70)
    print("Assessment Complete")
    print("=" * 70)
    print("\n💡 Next Steps:")
    print("   1. Review recommendations above")
    print("   2. Run: python scripts/quick_performance_fixes.py --preview")
    print("   3. Apply fixes: python scripts/quick_performance_fixes.py --apply")
    print("   4. Re-run assessment to verify improvements")


if __name__ == '__main__':
    main()

