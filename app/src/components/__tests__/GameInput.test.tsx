import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameInput } from '../GameInput';
import { GameStatus } from '../../../../../shared/types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 20 }),
}));

jest.mock('../VoiceInputButton', () => {
  return jest.fn(() => <div testID="voice-input-button" />);
});

describe('GameInput', () => {
  const defaultProps = {
    question: '',
    setQuestion: jest.fn(),
    sending: false,
    gameStatus: 'active' as GameStatus,
    hintsRemaining: 3,
    onTextSubmit: jest.fn(),
    onVoiceSubmit: jest.fn(),
    onRequestHint: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<GameInput {...defaultProps} />);
    
    expect(getByPlaceholderText('Ask a yes/no question or make a guess...')).toBeTruthy();
    expect(getByText('💡 Get Hint (3 left)')).toBeTruthy();
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

  it('calls onRequestHint when hint button is pressed', () => {
    const { getByText } = render(<GameInput {...defaultProps} />);
    const hintButton = getByText('💡 Get Hint (3 left)');
    
    fireEvent.press(hintButton);
    
    expect(defaultProps.onRequestHint).toHaveBeenCalled();
  });

  it('disables text input when sending', () => {
    const { getByPlaceholderText } = render(
      <GameInput {...defaultProps} sending={true} />
    );
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    expect(textInput.props.editable).toBe(false);
  });

  it('disables text input when game is not active', () => {
    const { getByPlaceholderText } = render(
      <GameInput {...defaultProps} gameStatus="completed" />
    );
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    expect(textInput.props.editable).toBe(false);
  });

  it('renders hint button with no hints remaining', () => {
    const { getByText } = render(
      <GameInput {...defaultProps} hintsRemaining={0} />
    );
    
    expect(getByText('💡 Get Hint (0 left)')).toBeTruthy();
  });

  it('renders hint button when sending', () => {
    const { getByText } = render(
      <GameInput {...defaultProps} sending={true} />
    );
    
    expect(getByText('💡 Get Hint (3 left)')).toBeTruthy();
  });

  it('shows correct hint count', () => {
    const { getByText } = render(
      <GameInput {...defaultProps} hintsRemaining={1} />
    );
    
    expect(getByText('💡 Get Hint (1 left)')).toBeTruthy();
  });

  it('displays current question value', () => {
    const { getByPlaceholderText } = render(
      <GameInput {...defaultProps} question="Is it alive?" />
    );
    const textInput = getByPlaceholderText('Ask a yes/no question or make a guess...');
    
    expect(textInput.props.value).toBe('Is it alive?');
  });
});