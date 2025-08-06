import { useState, useEffect, useRef } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { audioManager } from '../services/AudioManager';

type RecordingState = 'idle' | 'recording' | 'error';

export interface VoiceRecordingHook {
  recordingState: RecordingState;
  hasPermission: boolean | null;
  volumeLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  setRecordingState: (state: RecordingState) => void;
}

export const useVoiceRecording = (
  onVoiceResult: (transcript: string) => void
): VoiceRecordingHook => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [lastInterimResult, setLastInterimResult] = useState('');
  const isRecordingRef = useRef(false);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkPermissions();
    
    // Cleanup function to handle component unmount
    return () => {
      // Clear any pending stop timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      // Stop any ongoing recording when component unmounts
      if (isRecordingRef.current) {
        ExpoSpeechRecognitionModule.stop().catch(console.error);
        audioManager.setRecordingMode(false).catch(console.error);
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      console.log('🔑 Checking microphone permissions...');
      const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      console.log('🔑 Permission status:', status);
      
      if (status.granted) {
        console.log('✅ Permission already granted');
        setHasPermission(true);
      } else {
        console.log('❓ Requesting permission...');
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        console.log('🔑 Permission request result:', result);
        setHasPermission(result.granted);
        
        if (result.granted) {
          console.log('✅ Permission granted!');
        } else {
          console.log('❌ Permission denied');
        }
      }
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      console.log('⚠️ Attempting to continue without explicit permission check');
      setHasPermission(true);
    }
  };

  useSpeechRecognitionEvent('result', (event) => {
    console.log('🎯 Speech result event:', event);
    const result = event.results[0];
    if (result) {
      console.log('📝 Transcript:', result.transcript, 'isFinal:', result.isFinal);
      console.log('📝 Transcript length:', result.transcript.length, 'words:', result.transcript.split(' ').length);
      if (result.isFinal && result.transcript.trim()) {
        console.log('✅ Final result received, processing:', result.transcript);
        setLastInterimResult('');
        onVoiceResult(result.transcript);
      } else if (result.transcript.trim()) {
        console.log('📝 Interim result:', result.transcript);
        setLastInterimResult(result.transcript);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('❌ Speech recognition error:', event.error);
    isRecordingRef.current = false;
    setRecordingState('error');
    audioManager.setRecordingMode(false).catch(console.error);
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('🔚 Speech recognition ended');
    console.log('🔚 Last interim result:', lastInterimResult);
    console.log('🔚 Was recording:', isRecordingRef.current);
    
    // Only process interim results if we were actively recording and have text
    if (lastInterimResult.trim() && isRecordingRef.current) {
      console.log('🔄 Using interim result as final:', lastInterimResult);
      console.log('🔄 Interim result length:', lastInterimResult.length, 'words:', lastInterimResult.split(' ').length);
      onVoiceResult(lastInterimResult);
      setLastInterimResult('');
    }
    
    // Always reset state when recognition ends
    isRecordingRef.current = false;
    setRecordingState('idle');
    audioManager.setRecordingMode(false).catch(console.error);
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    const normalizedVolume = Math.max(0, Math.min(1, (event.volume + 2) / 12));
    setVolumeLevel(normalizedVolume);
  });

  useEffect(() => {
    let volumeInterval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      volumeInterval = setInterval(() => {
        const baseVolume = 0.3 + Math.random() * 0.4;
        const timeVariation = Math.sin(Date.now() / 500) * 0.2;
        const simulatedVolume = Math.max(0.1, Math.min(0.9, baseVolume + timeVariation));
        setVolumeLevel(simulatedVolume);
      }, 100);
    }
    return () => {
      if (volumeInterval) clearInterval(volumeInterval);
    };
  }, [recordingState]);

  const startRecording = async () => {
    console.log('🎤 startRecording called');
    console.log('🎤 hasPermission:', hasPermission);
    console.log('🎤 recordingState:', recordingState);
    console.log('🎤 isRecordingRef:', isRecordingRef.current);
    
    if (recordingState !== 'idle' || isRecordingRef.current) {
      console.log('❌ Already recording or in error state:', recordingState);
      return;
    }
    
    if (!hasPermission) {
      console.log('❌ No microphone permission');
      setRecordingState('error');
      return;
    }
    
    try {
      console.log('🎤 Setting recording state to recording');
      isRecordingRef.current = true;
      setRecordingState('recording');
      setLastInterimResult('');
      
      await audioManager.setRecordingMode(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('🎤 Starting speech recognition');
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        maxResults: 1,
      });
      console.log('🎤 Speech recognition started successfully');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      isRecordingRef.current = false;
      setRecordingState('error');
      await audioManager.setRecordingMode(false);
    }
  };

  const stopRecording = async () => {
    console.log('🎤 stopRecording called, current state:', recordingState);
    console.log('🎤 isRecordingRef:', isRecordingRef.current);
    
    if (!isRecordingRef.current) {
      console.log('❌ Not currently recording, ignoring stop call');
      return;
    }
    
    try {
      console.log('🎤 Adding 300ms delay before stopping to capture final words');
      
      // Clear any existing timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      
      // Add a small delay to allow final word processing
      stopTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('🎤 Stopping speech recognition after delay');
          await ExpoSpeechRecognitionModule.stop();
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('🎤 Recording stopped successfully');
        } catch (error) {
          console.error('❌ Failed to stop recording after delay:', error);
          // Manual cleanup on error
          isRecordingRef.current = false;
          setRecordingState('error');
          await audioManager.setRecordingMode(false);
        }
      }, 300); // 300ms delay to allow final word processing

    } catch (error) {
      console.error('❌ Failed to setup stop timeout:', error);
      // Manual cleanup on error
      isRecordingRef.current = false;
      setRecordingState('error');
      await audioManager.setRecordingMode(false);
    }
  };

  return {
    recordingState,
    hasPermission,
    volumeLevel,
    startRecording,
    stopRecording,
    setRecordingState,
  };
};