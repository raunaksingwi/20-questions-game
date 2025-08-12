import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { voiceDiagnostics } from '../../utils/voiceDiagnostics';
import { audioManager } from '../../services/AudioManager';

export const VoiceDiagnosticsDashboard: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const [diagnosticsData, setDiagnosticsData] = useState(voiceDiagnostics.getDiagnosticSummary());
  const [audioStatus, setAudioStatus] = useState(audioManager.getRecordingStatus());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setDiagnosticsData(voiceDiagnostics.getDiagnosticSummary());
      setAudioStatus(audioManager.getRecordingStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const handleExportLogs = () => {
    const logs = voiceDiagnostics.exportLogs();
    Alert.alert(
      'Diagnostic Logs',
      'Logs exported to console. Check developer tools.',
      [{ text: 'OK' }]
    );
    console.log('🔍 VOICE DIAGNOSTICS EXPORT:', logs);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Diagnostics',
      'This will clear all diagnostic data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => voiceDiagnostics.reset()
        }
      ]
    );
  };

  if (!visible) return null;

  const healthCheck = voiceDiagnostics.getHealthCheck();
  const getHealthColor = () => {
    switch (healthCheck.status) {
      case 'healthy': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerContent}>
          <Feather name="activity" size={16} color="#6366F1" />
          <Text style={styles.headerText}>Voice Diagnostics</Text>
          <View style={[styles.healthIndicator, { backgroundColor: getHealthColor() }]} />
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#6B7280" />
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.content}>
          {/* Health Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Status: {healthCheck.status.toUpperCase()}</Text>
            {healthCheck.issues.length > 0 && (
              <View style={styles.issuesContainer}>
                <Text style={styles.issuesTitle}>Issues:</Text>
                {healthCheck.issues.map((issue, index) => (
                  <Text key={index} style={styles.issueText}>• {issue}</Text>
                ))}
              </View>
            )}
            {healthCheck.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                {healthCheck.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Session Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{diagnosticsData.totalSessions}</Text>
                <Text style={styles.metricLabel}>Total Sessions</Text>
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: getHealthColor() }]}>
                  {diagnosticsData.successRate}%
                </Text>
                <Text style={styles.metricLabel}>Success Rate</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{Math.round(diagnosticsData.averageSessionDuration)}ms</Text>
                <Text style={styles.metricLabel}>Avg Duration</Text>
              </View>
            </View>
          </View>

          {/* Audio Manager Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audio Manager</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Recording Active:</Text>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: audioStatus.isRecordingActive ? '#EF4444' : '#10B981' }
                ]} />
                <Text style={styles.statusText}>
                  {audioStatus.isRecordingActive ? 'YES' : 'NO'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Initialized:</Text>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: audioStatus.initialized ? '#10B981' : '#EF4444' }
                ]} />
                <Text style={styles.statusText}>
                  {audioStatus.initialized ? 'YES' : 'NO'}
                </Text>
              </View>
              {audioStatus.recordingDuration > 0 && (
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Duration:</Text>
                  <Text style={styles.statusText}>{audioStatus.recordingDuration}ms</Text>
                </View>
              )}
            </View>
          </View>

          {/* Recent Events */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            {diagnosticsData.recentEvents.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventName}>[{event.sessionId}] {event.event}</Text>
                  <Text style={styles.eventTime}>{event.timestamp}</Text>
                </View>
                {event.data && (
                  <Text style={styles.eventData}>
                    {typeof event.data === 'string' ? event.data : JSON.stringify(event.data)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportLogs}>
              <Feather name="download" size={14} color="#FFFFFF" />
              <Text style={styles.buttonText}>Export Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Feather name="refresh-cw" size={14} color="#FFFFFF" />
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    maxHeight: 400,
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  issuesContainer: {
    marginTop: 4,
  },
  issuesTitle: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  issueText: {
    color: '#EF4444',
    fontSize: 10,
    marginLeft: 4,
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendationText: {
    color: '#F59E0B',
    fontSize: 10,
    marginLeft: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
  },
  statusGrid: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    minWidth: 80,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  eventItem: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  eventTime: {
    color: '#9CA3AF',
    fontSize: 9,
  },
  eventData: {
    color: '#9CA3AF',
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});