import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import WaveformVisualizer from './WaveformVisualizer';
import { audioManager } from '../services/AudioManager';

type VoiceInputButtonProps = {
  onTextSubmit: () => void;
  onVoiceSubmit: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  disabled?: boolean;
  isRecording?: boolean;
};

type RecordingState = 'idle' | 'recording' | 'error';

export default function VoiceInputButton({
  onTextSubmit,
  onVoiceSubmit,
  inputText,
  setInputText,
  disabled = false,
}: VoiceInputButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [lastInterimResult, setLastInterimResult] = useState('');
  
  // Reanimated shared values for smooth animations
  const buttonWidth = useSharedValue(40); // Circular button width
  const buttonHeight = useSharedValue(40); // Button height  
  const borderRadius = useSharedValue(20); // Circular initially
  
  // Animated style based on shared values
  const animatedButtonStyle = useAnimatedStyle(() => ({
    width: buttonWidth.value,
    height: buttonHeight.value,
    borderRadius: borderRadius.value,
  }));

  // Check for microphone permissions on mount
  useEffect(() => {
    checkPermissions();
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
      // For debugging, let's try anyway on the device
      console.log('⚠️ Attempting to continue without explicit permission check');
      setHasPermission(true);
    }
  };

  // Speech recognition event handlers
  useSpeechRecognitionEvent('result', (event) => {
    console.log('🎯 Speech result event:', event);
    const result = event.results[0];
    if (result) {
      console.log('📝 Transcript:', result.transcript, 'isFinal:', result.isFinal);
      if (result.isFinal && result.transcript.trim()) {
        console.log('✅ Final result received, processing:', result.transcript);
        setLastInterimResult(''); // Clear interim result
        handleVoiceResult(result.transcript);
      } else if (result.transcript.trim()) {
        console.log('📝 Interim result:', result.transcript);
        setLastInterimResult(result.transcript); // Store interim result as fallback
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('❌ Speech recognition error:', event.error);
    setRecordingState('error');
    stopRecording();
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('🔚 Speech recognition ended');
    console.log('🔚 Last interim result:', lastInterimResult);
    
    // If we have an interim result but no final result was processed, use the interim result
    if (lastInterimResult.trim() && recordingState === 'recording') {
      console.log('🔄 Using interim result as final:', lastInterimResult);
      handleVoiceResult(lastInterimResult);
      setLastInterimResult('');
    } else {
      // Simply return to idle state when speech recognition ends
      setRecordingState('idle');
    }
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    // Convert volume from range [-2, 10] to [0, 1]
    const normalizedVolume = Math.max(0, Math.min(1, (event.volume + 2) / 12));
    setVolumeLevel(normalizedVolume);
  });

  // Simulate volume changes for better visual feedback
  useEffect(() => {
    let volumeInterval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      volumeInterval = setInterval(() => {
        // Create realistic volume simulation
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
    
    // Prevent multiple calls
    if (recordingState !== 'idle') {
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
      setRecordingState('recording');
      setLastInterimResult(''); // Clear any previous interim result
      
      // Coordinate with AudioManager - lower game sound volume
      await audioManager.setRecordingMode(true);
      
      // Haptic feedback for recording start
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('🎤 Starting speech recognition');
      // Start actual speech recognition
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true, // Enable interim results for fallback
        continuous: false,
        maxResults: 1,
      });
      console.log('🎤 Speech recognition started successfully');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setRecordingState('error');
      await audioManager.setRecordingMode(false);
    }
  };

  const stopRecording = async () => {
    console.log('🎤 stopRecording called, current state:', recordingState);
    
    if (recordingState !== 'recording') {
      console.log('❌ Not currently recording, ignoring stop call');
      return;
    }
    
    try {
      console.log('🎤 Stopping speech recognition');
      // Stop speech recognition
      await ExpoSpeechRecognitionModule.stop();
      
      // Restore AudioManager to normal mode
      await audioManager.setRecordingMode(false);
      
      // Haptic feedback for recording stop
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      console.log('🎤 Recording stopped successfully');

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      setRecordingState('error');
      await audioManager.setRecordingMode(false);
    }
  };

  const handleVoiceResult = (transcript: string) => {
    if (transcript.trim()) {
      setInputText(transcript);
      onVoiceSubmit(transcript);
    }
    setRecordingState('idle');
  };

  const handleSendPress = () => {
    if (inputText.trim()) {
      onTextSubmit();
    }
  };

  // Create gesture handlers
  const voiceGesture = Gesture.LongPress()
    .minDuration(100)
    .onStart(() => {
      'worklet';
      console.log('🎤 Long press started');
      if (!inputText.trim() && !disabled) {
        // Animate expansion with smooth timing (no bounce)
        const screenWidth = Dimensions.get('window').width;
        const fullInputWidth = screenWidth - 30;
        buttonWidth.value = withTiming(fullInputWidth, { duration: 200 });
        buttonHeight.value = withTiming(44, { duration: 200 });
        borderRadius.value = withTiming(22, { duration: 200 });
        
        // Start recording
        runOnJS(startRecording)();
      }
    })
    .onEnd(() => {
      'worklet';
      console.log('🎤 Long press ended');
      // Animate contraction with smooth timing (no bounce)
      buttonWidth.value = withTiming(40, { duration: 200 });
      buttonHeight.value = withTiming(40, { duration: 200 });
      borderRadius.value = withTiming(20, { duration: 200 });
      
      // Stop recording
      runOnJS(stopRecording)();
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      console.log('🎤 Tap detected, inputText:', inputText.trim());
      if (inputText.trim() && !disabled) {
        handleSendPress();
      } else if (recordingState === 'error') {
        // Allow tap to retry after error
        setRecordingState('idle');
      }
    });

  const combinedGesture = Gesture.Exclusive(voiceGesture, tapGesture);


  const renderButtonContent = () => {
    switch (recordingState) {
      case 'recording':
        return (
          <View style={styles.recordingContent}>
            <WaveformVisualizer
              isRecording={true}
              volumeLevel={volumeLevel}
              barCount={12}
              color="#ffffff"
              height={20}
            />
          </View>
        );
      case 'error':
        return (
          <View style={styles.errorContent}>
            <Feather name="alert-circle" size={18} color="#ffffff" />
          </View>
        );
      default:
        return inputText.trim() ? (
          <Feather name="send" size={18} color="#ffffff" />
        ) : (
          <Feather name="mic" size={18} color="#ffffff" />
        );
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (recordingState === 'recording') {
      baseStyle.push(styles.recordingButton);
    } else if (recordingState === 'error') {
      baseStyle.push(styles.errorButton);
    } else if (inputText.trim()) {
      baseStyle.push(styles.sendButton);
    } else {
      baseStyle.push(styles.micButton);
    }

    if (disabled) {
      baseStyle.push(styles.disabledButton);
    }

    return baseStyle;
  };

  // Use proper GestureDetector for press-and-hold functionality
  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <Animated.View
          style={[
            getButtonStyle(),
            animatedButtonStyle, // Use reanimated style
          ]}
        >
          {renderButtonContent()}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container for gesture detector
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    // Dynamic width, height, and borderRadius applied via animated values
  },
  sendButton: {
    backgroundColor: '#6366f1',
  },
  micButton: {
    backgroundColor: '#6366f1',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  errorButton: {
    backgroundColor: '#f59e0b',
  },
  disabledButton: {
    opacity: 0.5,
  },
  recordingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});