import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';

// Mock all the dependencies
jest.mock('../../../shared/types', () => ({}));

jest.mock('../../services/AudioManager', () => ({
  audioManager: {
    initialize: jest.fn(() => Promise.resolve()),
    setRecordingMode: jest.fn(() => Promise.resolve()),
    playSound: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../hooks/useGameState', () => ({
  useGameState: jest.fn(() => ({
    state: {
      loading: false,
      gameStatus: 'playing',
      messages: [],
      questionsRemaining: 20,
      hintsRemaining: 3,
      sending: false,
      showResultModal: false,
      resultModalData: {
        isWin: false,
        title: '',
        message: '',
      },
    },
    actions: {
      setShowResultModal: jest.fn(),
    },
  })),
}));

jest.mock('../../hooks/useGameActions', () => ({
  useGameActions: jest.fn(() => ({
    startNewGame: jest.fn(),
    sendQuestion: jest.fn(),
    requestHint: jest.fn(),
  })),
}));

jest.mock('../../hooks/useGameNavigation', () => ({
  useGameNavigation: jest.fn(),
}));

jest.mock('../../components/GameResultModal', () => {
  return function GameResultModal() {
    return null;
  };
});

jest.mock('../../components/GameHeader', () => ({
  GameHeader: function GameHeader({ category }: any) {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'game-header' }, `Category: ${category}`);
  },
}));

jest.mock('../../components/MessagesList', () => ({
  MessagesList: function MessagesList() {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'messages-list' });
  },
}));

jest.mock('../../components/GameInput', () => ({
  GameInput: function GameInput() {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'game-input' });
  },
}));

jest.mock('../../components/LoadingGame', () => ({
  LoadingGame: function LoadingGame() {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View, 
      { testID: 'loading-game' },
      React.createElement(Text, null, 'Loading...')
    );
  },
}));

import GameScreen from '../GameScreen';
import { useGameState } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { audioManager } from '../../services/AudioManager';

const mockedUseGameState = useGameState as jest.MockedFunction<typeof useGameState>;
const mockedUseGameActions = useGameActions as jest.MockedFunction<typeof useGameActions>;
const mockedAudioManager = audioManager as jest.Mocked<typeof audioManager>;

describe('GameScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  const mockRoute = {
    params: {
      category: 'Animals',
    },
  };

  const defaultGameState = {
    gameId: 'test-game-id',
    secretItem: null,
    loading: false,
    gameStatus: 'active' as const,
    messages: [],
    questionsRemaining: 20,
    hintsRemaining: 3,
    sending: false,
    showResultModal: false,
    resultModalData: {
      isWin: false,
      title: '',
      message: '',
    },
  };

  const defaultGameActions = {
    startNewGame: jest.fn(),
    sendQuestion: jest.fn(),
    requestHint: jest.fn(),
    handleQuit: jest.fn(),
  };

  const defaultActions = {
    setGameId: jest.fn(),
    setSecretItem: jest.fn(),
    setMessages: jest.fn(),
    setLoading: jest.fn(),
    setSending: jest.fn(),
    setQuestionsRemaining: jest.fn(),
    setHintsRemaining: jest.fn(),
    setGameStatus: jest.fn(),
    setShowResultModal: jest.fn(),
    setResultModalData: jest.fn(),
    setBatchState: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockedUseGameState.mockReturnValue({
      state: defaultGameState,
      actions: defaultActions,
    });

    mockedUseGameActions.mockReturnValue(defaultGameActions);
  });

  describe('Loading State', () => {
    it('renders loading component when loading is true', () => {
      mockedUseGameState.mockReturnValue({
        state: { ...defaultGameState, loading: true },
        actions: defaultActions,
      });

      const { getByTestId } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByTestId('loading-game')).toBeTruthy();
    });

    it('does not render game components when loading', () => {
      mockedUseGameState.mockReturnValue({
        state: { ...defaultGameState, loading: true },
        actions: defaultActions,
      });

      const { queryByTestId } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(queryByTestId('game-header')).toBeFalsy();
      expect(queryByTestId('messages-list')).toBeFalsy();
      expect(queryByTestId('game-input')).toBeFalsy();
    });
  });

  describe('Game State Rendering', () => {
    it('renders all game components when not loading', () => {
      const { getByTestId } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByTestId('game-header')).toBeTruthy();
      expect(getByTestId('messages-list')).toBeTruthy();
      expect(getByTestId('game-input')).toBeTruthy();
    });

    it('passes correct props to GameHeader', () => {
      const { getByText } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Category: Animals')).toBeTruthy();
    });

    it('handles different categories', () => {
      const foodRoute = {
        params: {
          category: 'Food',
        },
      };

      const { getByText } = render(
        <GameScreen navigation={mockNavigation as any} route={foodRoute as any} />
      );

      expect(getByText('Category: Food')).toBeTruthy();
    });
  });

  describe('Initialization', () => {
    it('does not initialize audio manager on mount (audio removed)', async () => {
      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(mockedAudioManager.initialize).not.toHaveBeenCalled();
      });
    });

    it('starts new game with correct category', async () => {
      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(defaultGameActions.startNewGame).toHaveBeenCalledWith(
          'Animals',
          expect.any(Function)
        );
      });
    });

    it('passes navigation callback to startNewGame', async () => {
      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      await waitFor(() => {
        expect(defaultGameActions.startNewGame).toHaveBeenCalled();
      });

      // Get the callback passed to startNewGame and call it
      const callback = defaultGameActions.startNewGame.mock.calls[0][1];
      callback();

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('State Management Integration', () => {
    it('uses game state hook correctly', () => {
      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(mockedUseGameState).toHaveBeenCalled();
    });

    it('uses game actions hook with state and actions', () => {
      mockedUseGameState.mockReturnValue({
        state: defaultGameState,
        actions: defaultActions,
      });

      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(mockedUseGameActions).toHaveBeenCalledWith(defaultGameState, defaultActions);
    });
  });

  describe('Result Modal Integration', () => {
    it('renders with result modal visible state', () => {
      mockedUseGameState.mockReturnValue({
        state: { ...defaultGameState, showResultModal: true },
        actions: defaultActions,
      });

      const { getByTestId } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByTestId('game-header')).toBeTruthy();
      expect(getByTestId('messages-list')).toBeTruthy();
      expect(getByTestId('game-input')).toBeTruthy();
    });
  });

  describe('Game Actions Integration', () => {
    it('receives correct game actions from hook', () => {
      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(mockedUseGameActions).toHaveBeenCalledWith(
        defaultGameState,
        expect.objectContaining({
          setShowResultModal: expect.any(Function),
        })
      );
    });

    it('passes game actions to components through props', () => {
      render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Verify that startNewGame is called during initialization
      expect(defaultGameActions.startNewGame).toHaveBeenCalledWith(
        'Animals',
        expect.any(Function)
      );
    });
  });

  describe('Component Lifecycle', () => {
    it('handles unmounting gracefully', () => {
      const { unmount } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles re-rendering with different props', () => {
      const { rerender } = render(
        <GameScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const newRoute = {
        params: {
          category: 'Objects',
        },
      };

      expect(() => {
        rerender(
          <GameScreen navigation={mockNavigation as any} route={newRoute as any} />
        );
      }).not.toThrow();
    });
  });
});