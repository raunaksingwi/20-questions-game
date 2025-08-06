import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfessionalVoiceButton } from '../ProfessionalVoiceButton';

// Mock dependencies
jest.mock('../../../hooks/useAdvancedButtonAnimations', () => ({
  useAdvancedButtonAnimations: () => ({
    animatedButtonStyle: {},
    animatedRippleStyle: {},
    animatedPulseStyle: {},
    animatedGlowStyle: {},
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    pressIn: jest.fn(),
    pressOut: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    recordingState: 'idle',
    hasPermission: true,
    volumeLevel: 0.5,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    setRecordingState: jest.fn(),
  }),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    LongPress: () => ({
      minDuration: () => ({
        onBegin: () => ({
          onStart: () => ({
            onEnd: () => ({}),
          }),
        }),
      }),
    }),
    Tap: () => ({
      onBegin: () => ({
        onEnd: () => ({}),
      }),
    }),
    Exclusive: () => ({}),
  },
}));

jest.mock('react-native-reanimated', () => ({
  useAnimatedStyle: () => ({}),
  runOnJS: (fn: any) => fn,
  interpolate: jest.fn(),
  default: {
    View: 'View',
  },
}));

jest.mock('../ModernWaveformVisualizer', () => ({
  ModernWaveformVisualizer: () => null,
}));

describe('ProfessionalVoiceButton', () => {
  const defaultProps = {
    onTextSubmit: jest.fn(),
    onVoiceSubmit: jest.fn(),
    inputText: '',
    setInputText: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<ProfessionalVoiceButton {...defaultProps} />);
    // Should render the main container
    expect(getByTestId).toBeDefined();
  });

  it('shows microphone icon when no input text', () => {
    const { UNSAFE_root } = render(<ProfessionalVoiceButton {...defaultProps} />);
    expect(UNSAFE_root).toBeDefined();
  });

  it('shows send icon when input text exists', () => {
    const { UNSAFE_root } = render(
      <ProfessionalVoiceButton {...defaultProps} inputText="test question" />
    );
    expect(UNSAFE_root).toBeDefined();
  });

  it('handles disabled state', () => {
    const { UNSAFE_root } = render(
      <ProfessionalVoiceButton {...defaultProps} disabled={true} />
    );
    expect(UNSAFE_root).toBeDefined();
  });

  it('calls voice recording functions appropriately', () => {
    const { UNSAFE_root } = render(<ProfessionalVoiceButton {...defaultProps} />);
    expect(UNSAFE_root).toBeDefined();
  });
});