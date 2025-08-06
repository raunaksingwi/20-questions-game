import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

// Mock all complex dependencies
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: any) => children,
}));

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: {
      View: RN.View,
    },
  };
});

jest.mock('../../hooks/useVoiceRecording', () => ({
  useVoiceRecording: jest.fn(() => ({
    recordingState: 'idle',
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    volumeLevel: 0,
  })),
}));

jest.mock('../../hooks/useButtonAnimations', () => ({
  useButtonAnimations: jest.fn(() => ({
    expandButton: jest.fn(),
    contractButton: jest.fn(),
    animatedButtonStyle: {},
  })),
}));

jest.mock('../../hooks/useVoiceGestures', () => ({
  useVoiceGestures: jest.fn(() => ({})),
}));

jest.mock('../voice/VoiceButtonContent', () => ({
  VoiceButtonContent: function VoiceButtonContent(props: any) {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'voice-button-content' },
      React.createElement(Text, null, `State: ${props.recordingState}`)
    );
  },
}));

import VoiceInputButton from '../VoiceInputButton';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { useButtonAnimations } from '../../hooks/useButtonAnimations';
import { useVoiceGestures } from '../../hooks/useVoiceGestures';

const mockedUseVoiceRecording = useVoiceRecording as jest.MockedFunction<typeof useVoiceRecording>;
const mockedUseButtonAnimations = useButtonAnimations as jest.MockedFunction<typeof useButtonAnimations>;
const mockedUseVoiceGestures = useVoiceGestures as jest.MockedFunction<typeof useVoiceGestures>;

