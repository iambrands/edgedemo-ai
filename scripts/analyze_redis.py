#!/usr/bin/env python3
"""
Redis Cache Analyzer

Analyzes Redis cache usage and optimization opportunities:
- Cache hit/miss rates
- Key patterns
- Memory usage
- TTL analysis
- Unused keys

Usage:
    python scripts/analyze_redis.py
    python scripts/analyze_redis.py --verbose
"""

import argparse
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import redis
except ImportError:
    print("❌ redis package not installed. Install with: pip install redis")
    sys.exit(1)

from app import create_app
from utils.redis_cache import get_redis_cache

class RedisAnalyzer:
    def __init__(self):
        self.redis_client = None
        self.results = {
            'keys': {},
            'patterns': {},
            'memory': {},
            'recommendations': []
        }
    
    def connect(self):
        """Connect to Redis."""
        try:
            cache = get_redis_cache()
            if cache.redis_client:
                self.redis_client = cache.redis_client
                self.redis_client.ping()
                print("✅ Connected to Redis")
                return True
            else:
                print("❌ Redis not configured or unavailable")
                return False
        except Exception as e:
            print(f"❌ Could not connect to Redis: {str(e)}")
            return False
    
    def analyze_info(self):
        """Analyze Redis INFO."""
        print("\n" + "=" * 70)
        print("Redis Server Information")
        print("=" * 70)
        
        try:
            info = self.redis_client.info()
            
            print(f"\nRedis Version: {info.get('redis_version', 'Unknown')}")
            print(f"Uptime: {info.get('uptime_in_days', 0)} days")
            print(f"Connected Clients: {info.get('connected_clients', 0)}")
            print(f"Used Memory: {info.get('used_memory_human', 'Unknown')}")
            print(f"Max Memory: {info.get('maxmemory_human', 'Not set')}")
            
            # Get total keys
            db_keys = info.get('db0', {})
            if isinstance(db_keys, dict):
                total_keys = db_keys.get('keys', 0)
            else:
                total_keys = 0
            print(f"Total Keys: {total_keys}")
            
            # Memory usage
            used_memory = info.get('used_memory', 0)
            max_memory = info.get('maxmemory', 0)
            
            if max_memory > 0:
                memory_percent = (used_memory / max_memory) * 100
                print(f"Memory Usage: {memory_percent:.1f}%")
                
                if memory_percent > 80:
                    self.results['recommendations'].append({
                        'type': 'high_memory',
                        'priority': 'high',
                        'recommendation': f'Redis using {memory_percent:.1f}% of max memory - consider increasing maxmemory'
                    })
            
            # Hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total = hits + misses
            
            if total > 0:
                hit_rate = (hits / total) * 100
                print(f"\nCache Hit Rate: {hit_rate:.1f}%")
                print(f"Hits: {hits:,}")
                print(f"Misses: {misses:,}")
                
                if hit_rate < 80:
                    self.results['recommendations'].append({
                        'type': 'low_hit_rate',
                        'priority': 'medium',
                        'recommendation': f'Cache hit rate is {hit_rate:.1f}% - consider reviewing cache strategy'
                    })
                    
        except Exception as e:
            print(f"\n⚠️  Could not get Redis info: {str(e)}")
    
    def analyze_keys(self):
        """Analyze Redis keys."""
        print("\n" + "=" * 70)
        print("Key Analysis")
        print("=" * 70)
        
        try:
            # Get all keys (be careful in production!)
            keys = list(self.redis_client.scan_iter(match='*', count=1000))
            
            print(f"\nTotal Keys: {len(keys)}")
            
            if len(keys) == 0:
                print("\n⚠️  No keys found in Redis")
                return
            
            # Analyze key patterns
            patterns = {}
            for key in keys:
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                pattern = key_str.split(':')[0] if ':' in key_str else key_str
                patterns[pattern] = patterns.get(pattern, 0) + 1
            
            print("\n📊 Key Patterns:")
            for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
                print(f"   {pattern:30s} {count:6d} keys")
                
                # Store pattern info
                self.results['patterns'][pattern] = count
            
            # Analyze TTLs (sample first 100 keys)
            print("\n⏰ TTL Analysis (sampled):")
            ttl_stats = {
                'no_expiry': 0,
                'expired': 0,
                'expiring_soon': 0,  # < 1 hour
                'normal': 0
            }
            
            sample_size = min(100, len(keys))
            for key in keys[:sample_size]:
                try:
                    ttl = self.redis_client.ttl(key)
                    
                    if ttl == -1:
                        ttl_stats['no_expiry'] += 1
                    elif ttl == -2:
                        ttl_stats['expired'] += 1
                    elif ttl < 3600:
                        ttl_stats['expiring_soon'] += 1
                    else:
                        ttl_stats['normal'] += 1
                except:
                    pass
            
            print(f"   No Expiry: {ttl_stats['no_expiry']}")
            print(f"   Expiring Soon (<1h): {ttl_stats['expiring_soon']}")
            print(f"   Normal: {ttl_stats['normal']}")
            
            if ttl_stats['no_expiry'] > 10:
                self.results['recommendations'].append({
                    'type': 'keys_without_ttl',
                    'priority': 'medium',
                    'recommendation': f'{ttl_stats["no_expiry"]} keys have no expiry - consider setting TTLs'
                })
                    
        except Exception as e:
            print(f"\n⚠️  Could not analyze keys: {str(e)}")
    
    def analyze_memory_usage(self):
        """Analyze memory usage by key."""
        print("\n" + "=" * 70)
        print("Memory Usage by Key Pattern")
        print("=" * 70)
        
        try:
            keys = list(self.redis_client.scan_iter(match='*', count=100))
            memory_by_pattern = {}
            
            # Sample keys for memory analysis
            sample_size = min(100, len(keys))
            for key in keys[:sample_size]:
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                pattern = key_str.split(':')[0] if ':' in key_str else key_str
                
                try:
                    memory = self.redis_client.memory_usage(key)
                    if memory:
                        memory_by_pattern[pattern] = memory_by_pattern.get(pattern, 0) + memory
                except:
                    pass
            
            if memory_by_pattern:
                print("\n📊 Memory Usage by Pattern (sampled):")
                for pattern, memory in sorted(memory_by_pattern.items(), key=lambda x: x[1], reverse=True):
                    print(f"   {pattern:30s} {memory:10,} bytes")
        except Exception as e:
            print(f"\n⚠️  Could not analyze memory usage: {str(e)}")
    
    def check_cache_configuration(self):
        """Check Redis configuration for optimization."""
        print("\n" + "=" * 70)
        print("Cache Configuration Check")
        print("=" * 70)
        
        try:
            config = self.redis_client.config_get('*')
            
            # Check eviction policy
            eviction_policy = config.get('maxmemory-policy', 'noeviction')
            print(f"\nEviction Policy: {eviction_policy}")
            
            if eviction_policy == 'noeviction':
                self.results['recommendations'].append({
                    'type': 'eviction_policy',
                    'priority': 'high',
                    'recommendation': 'Eviction policy is "noeviction" - consider using "allkeys-lru" or "volatile-lru"'
                })
                print("   ⚠️  WARNING: noeviction policy can cause issues when memory is full")
            
            # Check persistence
            save_config = config.get('save', '')
            print(f"Persistence: {save_config or 'Disabled'}")
            
            # Check maxmemory
            maxmemory = config.get('maxmemory', '0')
            print(f"Max Memory: {maxmemory}")
            
            if maxmemory == '0':
                self.results['recommendations'].append({
                    'type': 'maxmemory_not_set',
                    'priority': 'medium',
                    'recommendation': 'maxmemory not set - Redis can use unlimited memory'
                })
                
        except Exception as e:
            print(f"\n⚠️  Could not check configuration: {str(e)}")
    
    def generate_report(self):
        """Generate optimization recommendations."""
        print("\n" + "=" * 70)
        print("Redis Optimization Recommendations")
        print("=" * 70)
        
        if not self.results['recommendations']:
            print("\n✅ No Redis optimization recommendations!")
            return
        
        high_priority = [r for r in self.results['recommendations'] if r.get('priority') == 'high']
        medium_priority = [r for r in self.results['recommendations'] if r.get('priority') == 'medium']
        
        if high_priority:
            print("\n🔴 HIGH PRIORITY:")
            for i, rec in enumerate(high_priority, 1):
                print(f"   {i}. {rec['recommendation']}")
        
        if medium_priority:
            print("\n🟡 MEDIUM PRIORITY:")
            for i, rec in enumerate(medium_priority, 1):
                print(f"   {i}. {rec['recommendation']}")


def main():
    parser = argparse.ArgumentParser(description='Redis Cache Analyzer')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()
    
    print("=" * 70)
    print("IAB Options Bot - Redis Cache Analysis")
    print("=" * 70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    analyzer = RedisAnalyzer()
    
    if not analyzer.connect():
        print("\n❌ Cannot proceed without Redis connection")
        return
    
    # Run analyses
    analyzer.analyze_info()
    analyzer.analyze_keys()
    analyzer.analyze_memory_usage()
    analyzer.check_cache_configuration()
    
    # Generate report
    analyzer.generate_report()
    
    print("\n" + "=" * 70)
    print("Analysis Complete")
    print("=" * 70)


if __name__ == '__main__':
    main()

