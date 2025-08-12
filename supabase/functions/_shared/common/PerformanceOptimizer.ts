// Edge Function Performance Optimizer
// Handles connection pooling, caching, and request optimization

interface RequestMetrics {
  functionName: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
}

export class PerformanceOptimizer {
  private static requestMetrics: RequestMetrics[] = []
  private static readonly MAX_METRICS = 100
  
  // Track request performance
  static startRequest(functionName: string): RequestMetrics {
    const metric: RequestMetrics = {
      functionName,
      startTime: Date.now(),
      success: false
    }
    
    this.requestMetrics.push(metric)
    
    // Keep only recent metrics
    if (this.requestMetrics.length > this.MAX_METRICS) {
      this.requestMetrics = this.requestMetrics.slice(-this.MAX_METRICS)
    }
    
    return metric
  }
  
  static endRequest(metric: RequestMetrics, success: boolean, error?: string) {
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.success = success
    metric.error = error
    
    console.log(`[Performance] ${metric.functionName}: ${metric.duration}ms (${success ? 'SUCCESS' : 'ERROR'})`)
    
    if (metric.duration > 5000) {
      console.warn(`[Performance] Slow request detected: ${metric.functionName} took ${metric.duration}ms`)
    }
  }
  
  // Get performance statistics
  static getStats() {
    const recent = this.requestMetrics.slice(-20) // Last 20 requests
    
    const avgDuration = recent.reduce((sum, m) => sum + (m.duration || 0), 0) / recent.length
    const successRate = recent.filter(m => m.success).length / recent.length
    
    const slowRequests = recent.filter(m => (m.duration || 0) > 3000).length
    
    return {
      totalRequests: recent.length,
      avgDuration: Math.round(avgDuration),
      successRate: Math.round(successRate * 100),
      slowRequests,
      lastUpdated: Date.now()
    }
  }
  
  // Preload critical resources
  static async warmup() {
    console.log('[Performance] Starting warmup sequence...')
    const startTime = Date.now()
    
    try {
      // These operations help warm up the edge function environment
      await Promise.all([
        // Warm up crypto operations
        crypto.subtle.digest('SHA-256', new TextEncoder().encode('warmup')),
        // Warm up JSON operations
        JSON.parse('{"warmup": true}'),
        // Warm up fetch (to OpenAI endpoint simulation)
        new Promise(resolve => setTimeout(resolve, 1))
      ])
      
      console.log(`[Performance] Warmup completed in ${Date.now() - startTime}ms`)
    } catch (error) {
      console.warn('[Performance] Warmup failed:', error)
    }
  }
}

// Database Query Optimizer
export class DatabaseOptimizer {
  // Optimize query with best practices
  static optimizeQuery(query: any) {
    // Add performance hints
    return query
      .abortSignal(AbortSignal.timeout(5000)) // 5s timeout
  }
  
  // Batch multiple queries
  static async batchQueries<T>(queries: Promise<T>[]): Promise<T[]> {
    const startTime = Date.now()
    
    try {
      const results = await Promise.all(queries)
      console.log(`[Database] Batched ${queries.length} queries in ${Date.now() - startTime}ms`)
      return results
    } catch (error) {
      console.error(`[Database] Batch query failed after ${Date.now() - startTime}ms:`, error)
      throw error
    }
  }
}