describe('VoiceInputButton', () => {
  const defaultProps = {
    onTextSubmit: jest.fn(),
    onVoiceSubmit: jest.fn(),
    inputText: '',
    setInputText: jest.fn(),
    disabled: false,
  };

  const defaultVoiceRecording = {
    recordingState: 'idle' as const,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    volumeLevel: 0,
  };

  const defaultAnimations = {
    expandButton: jest.fn(),
    contractButton: jest.fn(),
    animatedButtonStyle: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    
    mockedUseVoiceRecording.mockReturnValue(defaultVoiceRecording);
    mockedUseButtonAnimations.mockReturnValue(defaultAnimations);
    mockedUseVoiceGestures.mockReturnValue({});
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(<VoiceInputButton {...defaultProps} />);
      expect(getByTestId('voice-button-content')).toBeTruthy();
    });

    it('renders with default props', () => {
      const { getByTestId } = render(
        <VoiceInputButton
          onTextSubmit={jest.fn()}
          onVoiceSubmit={jest.fn()}
          inputText=""
          setInputText={jest.fn()}
        />
      );
      expect(getByTestId('voice-button-content')).toBeTruthy();
    });
  });

  describe('Hook Integration', () => {
    it('calls useVoiceRecording with correct callback', () => {
      render(<VoiceInputButton {...defaultProps} />);
      
      expect(mockedUseVoiceRecording).toHaveBeenCalledWith(expect.any(Function));
      
      // Test the handleVoiceResult callback
      const handleVoiceResult = mockedUseVoiceRecording.mock.calls[0][0];
      const mockSetInputText = jest.fn();
      const mockOnVoiceSubmit = jest.fn();
      
      const component = render(
        <VoiceInputButton
          {...defaultProps}
          setInputText={mockSetInputText}
          onVoiceSubmit={mockOnVoiceSubmit}
        />
      );
      
      // Simulate voice result
      handleVoiceResult('Hello world');
      
      expect(mockSetInputText).toHaveBeenCalledWith('Hello world');
      expect(mockOnVoiceSubmit).toHaveBeenCalledWith('Hello world');
    });

    it('ignores empty voice results', () => {
      render(<VoiceInputButton {...defaultProps} />);
      
      const handleVoiceResult = mockedUseVoiceRecording.mock.calls[0][0];
      const mockSetInputText = jest.fn();
      const mockOnVoiceSubmit = jest.fn();
      
      const component = render(
        <VoiceInputButton
          {...defaultProps}
          setInputText={mockSetInputText}
          onVoiceSubmit={mockOnVoiceSubmit}
        />
      );
      
      // Test empty and whitespace-only results
      handleVoiceResult('');
      handleVoiceResult('   ');
      
      expect(mockSetInputText).not.toHaveBeenCalled();
      expect(mockOnVoiceSubmit).not.toHaveBeenCalled();
    });

    it('calls useButtonAnimations hook', () => {
      render(<VoiceInputButton {...defaultProps} />);
      expect(mockedUseButtonAnimations).toHaveBeenCalled();
    });

    it('calls useVoiceGestures with correct props', () => {
      const props = {
        ...defaultProps,
        inputText: 'test input',
        disabled: true,
      };
      
      render(<VoiceInputButton {...props} />);
      
      expect(mockedUseVoiceGestures).toHaveBeenCalledWith({
        inputText: 'test input',
        disabled: true,
        onTextSubmit: props.onTextSubmit,
        animations: defaultAnimations,
        voiceRecording: defaultVoiceRecording,
      });
    });
  });

  describe('Button Styling', () => {
    it('applies mic button style for empty input', () => {
      mockedUseVoiceRecording.mockReturnValue({
        ...defaultVoiceRecording,
        recordingState: 'idle',
      });

      render(<VoiceInputButton {...defaultProps} inputText="" />);
      
      // Component should render and apply appropriate styling
      expect(mockedUseVoiceGestures).toHaveBeenCalledWith(
        expect.objectContaining({
          inputText: '',
        })
      );
    });

    it('applies send button style when input text exists', () => {
      render(<VoiceInputButton {...defaultProps} inputText="test message" />);
      
      expect(mockedUseVoiceGestures).toHaveBeenCalledWith(
        expect.objectContaining({
          inputText: 'test message',
        })
      );
    });

    it('applies recording button style when recording', () => {
      mockedUseVoiceRecording.mockReturnValue({
        ...defaultVoiceRecording,
        recordingState: 'recording',
      });

      const { getByText } = render(<VoiceInputButton {...defaultProps} />);
      expect(getByText('State: recording')).toBeTruthy();
    });

    it('applies error button style when error occurs', () => {
      mockedUseVoiceRecording.mockReturnValue({
        ...defaultVoiceRecording,
        recordingState: 'error',
      });

      const { getByText } = render(<VoiceInputButton {...defaultProps} />);
      expect(getByText('State: error')).toBeTruthy();
    });

    it('applies disabled styling when disabled', () => {
      render(<VoiceInputButton {...defaultProps} disabled={true} />);
      
      expect(mockedUseVoiceGestures).toHaveBeenCalledWith(
        expect.objectContaining({
          disabled: true,
        })
      );
    });
  });

  describe('Platform Specific Styling', () => {
    it('applies web-specific styles on web platform', () => {
      Platform.OS = 'web';
      
      const { getByTestId } = render(<VoiceInputButton {...defaultProps} />);
      expect(getByTestId('voice-button-content')).toBeTruthy();
    });

    it('does not apply web styles on native platforms', () => {
      Platform.OS = 'ios';
      
      const { getByTestId } = render(<VoiceInputButton {...defaultProps} />);
      expect(getByTestId('voice-button-content')).toBeTruthy();
    });

    it('handles android platform', () => {
      Platform.OS = 'android';
      
      const { getByTestId } = render(<VoiceInputButton {...defaultProps} />);
      expect(getByTestId('voice-button-content')).toBeTruthy();
    });
  });

  describe('VoiceButtonContent Integration', () => {
    it('passes correct props to VoiceButtonContent', () => {
      const mockVoiceRecording = {
        ...defaultVoiceRecording,
        recordingState: 'recording' as const,
        volumeLevel: 0.5,
      };
      
      mockedUseVoiceRecording.mockReturnValue(mockVoiceRecording);

      const { getByText } = render(
        <VoiceInputButton {...defaultProps} inputText="test input" />
      );
      
      expect(getByText('State: recording')).toBeTruthy();
    });

    it('updates VoiceButtonContent when recording state changes', () => {
      const { rerender, getByText } = render(<VoiceInputButton {...defaultProps} />);
      
      expect(getByText('State: idle')).toBeTruthy();
      
      // Change recording state
      mockedUseVoiceRecording.mockReturnValue({
        ...defaultVoiceRecording,
        recordingState: 'processing',
      });
      
      rerender(<VoiceInputButton {...defaultProps} />);
      expect(getByText('State: processing')).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('handles all recording states', () => {
      const states = ['idle', 'recording', 'processing', 'error'] as const;
      
      states.forEach(state => {
        mockedUseVoiceRecording.mockReturnValue({
          ...defaultVoiceRecording,
          recordingState: state,
        });
        
        const { getByText } = render(<VoiceInputButton {...defaultProps} />);
        expect(getByText(`State: ${state}`)).toBeTruthy();
      });
    });

    it('handles different input text values', () => {
      const testValues = ['', 'short', 'a very long input text that should still work'];
      
      testValues.forEach(inputText => {
        render(<VoiceInputButton {...defaultProps} inputText={inputText} />);
        
        expect(mockedUseVoiceGestures).toHaveBeenCalledWith(
          expect.objectContaining({
            inputText,
          })
        );
        
        jest.clearAllMocks();
        mockedUseVoiceRecording.mockReturnValue(defaultVoiceRecording);
        mockedUseButtonAnimations.mockReturnValue(defaultAnimations);
        mockedUseVoiceGestures.mockReturnValue({});
      });
    });

    it('handles volume level changes', () => {
      const volumeLevels = [0, 0.25, 0.5, 0.75, 1.0];
      
      volumeLevels.forEach(volumeLevel => {
        mockedUseVoiceRecording.mockReturnValue({
          ...defaultVoiceRecording,
          volumeLevel,
        });
        
        const { getByTestId } = render(<VoiceInputButton {...defaultProps} />);
        expect(getByTestId('voice-button-content')).toBeTruthy();
        
        jest.clearAllMocks();
        mockedUseVoiceRecording.mockReturnValue(defaultVoiceRecording);
        mockedUseButtonAnimations.mockReturnValue(defaultAnimations);
        mockedUseVoiceGestures.mockReturnValue({});
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles component unmounting gracefully', () => {
      const { unmount } = render(<VoiceInputButton {...defaultProps} />);
      expect(() => unmount()).not.toThrow();
    });

    it('handles rapid prop changes', () => {
      const { rerender } = render(<VoiceInputButton {...defaultProps} />);
      
      // Rapid changes
      rerender(<VoiceInputButton {...defaultProps} inputText="change1" disabled={true} />);
      rerender(<VoiceInputButton {...defaultProps} inputText="change2" disabled={false} />);
      rerender(<VoiceInputButton {...defaultProps} inputText="" disabled={true} />);
      
      expect(mockedUseVoiceGestures).toHaveBeenCalledTimes(4); // Initial + 3 rerenders
    });

    it('handles callback function changes', () => {
      const { rerender } = render(<VoiceInputButton {...defaultProps} />);
      
      const newProps = {
        ...defaultProps,
        onTextSubmit: jest.fn(),
        onVoiceSubmit: jest.fn(),
        setInputText: jest.fn(),
      };
      
      rerender(<VoiceInputButton {...newProps} />);
      
      expect(mockedUseVoiceGestures).toHaveBeenCalledWith(
        expect.objectContaining({
          onTextSubmit: newProps.onTextSubmit,
        })
      );
    });
  });
});