import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameInput } from '../GameInput';
import { GameStatus } from '../../../../shared/types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 20 }),
}));

jest.mock('../VoiceInputButton', () => {
  const { View } = require('react-native');
  return jest.fn(() => <View testID="voice-input-button" />);
});

jest.mock('../voice/ProfessionalVoiceButton', () => {
  const { View } = require('react-native');
  return {
    ProfessionalVoiceButton: jest.fn(() => <View testID="professional-voice-button" />),
  };
});

describe('GameInput', () => {
  const defaultProps = {
    question: '',
    setQuestion: jest.fn(),
    sending: false,
    gameStatus: 'active' as GameStatus,
    onTextSubmit: jest.fn(),
    onVoiceSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByPlaceholderText } = render(<GameInput {...defaultProps} />);
    
    expect(getByPlaceholderText('Ask a yes/no question or make a guess...')).toBeTruthy();
  });

  it('calls setQuestion when text input changes', () => {
    const { getByPlaceholderText } = render(<GameInput {...defaultProps} />);
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    fireEvent.changeText(textInput, 'Is it an animal?');
    
    expect(defaultProps.setQuestion).toHaveBeenCalledWith('Is it an animal?');
  });

  it('calls onTextSubmit when text input is submitted', () => {
    const { getByPlaceholderText } = render(<GameInput {...defaultProps} />);
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    fireEvent(textInput, 'submitEditing');
    
    expect(defaultProps.onTextSubmit).toHaveBeenCalled();
  });

  // Hint button moved to navigation header, no longer in GameInput

  it('disables text input when sending', () => {
    const { getByPlaceholderText } = render(
      <GameInput {...defaultProps} sending={true} />
    );
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    expect(textInput.props.editable).toBe(false);
  });

  it('disables text input when game is not active', () => {
    const { getByPlaceholderText } = render(
      <GameInput {...defaultProps} gameStatus="lost" />
    );
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    expect(textInput.props.editable).toBe(false);
  });

  // Hint button moved to navigation header

  // Hint button moved to navigation header

  // Hint button moved to navigation header

  it('displays current question value', () => {
    const { getByPlaceholderText } = render(
      <GameInput {...defaultProps} question="Is it alive?" />
    );
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    expect(textInput.props.value).toBe('Is it alive?');
  });
});