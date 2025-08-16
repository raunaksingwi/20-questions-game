/**
 * Content component for voice button that renders different states.
 * Shows appropriate icons and visualizers based on recording state.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import WaveformVisualizer from '../WaveformVisualizer';

/**
 * Possible states for the voice recording button.
 */
type RecordingState = 'idle' | 'recording' | 'error';

/**
 * Props for the VoiceButtonContent component.
 */
interface VoiceButtonContentProps {
  /** Current state of voice recording */
  recordingState: RecordingState;
  /** Current text in the input field */
  inputText: string;
  /** Volume level for waveform visualization */
  volumeLevel: number;
}

/**
 * Renders appropriate content for the voice button based on current state.
 * Shows waveform during recording, error icon on failure, or send/mic icon otherwise.
 */
export const VoiceButtonContent: React.FC<VoiceButtonContentProps> = ({
  recordingState,
  inputText,
  volumeLevel,
}) => {
  switch (recordingState) {
    case 'recording':
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
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
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
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

