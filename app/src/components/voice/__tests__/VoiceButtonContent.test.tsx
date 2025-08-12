import React from 'react';
import { render } from '@testing-library/react-native';
import { VoiceButtonContent } from '../VoiceButtonContent';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Feather: ({ name, testID }: any) => <View testID={testID || `feather-${name}`} />,
  };
});

jest.mock('../../WaveformVisualizer', () => {
  const { View } = require('react-native');
  return jest.fn(() => <View testID="waveform-visualizer" />);
});

describe('VoiceButtonContent', () => {
  const defaultProps = {
    recordingState: 'idle' as const,
    inputText: '',
    volumeLevel: 0,
  };

  it('renders mic icon when idle with no input text', () => {
    const { getByTestId } = render(<VoiceButtonContent {...defaultProps} />);
    
    expect(getByTestId('feather-mic')).toBeTruthy();
  });

  it('renders send icon when idle with input text', () => {
    const { getByTestId } = render(
      <VoiceButtonContent {...defaultProps} inputText="Hello world" />
    );
    
    expect(getByTestId('feather-send')).toBeTruthy();
  });

  it('renders waveform visualizer when recording', () => {
    const { getByTestId } = render(
      <VoiceButtonContent {...defaultProps} recordingState="recording" />
    );
    
    expect(getByTestId('waveform-visualizer')).toBeTruthy();
  });

  it('renders error icon when in error state', () => {
    const { getByTestId } = render(
      <VoiceButtonContent {...defaultProps} recordingState="error" />
    );
    
    expect(getByTestId('feather-alert-circle')).toBeTruthy();
  });

  it('ignores whitespace in input text', () => {
    const { getByTestId } = render(
      <VoiceButtonContent {...defaultProps} inputText="   " />
    );
    
    expect(getByTestId('feather-mic')).toBeTruthy();
  });

  it('shows send icon for trimmed non-empty text', () => {
    const { getByTestId } = render(
      <VoiceButtonContent {...defaultProps} inputText="  hello  " />
    );
    
    expect(getByTestId('feather-send')).toBeTruthy();
  });

  it('renders correctly in different states', () => {
    const { rerender, getByTestId } = render(
      <VoiceButtonContent {...defaultProps} recordingState="recording" />
    );
    
    expect(getByTestId('waveform-visualizer')).toBeTruthy();
    
    rerender(<VoiceButtonContent {...defaultProps} recordingState="error" />);
    expect(getByTestId('feather-alert-circle')).toBeTruthy();
    
    rerender(<VoiceButtonContent {...defaultProps} recordingState="idle" inputText="" />);
    expect(getByTestId('feather-mic')).toBeTruthy();
  });
});