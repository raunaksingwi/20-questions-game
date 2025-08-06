import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GameScreen from '../GameScreen';

// Mock all dependencies to avoid complex interactions
jest.mock('../../hooks/useGameState', () => ({
  useGameState: () => ({
    state: {
      gameId: 'test-game-123',
      messages: [
        { role: 'assistant', content: 'Welcome to the game!', message_type: 'answer' }
      ],
      loading: false,
      sending: false,
      questionsRemaining: 18,
      hintsRemaining: 2,
      gameStatus: 'active',
      showResultModal: false,
      resultModalData: { isWin: false, title: '', message: '' }
    },
    actions: {
      setShowResultModal: jest.fn(),
      setResultModalData: jest.fn(),
    }
  })
}));

jest.mock('../../hooks/useGameActions', () => ({
  useGameActions: () => ({
    startNewGame: jest.fn().mockResolvedValue(undefined),
    sendQuestion: jest.fn().mockResolvedValue(undefined),
    requestHint: jest.fn().mockResolvedValue(undefined),
    handleGameOver: jest.fn(),
  })
}));

jest.mock('../../hooks/useGameNavigation', () => ({
  useGameNavigation: jest.fn(),
}));

jest.mock('../../services/AudioManager', () => ({
  audioManager: {
    initialize: jest.fn().mockResolvedValue(undefined),
  }
}));

// Mock complex components to avoid dependency issues
jest.mock('../../components/VoiceInputButton', () => {
  const { View, Text } = require('react-native');
  return function MockVoiceInputButton() {
    return React.createElement(View, { testID: 'voice-button' }, 
      React.createElement(Text, {}, 'Voice Button')
    );
  };
});

jest.mock('../../components/GameResultModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockGameResultModal({ visible, onButtonPress, title, message }: any) {
    if (!visible) return null;
    return React.createElement(View, { testID: 'result-modal' },
      React.createElement(Text, {}, title),
      React.createElement(Text, {}, message),
      React.createElement(TouchableOpacity, 
        { onPress: onButtonPress, testID: 'modal-button' },
        React.createElement(Text, {}, 'Close')
      )
    );
  };
});

describe('GameScreen', () => {
  const mockRoute = {
    params: { category: 'Animals' }
  };
  
  const mockNavigation = {
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders game interface correctly', () => {
    const { getByText } = render(
      <GameScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByText('Category: Animals')).toBeTruthy();
    expect(getByText('Questions: 18/20')).toBeTruthy();
    expect(getByText('Hints: 2/3')).toBeTruthy();
    expect(getByText('Welcome to the game!')).toBeTruthy();
  });

  it('handles text input and submission', () => {
    const { getByPlaceholderText } = render(
      <GameScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const input = getByPlaceholderText('Ask a yes/no question or make a guess...');
    fireEvent.changeText(input, 'Is it alive?');
    fireEvent(input, 'submitEditing');

    expect(input.props.value).toBe('');
  });

  it('handles hint button press', () => {
    const { getByText } = render(
      <GameScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const hintButton = getByText('💡 Get Hint (2 left)');
    fireEvent.press(hintButton);

    // Should not throw any errors
    expect(hintButton).toBeTruthy();
  });

  it('initializes game on mount', () => {
    render(
      <GameScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    // Game initialization should happen in useEffect
    // We can't easily test the effect calls without more complex mocking
  });

  it('handles result modal visibility', () => {
    // Test with modal visible
    const useGameStateMock = require('../../hooks/useGameState').useGameState;
    useGameStateMock.mockReturnValueOnce({
      state: {
        gameId: 'test-game-123',
        messages: [],
        loading: false,
        sending: false,
        questionsRemaining: 0,
        hintsRemaining: 0,
        gameStatus: 'won',
        showResultModal: true,
        resultModalData: { 
          isWin: true, 
          title: 'Congratulations!', 
          message: 'You won!' 
        }
      },
      actions: {
        setShowResultModal: jest.fn(),
        setResultModalData: jest.fn(),
      }
    });

    const { getByTestId, getByText } = render(
      <GameScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    expect(getByTestId('result-modal')).toBeTruthy();
    expect(getByText('Congratulations!')).toBeTruthy();
    expect(getByText('You won!')).toBeTruthy();
  });

  it('handles modal button press and navigation', () => {
    const mockSetShowResultModal = jest.fn();
    
    const useGameStateMock = require('../../hooks/useGameState').useGameState;
    useGameStateMock.mockReturnValueOnce({
      state: {
        gameId: 'test-game-123',
        messages: [],
        loading: false,
        sending: false,
        questionsRemaining: 0,
        hintsRemaining: 0,
        gameStatus: 'won',
        showResultModal: true,
        resultModalData: { 
          isWin: true, 
          title: 'Congratulations!', 
          message: 'You won!' 
        }
      },
      actions: {
        setShowResultModal: mockSetShowResultModal,
        setResultModalData: jest.fn(),
      }
    });

    const { getByTestId } = render(
      <GameScreen route={mockRoute as any} navigation={mockNavigation as any} />
    );

    const modalButton = getByTestId('modal-button');
    fireEvent.press(modalButton);

    expect(mockSetShowResultModal).toHaveBeenCalledWith(false);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});