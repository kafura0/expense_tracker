/**
 * Performance monitoring utilities for Ledgerly
 * 
 * These utilities help track and measure performance metrics
 * for optimization and debugging.
 */

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000

  /**
   * Record a performance metric
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    })

    // Trim old metrics if we exceed the limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name)
  }

  /**
   * Calculate average duration for a metric
   */
  getAverageDuration(name: string): number {
    const namedMetrics = this.getMetricsByName(name)
    if (namedMetrics.length === 0) return 0

    const total = namedMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / namedMetrics.length
  }

  /**
   * Calculate p95 duration for a metric
   */
  getP95Duration(name: string): number {
    const namedMetrics = this.getMetricsByName(name)
    if (namedMetrics.length === 0) return 0

    const sorted = namedMetrics.map(m => m.duration).sort((a, b) => a - b)
    const p95Index = Math.floor(sorted.length * 0.95)
    return sorted[p95Index]
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Get summary statistics
   */
  getSummary(): Record<string, { count: number; avg: number; p95: number }> {
    const names = [...new Set(this.metrics.map(m => m.name))]
    const summary: Record<string, { count: number; avg: number; p95: number }> = {}

    for (const name of names) {
      summary[name] = {
        count: this.getMetricsByName(name).length,
        avg: this.getAverageDuration(name),
        p95: this.getP95Duration(name),
      }
    }

    return summary
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor()

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    perfMonitor.record({ name, duration, metadata })
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    
    perfMonitor.record({
      name,
      duration,
      metadata: { ...metadata, error: (error as Error).message },
    })
    
    throw error
  }
}

/**
 * Measure execution time of a synchronous function
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const start = performance.now()
  
  try {
    const result = fn()
    const duration = performance.now() - start
    
    perfMonitor.record({ name, duration, metadata })
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    
    perfMonitor.record({
      name,
      duration,
      metadata: { ...metadata, error: (error as Error).message },
    })
    
    throw error
  }
}

/**
 * React hook for measuring component render time
 */
export function measureRender(componentName: string): void {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const entry = performance.getEntriesByName(`render-${componentName}`)[0]
    if (entry) {
      perfMonitor.record({
        name: `render:${componentName}`,
        duration: entry.duration,
      })
    }
  }
}

/**
 * API response time middleware for Next.js
 */
export function withPerformanceTracking<T>(
  name: string,
  handler: () => Promise<T>
): () => Promise<T> {
  return async () => {
    return measureAsync(name, handler)
  }
}
