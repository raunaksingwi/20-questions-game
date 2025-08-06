import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { ButtonAnimations } from './useButtonAnimations';
import { VoiceRecordingHook } from './useVoiceRecording';

interface GestureProps {
  inputText: string;
  disabled: boolean;
  onTextSubmit: () => void;
  animations: ButtonAnimations;
  voiceRecording: VoiceRecordingHook;
}

export const useVoiceGestures = ({
  inputText,
  disabled,
  onTextSubmit,
  animations,
  voiceRecording,
}: GestureProps) => {
  const voiceGesture = Gesture.LongPress()
    .minDuration(100)
    .onStart(() => {
      'worklet';
      console.log('🎤 Long press started');
      if (!inputText.trim() && !disabled) {
        runOnJS(animations.expandButton)();
        runOnJS(voiceRecording.startRecording)();
      }
    })
    .onEnd(() => {
      'worklet';
      console.log('🎤 Long press ended');
      runOnJS(animations.contractButton)();
      runOnJS(voiceRecording.stopRecording)();
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      console.log('🎤 Tap detected, inputText:', inputText.trim());
      if (inputText.trim() && !disabled) {
        onTextSubmit();
      } else if (voiceRecording.recordingState === 'error') {
        voiceRecording.setRecordingState('idle');
      }
    });

  const combinedGesture = Gesture.Exclusive(voiceGesture, tapGesture);

  return combinedGesture;
};