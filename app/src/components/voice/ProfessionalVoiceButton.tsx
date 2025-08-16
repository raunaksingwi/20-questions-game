/**
 * Professional voice input button with gesture detection and visual feedback.
 * Handles long-press gestures for voice recording with expanding overlay animation.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useSimpleVoiceOverlay } from '../../hooks/useSimpleVoiceOverlay';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { ExpandingWaveVisualizer } from './ExpandingWaveVisualizer';
import { INPUT_DIMENSIONS } from '../../constants/inputDimensions';

/**
 * Shared values representing the text input's layout dimensions.
 * Used for positioning the voice recording overlay.
 */
type InputDimensions = {
  /** Width of the text input */
  width: SharedValue<number>;
  /** Height of the text input */
  height: SharedValue<number>;
  /** X position of the text input */
  x: SharedValue<number>;
  /** Y position of the text input */
  y: SharedValue<number>;
};

/**
 * Props for the ProfessionalVoiceButton component.
 */
type ProfessionalVoiceButtonProps = {
  /** Callback for submitting text input */
  onTextSubmit: () => void;
  /** Callback for submitting voice input with transcribed text */
  onVoiceSubmit: (text: string) => void;
  /** Current text in the input field */
  inputText: string;
  /** Function to update the text input */
  setInputText: (text: string) => void;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Layout dimensions of the associated text input */
  inputDimensions: InputDimensions;
};

/**
 * Professional voice recording button with gesture-based interaction.
 * Supports long-press to record voice input with visual feedback overlay.
 */
export const ProfessionalVoiceButton: React.FC<ProfessionalVoiceButtonProps> = ({
  onTextSubmit,
  onVoiceSubmit,
  inputText,
  setInputText,
  disabled = false,
  inputDimensions,
}) => {
  /**
   * Handles the result of voice recognition by updating input and submitting.
   */
  const handleVoiceResult = (transcript: string) => {
    if (transcript.trim()) {
      setInputText(transcript);
      onVoiceSubmit(transcript);
    }
  };

  const voiceRecording = useVoiceRecording(handleVoiceResult);
  const overlay = useSimpleVoiceOverlay();

  // Failsafe: Hide overlay when recording stops
  useEffect(() => {
    if (voiceRecording.recordingState !== 'recording') {
      overlay.hideOverlay();
    }
  }, [voiceRecording.recordingState, overlay]);

  // Simple gesture handling
  const gesture = Gesture.LongPress()
    .minDuration(200)
    .onBegin(() => {
      'worklet';
      if (!disabled && !inputText.trim()) {
        overlay.buttonPressIn();
      }
    })
    .onStart(() => {
      'worklet';
      if (!disabled && !inputText.trim()) {
        overlay.showOverlay();
        runOnJS(voiceRecording.startRecording)();
      }
    })
    .onEnd(() => {
      'worklet';
      overlay.buttonPressOut();
      overlay.hideOverlay();
      runOnJS(voiceRecording.stopRecording)();
    })
    .onFinalize(() => {
      'worklet';
      // Ensure cleanup even if other handlers fail
      overlay.buttonPressOut();
      overlay.hideOverlay();
    });

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      overlay.buttonPressIn();
    })
    .onEnd(() => {
      'worklet';
      overlay.buttonPressOut();
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
      {/* Recording Overlay - appears over entire input when recording */}
      <Animated.View
        style={[
          styles.recordingOverlay,
          {
            backgroundColor: colors.background,
            width: inputDimensions.width.value || 280,
            height: inputDimensions.height.value || INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT,
            // Simple positioning: align overlay left edge with input left edge
            left: -(inputDimensions.width.value || 280) + INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
            top: -(INPUT_DIMENSIONS.TEXT_INPUT_HEIGHT - INPUT_DIMENSIONS.VOICE_BUTTON_SIZE) / 2,
          },
          overlay.overlayAnimatedStyle,
          Platform.OS === 'web' && styles.webNoSelect,
        ]}
        pointerEvents={voiceRecording.recordingState === 'recording' ? 'auto' : 'none'}
        accessible={voiceRecording.recordingState === 'recording'}
        accessibilityLabel={voiceRecording.recordingState === 'recording' ? 'Recording voice message' : undefined}
        accessibilityRole={voiceRecording.recordingState === 'recording' ? 'text' : undefined}
      >
        <ExpandingWaveVisualizer
          isRecording={voiceRecording.recordingState === 'recording'}
          volumeLevel={voiceRecording.volumeLevel}
          color={colors.icon}
        />
      </Animated.View>

      {/* Normal Button - always visible */}
      <GestureDetector gesture={combinedGesture}>
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: colors.background,
            },
            overlay.buttonAnimatedStyle,
            disabled && styles.disabledButton,
            Platform.OS === 'web' && styles.webNoSelect,
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            inputText.trim() 
              ? "Send message" 
              : voiceRecording.recordingState === 'recording'
                ? "Stop recording"
                : "Record voice message"
          }
          accessibilityHint={
            inputText.trim()
              ? "Tap to send your message"
              : voiceRecording.recordingState === 'recording'
                ? "Release to stop recording"
                : "Hold to record a voice message"
          }
          accessibilityState={{ disabled }}
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
    width: INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
    height: INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
  },
  button: {
    width: INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
    height: INPUT_DIMENSIONS.VOICE_BUTTON_SIZE,
    borderRadius: INPUT_DIMENSIONS.VOICE_BUTTON_BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingOverlay: {
    position: 'absolute',
    borderRadius: INPUT_DIMENSIONS.TEXT_INPUT_BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
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
        // Prevent context menu and text selection
        contextMenu: 'none',
        WebkitContextMenu: 'none',
        // Disable drag behaviors
        draggable: false,
        WebkitUserDrag: 'none',
      } as any,
    }),
  },
});