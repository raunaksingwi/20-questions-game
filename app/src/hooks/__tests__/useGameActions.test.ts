import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../../../shared/types', () => ({}));

jest.mock('../useGameState', () => ({
  GameState: {},
  GameStateActions: {},
}));

jest.mock('../../services/gameService', () => ({
  gameService: {
    startGame: jest.fn(),
    askQuestion: jest.fn(),
    getHint: jest.fn(),
  },
}));

jest.mock('../../services/AudioManager', () => ({
  audioManager: {
    playSound: jest.fn(),
  },
}));

import { useGameActions } from '../useGameActions';
import { gameService } from '../../services/gameService';
import { audioManager } from '../../services/AudioManager';

const mockedGameService = gameService as jest.Mocked<typeof gameService>;
const mockedAudioManager = audioManager as jest.Mocked<typeof audioManager>;
const mockedAlert = Alert as jest.Mocked<typeof Alert>;

describe('useGameActions', () => {
  const defaultState = {
    gameId: 'test-game-123',
    loading: false,
    gameStatus: 'playing' as const,
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

  const defaultActions = {
    setLoading: jest.fn(),
    setGameId: jest.fn(),
    setMessages: jest.fn(),
    setSending: jest.fn(),
    setQuestionsRemaining: jest.fn(),
    setHintsRemaining: jest.fn(),
    setGameStatus: jest.fn(),
    setShowResultModal: jest.fn(),
    setResultModalData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startNewGame', () => {
    it('successfully starts a new game', async () => {
      const mockResponse = {
        game_id: 'new-game-456',
        message: 'Welcome! I\'m thinking of an animal. Ask me yes/no questions!'
      };

      mockedGameService.startGame.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.startNewGame('Animals');
      });

      expect(defaultActions.setLoading).toHaveBeenCalledWith(true);
      expect(mockedGameService.startGame).toHaveBeenCalledWith('Animals');
      expect(defaultActions.setGameId).toHaveBeenCalledWith('new-game-456');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('gameStart');
      expect(defaultActions.setMessages).toHaveBeenCalledWith([{
        role: 'assistant',
        content: mockResponse.message,
        message_type: 'answer',
      }]);
      expect(defaultActions.setLoading).toHaveBeenCalledWith(false);
    });

    it('handles start game failure', async () => {
      const onNavigateBack = jest.fn();
      mockedGameService.startGame.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.startNewGame('Food', onNavigateBack);
      });

      expect(defaultActions.setLoading).toHaveBeenCalledWith(true);
      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'Failed to start game. Please try again.');
      expect(onNavigateBack).toHaveBeenCalled();
      expect(defaultActions.setLoading).toHaveBeenCalledWith(false);
    });

    it('calls onNavigateBack when provided on success', async () => {
      const onNavigateBack = jest.fn();
      const mockResponse = {
        game_id: 'new-game-789',
        message: 'Welcome to the food category!'
      };

      mockedGameService.startGame.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.startNewGame('Food', onNavigateBack);
      });

      // onNavigateBack should not be called on success (only on error)
      expect(onNavigateBack).not.toHaveBeenCalled();
    });
  });

  describe('sendQuestion', () => {
    it('sends question with text and processes yes answer', async () => {
      const mockResponse = {
        answer: 'Yes, it does have four legs.',
        questions_remaining: 19,
        game_status: 'playing' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Does it have four legs?');
      });

      expect(defaultActions.setMessages).toHaveBeenCalledTimes(2);
      expect(defaultActions.setSending).toHaveBeenCalledWith(true);
      expect(mockedGameService.askQuestion).toHaveBeenCalledWith('test-game-123', 'Does it have four legs?');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('answerYes');
      expect(defaultActions.setQuestionsRemaining).toHaveBeenCalledWith(19);
      expect(defaultActions.setGameStatus).toHaveBeenCalledWith('playing');
      expect(defaultActions.setSending).toHaveBeenCalledWith(false);
    });

    it('sends question with current question parameter and processes no answer', async () => {
      const mockResponse = {
        answer: 'No, it does not fly.',
        questions_remaining: 18,
        game_status: 'playing' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion(undefined, 'Does it fly?');
      });

      expect(mockedGameService.askQuestion).toHaveBeenCalledWith('test-game-123', 'Does it fly?');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('answerNo');
    });

    it('handles winning game', async () => {
      const mockResponse = {
        answer: 'Correct! It was a dog!',
        questions_remaining: 15,
        game_status: 'won' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Is it a dog?');
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('correct');
      expect(defaultActions.setResultModalData).toHaveBeenCalledWith({
        isWin: true,
        title: 'Congratulations!',
        message: 'You guessed it correctly! Well done!'
      });
      expect(defaultActions.setShowResultModal).toHaveBeenCalledWith(true);
    });

    it('handles losing game', async () => {
      const mockResponse = {
        answer: 'Game over! You ran out of questions.',
        questions_remaining: 0,
        game_status: 'lost' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Is it a cat?');
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('wrong');
      // handleGameOver should be called internally
    });

    it('handles send question failure', async () => {
      mockedGameService.askQuestion.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Test question');
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'Failed to send question. Please try again.');
      expect(defaultActions.setSending).toHaveBeenCalledWith(false);
    });

    it('does not send when no game ID', async () => {
      const stateWithoutGameId = { ...defaultState, gameId: null };

      const { result } = renderHook(() => useGameActions(stateWithoutGameId, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Test question');
      });

      expect(mockedGameService.askQuestion).not.toHaveBeenCalled();
    });

    it('does not send when already sending', async () => {
      const sendingState = { ...defaultState, sending: true };

      const { result } = renderHook(() => useGameActions(sendingState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Test question');
      });

      expect(mockedGameService.askQuestion).not.toHaveBeenCalled();
    });

    it('does not send empty question', async () => {
      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('   ');
      });

      expect(mockedGameService.askQuestion).not.toHaveBeenCalled();
    });
  });

  describe('requestHint', () => {
    it('successfully requests a hint', async () => {
      const mockResponse = {
        hint: 'It is a mammal.',
        hints_remaining: 2,
        questions_remaining: 19,
        game_status: 'playing' as const,
      };

      mockedGameService.getHint.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(defaultActions.setSending).toHaveBeenCalledWith(true);
      expect(mockedGameService.getHint).toHaveBeenCalledWith('test-game-123');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('hint');
      expect(defaultActions.setMessages).toHaveBeenCalledWith(expect.any(Function));
      expect(defaultActions.setHintsRemaining).toHaveBeenCalledWith(2);
      expect(defaultActions.setQuestionsRemaining).toHaveBeenCalledWith(19);
      expect(defaultActions.setSending).toHaveBeenCalledWith(false);
    });

    it('handles hint resulting in game over', async () => {
      const mockResponse = {
        hint: 'Final hint: It barks.',
        hints_remaining: 0,
        questions_remaining: 0,
        game_status: 'lost' as const,
      };

      mockedGameService.getHint.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('wrong');
    });

    it('handles hint request failure', async () => {
      mockedGameService.getHint.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'Failed to get hint. Please try again.');
      expect(defaultActions.setSending).toHaveBeenCalledWith(false);
    });

    it('does not request hint when no hints remaining', async () => {
      const stateWithoutHints = { ...defaultState, hintsRemaining: 0 };

      const { result } = renderHook(() => useGameActions(stateWithoutHints, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(mockedGameService.getHint).not.toHaveBeenCalled();
    });

    it('does not request hint when no game ID', async () => {
      const stateWithoutGameId = { ...defaultState, gameId: null };

      const { result } = renderHook(() => useGameActions(stateWithoutGameId, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(mockedGameService.getHint).not.toHaveBeenCalled();
    });

    it('does not request hint when already sending', async () => {
      const sendingState = { ...defaultState, sending: true };

      const { result } = renderHook(() => useGameActions(sendingState, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(mockedGameService.getHint).not.toHaveBeenCalled();
    });
  });

  describe('handleGameOver', () => {
    it('shows game over modal for lost game', () => {
      const lostState = { ...defaultState, gameStatus: 'lost' as const };

      const { result } = renderHook(() => useGameActions(lostState, defaultActions));

      act(() => {
        result.current.handleGameOver(false);
      });

      expect(defaultActions.setResultModalData).toHaveBeenCalledWith({
        isWin: false,
        title: 'Game Over!',
        message: "You've used all 20 questions without guessing correctly. Better luck next time!"
      });
      expect(defaultActions.setShowResultModal).toHaveBeenCalledWith(true);
    });

    it('does not show modal if game was guessed', () => {
      const lostState = { ...defaultState, gameStatus: 'lost' as const };

      const { result } = renderHook(() => useGameActions(lostState, defaultActions));

      act(() => {
        result.current.handleGameOver(true);
      });

      expect(defaultActions.setResultModalData).not.toHaveBeenCalled();
      expect(defaultActions.setShowResultModal).not.toHaveBeenCalled();
    });

    it('does not show modal if game is not lost', () => {
      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      act(() => {
        result.current.handleGameOver(false);
      });

      expect(defaultActions.setResultModalData).not.toHaveBeenCalled();
      expect(defaultActions.setShowResultModal).not.toHaveBeenCalled();
    });
  });

  describe('return interface', () => {
    it('returns all required methods', () => {
      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      expect(typeof result.current.startNewGame).toBe('function');
      expect(typeof result.current.sendQuestion).toBe('function');
      expect(typeof result.current.requestHint).toBe('function');
      expect(typeof result.current.handleGameOver).toBe('function');
    });
  });
});