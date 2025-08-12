import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVoiceRecording } from '../useVoiceRecording';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { audioManager } from '../../services/AudioManager';
import { voiceDiagnostics } from '../../utils/voiceDiagnostics';

// Mock dependencies
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 'medium',
    Light: 'light',
  },
}));

jest.mock('../../services/AudioManager', () => ({
  audioManager: {
    setRecordingMode: jest.fn(),
    forceResetRecordingMode: jest.fn(),
    getRecordingStatus: jest.fn().mockReturnValue({
      isRecordingActive: false,
      recordingDuration: 0,
      initialized: true,
    }),
  },
}));

jest.mock('../../utils/voiceDiagnostics', () => ({
  voiceDiagnostics: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    logEvent: jest.fn(),
    recordFailure: jest.fn(),
    getDiagnosticSummary: jest.fn().mockReturnValue({
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      averageSessionDuration: 0,
      lastFailureReason: null,
      successRate: 100,
      recentEvents: [],
    }),
    getHealthCheck: jest.fn().mockReturnValue({
      status: 'healthy',
      issues: [],
      recommendations: [],
    }),
    exportLogs: jest.fn().mockReturnValue('{}'),
    reset: jest.fn(),
  },
}));

// Type the mocked modules
const mockExpoSpeechRecognitionModule = ExpoSpeechRecognitionModule as jest.Mocked<typeof ExpoSpeechRecognitionModule>;
const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;
const mockAudioManager = audioManager as jest.Mocked<typeof audioManager>;
const mockVoiceDiagnostics = voiceDiagnostics as jest.Mocked<typeof voiceDiagnostics>;

// Store event listeners for simulation
let eventListeners: { [key: string]: (event: any) => void } = {};

// Mock useSpeechRecognitionEvent to store listeners
const mockUseSpeechRecognitionEvent = require('expo-speech-recognition').useSpeechRecognitionEvent as jest.Mock;
mockUseSpeechRecognitionEvent.mockImplementation((eventName: string, handler: (event: any) => void) => {
  eventListeners[eventName] = handler;
});

