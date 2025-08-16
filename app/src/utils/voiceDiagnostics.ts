/**
 * Voice input diagnostics utility for debugging voice recognition issues.
 * Provides comprehensive logging, metrics tracking, and session monitoring.
 */

/**
 * Singleton class for tracking voice input diagnostics and metrics.
 */
export class VoiceDiagnostics {
  private static instance: VoiceDiagnostics;
  private sessionLog: Array<{
    timestamp: number;
    sessionId: number;
    event: string;
    data?: any;
  }> = [];
  
  private recordingMetrics = {
    totalSessions: 0,
    successfulSessions: 0,
    failedSessions: 0,
    averageSessionDuration: 0,
    lastFailureReason: null as string | null,
  };

  /**
   * Gets the singleton instance of VoiceDiagnostics.
   */
  static getInstance(): VoiceDiagnostics {
    if (!VoiceDiagnostics.instance) {
      VoiceDiagnostics.instance = new VoiceDiagnostics();
    }
    return VoiceDiagnostics.instance;
  }

  /**
   * Logs a voice session event with timestamp and optional data.
   */
  logEvent(sessionId: number, event: string, data?: any) {
    const timestamp = Date.now();
    this.sessionLog.push({
      timestamp,
      sessionId,
      event,
      data
    });

    // Log to console with enhanced formatting
    console.log(`🔍 [DIAG-${sessionId}] ${event}`, data ? JSON.stringify(data, null, 2) : '');
    
    // Keep only last 50 entries to prevent memory bloat
    if (this.sessionLog.length > 50) {
      this.sessionLog = this.sessionLog.slice(-50);
    }
  }

  /**
   * Starts a new voice recording session and tracks metrics.
   */
  startSession(sessionId: number) {
    this.recordingMetrics.totalSessions++;
    this.logEvent(sessionId, 'SESSION_START', {
      totalSessions: this.recordingMetrics.totalSessions,
      timestamp: new Date().toISOString()
    });
  }

  endSession(sessionId: number, success: boolean, duration?: number) {
    if (success) {
      this.recordingMetrics.successfulSessions++;
    } else {
      this.recordingMetrics.failedSessions++;
    }

    if (duration) {
      this.recordingMetrics.averageSessionDuration = 
        (this.recordingMetrics.averageSessionDuration + duration) / 2;
    }

    this.logEvent(sessionId, success ? 'SESSION_SUCCESS' : 'SESSION_FAILURE', {
      duration,
      successRate: this.getSuccessRate(),
      totalSessions: this.recordingMetrics.totalSessions,
    });
  }

  recordFailure(sessionId: number, reason: string, error?: any) {
    this.recordingMetrics.lastFailureReason = reason;
    this.logEvent(sessionId, 'FAILURE', {
      reason,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    });
  }

  getSuccessRate(): number {
    if (this.recordingMetrics.totalSessions === 0) return 100;
    return Math.round(
      (this.recordingMetrics.successfulSessions / this.recordingMetrics.totalSessions) * 100
    );
  }

  getDiagnosticSummary() {
    return {
      ...this.recordingMetrics,
      successRate: this.getSuccessRate(),
      recentEvents: this.sessionLog.slice(-10).map(entry => ({
        event: entry.event,
        sessionId: entry.sessionId,
        timestamp: new Date(entry.timestamp).toLocaleTimeString(),
        data: entry.data
      }))
    };
  }

  exportLogs(): string {
    return JSON.stringify({
      metrics: this.recordingMetrics,
      successRate: this.getSuccessRate(),
      fullLog: this.sessionLog
    }, null, 2);
  }

  // Check system health and provide recommendations
  getHealthCheck(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    const successRate = this.getSuccessRate();
    const recentFailures = this.sessionLog
      .filter(entry => entry.event === 'FAILURE')
      .slice(-3);

    // Check success rate
    if (successRate < 50) {
      status = 'critical';
      issues.push(`Low success rate: ${successRate}%`);
      recommendations.push('Restart the app to reset voice module state');
      recommendations.push('Check microphone permissions in system settings');
    } else if (successRate < 80) {
      status = 'warning';
      issues.push(`Moderate success rate: ${successRate}%`);
      recommendations.push('Try restarting the voice recording service');
    }

    // Check for recent failures
    if (recentFailures.length >= 2) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`${recentFailures.length} recent failures detected`);
      recommendations.push('Clear app cache or restart to resolve persistent issues');
    }

    // Check for timeout issues
    const timeoutFailures = this.sessionLog.filter(
      entry => entry.event === 'FAILURE' && 
      entry.data?.reason?.includes('timeout')
    );
    
    if (timeoutFailures.length > 0) {
      issues.push('Timeout issues detected');
      recommendations.push('Check network connection and system performance');
    }

    return { status, issues, recommendations };
  }

  reset() {
    this.sessionLog = [];
    this.recordingMetrics = {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      averageSessionDuration: 0,
      lastFailureReason: null,
    };
    console.log('🔍 Voice diagnostics reset');
  }
}

export const voiceDiagnostics = VoiceDiagnostics.getInstance();