import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import WaveformVisualizer from '../WaveformVisualizer';

type RecordingState = 'idle' | 'recording' | 'error';

interface VoiceButtonContentProps {
  recordingState: RecordingState;
  inputText: string;
  volumeLevel: number;
}

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

