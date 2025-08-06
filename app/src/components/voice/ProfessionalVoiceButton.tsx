import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, interpolate, runOnJS } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useAdvancedButtonAnimations } from '../../hooks/useAdvancedButtonAnimations';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { ModernWaveformVisualizer } from './ModernWaveformVisualizer';

type ProfessionalVoiceButtonProps = {
  onTextSubmit: () => void;
  onVoiceSubmit: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  disabled?: boolean;
};

export const ProfessionalVoiceButton: React.FC<ProfessionalVoiceButtonProps> = ({
  onTextSubmit,
  onVoiceSubmit,
  inputText,
  setInputText,
  disabled = false,
}) => {
  const handleVoiceResult = (transcript: string) => {
    if (transcript.trim()) {
      setInputText(transcript);
      onVoiceSubmit(transcript);
    }
  };

  const voiceRecording = useVoiceRecording(handleVoiceResult);
  const animations = useAdvancedButtonAnimations();

  // Enhanced gesture handling with professional feedback
  const gesture = Gesture.LongPress()
    .minDuration(100)
    .onBegin(() => {
      'worklet';
      if (!disabled && !inputText.trim()) {
        animations.pressIn();
      }
    })
    .onStart(() => {
      'worklet';
      if (!disabled && !inputText.trim()) {
        animations.startRecording();
        // Use runOnJS for async functions
        runOnJS(voiceRecording.startRecording)();
      }
    })
    .onEnd(() => {
      'worklet';
      animations.pressOut();
      animations.stopRecording();
      runOnJS(voiceRecording.stopRecording)();
    });

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      animations.pressIn();
    })
    .onEnd(() => {
      'worklet';
      animations.pressOut();
      if (inputText.trim() && !disabled) {
        runOnJS(onTextSubmit)();
      } else if (voiceRecording.recordingState === 'error') {
        runOnJS(voiceRecording.setRecordingState)('idle');
      }
    });

  const combinedGesture = Gesture.Exclusive(gesture, tapGesture);

  const getButtonColors = () => {
    if (disabled) {
      return {
        background: '#9CA3AF',
        icon: '#FFFFFF',
      };
    }

    switch (voiceRecording.recordingState) {
      case 'recording':
        return {
          background: '#EF4444', // Professional red for recording
          icon: '#FFFFFF',
        };
      case 'error':
        return {
          background: '#F59E0B', // Amber for error
          icon: '#FFFFFF',
        };
      default:
        if (inputText.trim()) {
          return {
            background: '#3B82F6', // Blue for send
            icon: '#FFFFFF',
          };
        }
        return {
          background: '#6366F1', // Indigo for mic
          icon: '#FFFFFF',
        };
    }
  };

  const colors = getButtonColors();

  const buttonBackgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: colors.background,
    };
  });

  const renderButtonContent = () => {
    if (voiceRecording.recordingState === 'recording') {
      return (
        <ModernWaveformVisualizer
          isRecording={true}
          volumeLevel={voiceRecording.volumeLevel}
          barCount={3}
          color={colors.icon}
          height={16}
        />
      );
    }

    if (voiceRecording.recordingState === 'error') {
      return <Feather name="alert-circle" size={16} color={colors.icon} />;
    }

    if (inputText.trim()) {
      return <Feather name="send" size={16} color={colors.icon} />;
    }

    return <Feather name="mic" size={16} color={colors.icon} />;
  };

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.webNoSelect]}>
      {/* Glow Effect Layer */}
      <Animated.View
        style={[
          styles.glowLayer,
          {
            backgroundColor: colors.background,
          },
          animations.animatedGlowStyle,
          Platform.OS === 'web' && styles.webNoSelect,
        ]}
      />
      
      {/* Pulse Effect Layer */}
      <Animated.View
        style={[
          styles.pulseLayer,
          {
            backgroundColor: colors.background,
          },
          animations.animatedPulseStyle,
          Platform.OS === 'web' && styles.webNoSelect,
        ]}
      />
      
      {/* Ripple Effect Layer */}
      <Animated.View
        style={[
          styles.rippleLayer,
          {
            backgroundColor: colors.background,
          },
          animations.animatedRippleStyle,
          Platform.OS === 'web' && styles.webNoSelect,
        ]}
      />

      {/* Main Button */}
      <GestureDetector gesture={combinedGesture}>
        <Animated.View
          style={[
            styles.button,
            buttonBackgroundStyle,
            animations.animatedButtonStyle,
            disabled && styles.disabledButton,
            Platform.OS === 'web' && styles.webNoSelect,
          ]}
        >
          {renderButtonContent()}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // Professional shadow (iOS-like) - reduced for integrated look
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  glowLayer: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    opacity: 0,
  },
  pulseLayer: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0,
  },
  rippleLayer: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0,
  },
  disabledButton: {
    opacity: 0.6,
  },
  webNoSelect: {
    ...Platform.select({
      web: {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      },
    }),
  },
});