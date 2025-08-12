// Frontend Performance Optimizer
// Handles request optimization, caching, and performance monitoring

interface PerformanceMetrics {
  action: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
}

class FrontendPerformanceOptimizer {
  private metrics: PerformanceMetrics[] = []
  private readonly MAX_METRICS = 50
  
  startTimer(action: string): PerformanceMetrics {
    const metric: PerformanceMetrics = {
      action,
      startTime: Date.now(),
      success: false
    }
    
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }
    
    return metric
  }
  
  endTimer(metric: PerformanceMetrics, success: boolean, error?: string) {
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.success = success
    metric.error = error
    
    console.log(`[Performance] ${metric.action}: ${metric.duration}ms (${success ? 'SUCCESS' : 'ERROR'})`)
    
    if (metric.duration > 3000) {
      console.warn(`[Performance] Slow operation: ${metric.action} took ${metric.duration}ms`)
    }
  }
  
  getStats() {
    const recent = this.metrics.slice(-10)
    
    if (recent.length === 0) return null
    
    const avgDuration = recent.reduce((sum, m) => sum + (m.duration || 0), 0) / recent.length
    const successRate = recent.filter(m => m.success).length / recent.length
    
    return {
      avgDuration: Math.round(avgDuration),
      successRate: Math.round(successRate * 100),
      totalRequests: recent.length
    }
  }
  
  // Prefetch and warm connections
  async warmConnections() {
    const metric = this.startTimer('connection-warming')
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }
      
      // Warm up the edge functions by making a lightweight OPTIONS request
      const warmupPromises = ['start-game', 'ask-question'].map(async (functionName) => {
        try {
          await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
            method: 'OPTIONS',
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (error) {
          // Ignore errors - this is just warmup
        }
      })
      
      await Promise.allSettled(warmupPromises)
      this.endTimer(metric, true)
    } catch (error) {
      this.endTimer(metric, false, error instanceof Error ? error.message : 'Unknown error')
    }
  }
  
  // Optimize image loading and other resources
  preloadResources() {
    const metric = this.startTimer('resource-preloading')
    
    try {
      // Preload any critical resources here
      // For now, just mark as successful since we don't have images
      this.endTimer(metric, true)
    } catch (error) {
      this.endTimer(metric, false, error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

export const performanceOptimizer = new FrontendPerformanceOptimizer()

// Request wrapper with automatic timing and optimization
export async function optimizedRequest<T>(
  requestName: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const metric = performanceOptimizer.startTimer(requestName)
  
  try {
    const result = await requestFn()
    performanceOptimizer.endTimer(metric, true)
    return result
  } catch (error) {
    performanceOptimizer.endTimer(metric, false, error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}