import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useButtonAnimations } from '../hooks/useButtonAnimations';
import { useVoiceGestures } from '../hooks/useVoiceGestures';
import { VoiceButtonContent } from './voice/VoiceButtonContent';

type VoiceInputButtonProps = {
  onTextSubmit: () => void;
  onVoiceSubmit: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceInputButton({
  onTextSubmit,
  onVoiceSubmit,
  inputText,
  setInputText,
  disabled = false,
}: VoiceInputButtonProps) {
  const handleVoiceResult = (transcript: string) => {
    if (transcript.trim()) {
      setInputText(transcript);
      onVoiceSubmit(transcript);
    }
  };

  const voiceRecording = useVoiceRecording(handleVoiceResult);
  const animations = useButtonAnimations();
  const gesture = useVoiceGestures({
    inputText,
    disabled,
    onTextSubmit,
    animations,
    voiceRecording,
  });

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (voiceRecording.recordingState === 'recording') {
      baseStyle.push(styles.recordingButton);
    } else if (voiceRecording.recordingState === 'error') {
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

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.webNoSelect]}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            getButtonStyle(),
            animations.animatedButtonStyle,
            Platform.OS === 'web' && styles.webNoSelect,
          ]}
        >
          <VoiceButtonContent
            recordingState={voiceRecording.recordingState}
            inputText={inputText}
            volumeLevel={voiceRecording.volumeLevel}
          />
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
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  micButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  recordingButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  errorButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
  },
  disabledButton: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
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