describe('useVoiceRecording', () => {
  let mockOnVoiceResult: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    eventListeners = {};
    
    // Setup default mock implementations
    mockExpoSpeechRecognitionModule.getPermissionsAsync.mockResolvedValue({ granted: true });
    mockExpoSpeechRecognitionModule.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mockExpoSpeechRecognitionModule.start.mockResolvedValue(undefined);
    mockExpoSpeechRecognitionModule.stop.mockResolvedValue(undefined);
    mockHaptics.impactAsync.mockResolvedValue(undefined);
    mockAudioManager.setRecordingMode.mockResolvedValue(undefined);
    mockAudioManager.forceResetRecordingMode.mockResolvedValue(undefined);
    mockVoiceDiagnostics.startSession.mockReturnValue(undefined);
    mockVoiceDiagnostics.endSession.mockReturnValue(undefined);
    mockVoiceDiagnostics.logEvent.mockReturnValue(undefined);
    mockVoiceDiagnostics.recordFailure.mockReturnValue(undefined);
    
    // Setup fake timers
    jest.useFakeTimers();
    
    mockOnVoiceResult = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      expect(result.current.recordingState).toBe('idle');
      expect(result.current.volumeLevel).toBe(0);
      expect(result.current.hasPermission).toBeNull();
    });

    it('should check permissions on mount', async () => {
      renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(mockExpoSpeechRecognitionModule.getPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should request permissions if not granted', async () => {
      mockExpoSpeechRecognitionModule.getPermissionsAsync.mockResolvedValue({ granted: false });
      
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(mockExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalled();
      });
    });
  });

  describe('Recording Lifecycle - Single Session', () => {
    it('should start recording successfully', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      // Wait for permissions to be set
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.recordingState).toBe('recording');
      expect(mockExpoSpeechRecognitionModule.start).toHaveBeenCalledWith({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        partialResults: true,
      });
      expect(mockAudioManager.setRecordingMode).toHaveBeenCalledWith(true);
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('medium');
    });

    it('should stop recording successfully with delay', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      // Wait for permissions and start recording
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.recordingState).toBe('recording');
      
      await act(async () => {
        await result.current.stopRecording();
        // Fast-forward the timeout
        jest.advanceTimersByTime(300);
      });
      
      expect(mockExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('should handle speech recognition end event', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.recordingState).toBe('recording');
      
      // Simulate end event
      act(() => {
        eventListeners['end']?.();
      });
      
      expect(result.current.recordingState).toBe('idle');
      
      // Wait for async cleanup to complete
      await waitFor(() => {
        expect(mockAudioManager.forceResetRecordingMode).toHaveBeenCalled();
      });
    });
  });

  describe('Recording Lifecycle - Multiple Sessions', () => {
    it('should handle multiple recording sessions correctly', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      // First recording session
      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.recordingState).toBe('recording');
      
      // Simulate final result
      act(() => {
        eventListeners['result']?.({
          results: [{ transcript: 'hello', isFinal: true }]
        });
      });
      expect(mockOnVoiceResult).toHaveBeenCalledWith('hello');
      
      // End first session
      act(() => {
        eventListeners['end']?.();
      });
      expect(result.current.recordingState).toBe('idle');
      
      // Second recording session should work
      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.recordingState).toBe('recording');
      
      // Simulate interim result only
      act(() => {
        eventListeners['result']?.({
          results: [{ transcript: 'world', isFinal: false }]
        });
      });
      
      // Stop recording manually
      await act(async () => {
        await result.current.stopRecording();
      });
      
      // End should use interim result
      act(() => {
        eventListeners['end']?.();
      });
      expect(mockOnVoiceResult).toHaveBeenCalledWith('world');
      expect(result.current.recordingState).toBe('idle');
      
      // Third recording session should still work
      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.recordingState).toBe('recording');
      
      expect(mockExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(3);
    });

    it('should prevent starting recording when already recording', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      // Start first recording
      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.recordingState).toBe('recording');
      
      // Try to start second recording - should be ignored
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(mockExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
      expect(result.current.recordingState).toBe('recording');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid press and release', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      // Rapid start/stop cycle
      await act(async () => {
        await result.current.startRecording();
        await result.current.stopRecording();
      });
      
      // Simulate end event
      act(() => {
        eventListeners['end']?.();
      });
      
      expect(result.current.recordingState).toBe('idle');
      
      // Should be able to start again immediately
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.recordingState).toBe('recording');
    });

    it('should handle speech recognition errors', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      expect(result.current.recordingState).toBe('recording');
      
      // Simulate error
      await act(async () => {
        eventListeners['error']?.({ error: 'network_error' });
      });
      
      expect(result.current.recordingState).toBe('error');
      
      // Wait for async cleanup to complete
      await waitFor(() => {
        expect(mockAudioManager.forceResetRecordingMode).toHaveBeenCalled();
      });
    });

    it('should handle start recording errors', async () => {
      mockExpoSpeechRecognitionModule.start.mockRejectedValue(new Error('Start failed'));
      
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.recordingState).toBe('error');
      
      // Wait for async cleanup to complete
      await waitFor(() => {
        expect(mockAudioManager.forceResetRecordingMode).toHaveBeenCalled();
      });
    });

    it('should handle stop recording errors', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      mockExpoSpeechRecognitionModule.stop.mockRejectedValue(new Error('Stop failed'));
      
      await act(async () => {
        await result.current.stopRecording();
        // Fast-forward the timeout to trigger the error
        jest.advanceTimersByTime(300);
      });
      
      expect(result.current.recordingState).toBe('error');
      
      // Wait for async cleanup to complete
      await waitFor(() => {
        expect(mockAudioManager.forceResetRecordingMode).toHaveBeenCalled();
      });
    });

    it('should handle empty transcripts', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate empty results
      act(() => {
        eventListeners['result']?.({
          results: [{ transcript: '   ', isFinal: true }]
        });
      });
      
      expect(mockOnVoiceResult).not.toHaveBeenCalled();
      
      act(() => {
        eventListeners['end']?.();
      });
      
      expect(result.current.recordingState).toBe('idle');
    });

    it('should handle interim results when recording is stopped early', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Set interim result
      act(() => {
        eventListeners['result']?.({
          results: [{ transcript: 'interim text', isFinal: false }]
        });
      });
      
      // Stop recording with delay
      await act(async () => {
        await result.current.stopRecording();
        jest.advanceTimersByTime(300);
      });
      
      // End event should use interim result
      act(() => {
        eventListeners['end']?.();
      });
      
      expect(mockOnVoiceResult).toHaveBeenCalledWith('interim text');
      expect(result.current.recordingState).toBe('idle');
    });

    it('should capture last word with delay mechanism', async () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate interim result with partial sentence
      act(() => {
        eventListeners['result']?.({
          results: [{ transcript: 'Is it a', isFinal: false }]
        });
      });
      
      // User stops recording
      await act(async () => {
        await result.current.stopRecording();
        
        // During the delay, more speech is processed
        eventListeners['result']?.({
          results: [{ transcript: 'Is it a cat', isFinal: false }]
        });
        
        // Fast-forward the delay
        jest.advanceTimersByTime(300);
      });
      
      // End event should use the complete interim result
      act(() => {
        eventListeners['end']?.();
      });
      
      expect(mockOnVoiceResult).toHaveBeenCalledWith('Is it a cat');
      expect(result.current.recordingState).toBe('idle');
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      act(() => {
        unmount();
      });
      
      // Should not crash and should have cleaned up properly
      expect(result.current).toBeDefined();
    });

    it('should cleanup ongoing recording on unmount', async () => {
      const { result, unmount } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.recordingState).toBe('recording');
      
      await act(async () => {
        unmount();
      });
      
      expect(mockExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
      
      // Wait for async cleanup to complete
      await waitFor(() => {
        expect(mockAudioManager.forceResetRecordingMode).toHaveBeenCalled();
      });
    });
  });

  describe('Volume Level', () => {
    it('should handle volume change events', () => {
      const { result } = renderHook(() => useVoiceRecording(mockOnVoiceResult));
      
      // Simulate volume change
      act(() => {
        eventListeners['volumechange']?.({ volume: -1 });
      });
      
      // Volume should be normalized to 0-1 range
      expect(result.current.volumeLevel).toBeGreaterThanOrEqual(0);
      expect(result.current.volumeLevel).toBeLessThanOrEqual(1);
    });
  });
});