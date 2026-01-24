/**
 * Frontend performance tracking utility
 * Tracks API call timing, slow operations, and generates performance reports
 */

interface PerformanceMetric {
  duration: number;
  timestamp: number;
  status?: number;
}

interface PerformanceReport {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
}

class PerformanceTrackerClass {
  private metrics: { [key: string]: PerformanceMetric[] } = {};
  private enabled: boolean = true;
  private slowThreshold: number = 2000; // 2 seconds

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setSlowThreshold(ms: number) {
    this.slowThreshold = ms;
  }

  /**
   * Track an operation with a duration
   */
  trackOperation(name: string, duration: number, status?: number) {
    if (!this.enabled) return;

    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }

    this.metrics[name].push({
      duration,
      timestamp: Date.now(),
      status
    });

    // Keep last 1000 entries per operation
    if (this.metrics[name].length > 1000) {
      this.metrics[name] = this.metrics[name].slice(-1000);
    }

    // Log slow operations to console
    if (duration > this.slowThreshold) {
      console.warn(`[SLOW] ${name} took ${duration.toFixed(0)}ms`);
    }
  }

  /**
   * Track an async operation
   */
  async trackAsync<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) return operation();

    const start = performance.now();
    let status: number | undefined;

    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      status = error?.response?.status || 0;
      throw error;
    } finally {
      const duration = performance.now() - start;
      this.trackOperation(name, duration, status);
    }
  }

  /**
   * Get performance report for the last N hours
   */
  getReport(hours: number = 24): { [key: string]: PerformanceReport } {
    const report: { [key: string]: PerformanceReport } = {};
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    for (const [name, metrics] of Object.entries(this.metrics)) {
      const recent = metrics.filter((m) => m.timestamp > cutoff);

      if (recent.length > 0) {
        const durations = recent.map((m) => m.duration);
        const sorted = [...durations].sort((a, b) => a - b);

        report[name] = {
          count: durations.length,
          avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          min: Math.round(Math.min(...durations)),
          max: Math.round(Math.max(...durations)),
          p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1])
        };
      }
    }

    return report;
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(hours: number = 1): Array<{ name: string; duration: number; timestamp: number }> {
    const slow: Array<{ name: string; duration: number; timestamp: number }> = [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    for (const [name, metrics] of Object.entries(this.metrics)) {
      for (const metric of metrics) {
        if (metric.timestamp > cutoff && metric.duration > this.slowThreshold) {
          slow.push({
            name,
            duration: Math.round(metric.duration),
            timestamp: metric.timestamp
          });
        }
      }
    }

    return slow.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Log performance report to console
   */
  logReport(hours: number = 24) {
    const report = this.getReport(hours);
    console.log('=== Frontend Performance Report ===');
    console.table(report);

    const slow = this.getSlowOperations(1);
    if (slow.length > 0) {
      console.log('=== Slow Operations (last hour) ===');
      console.table(slow.slice(0, 10));
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {};
  }

  /**
   * Get raw metrics for debugging
   */
  getRawMetrics() {
    return this.metrics;
  }
}

// Export singleton instance
export const PerformanceTracker = new PerformanceTrackerClass();

// Also export as default for convenience
export default PerformanceTracker;

// Make available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).PerformanceTracker = PerformanceTracker;
}
