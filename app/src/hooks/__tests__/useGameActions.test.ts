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
    quitGame: jest.fn(),
    startThinkRound: jest.fn(),
    submitUserAnswer: jest.fn(),
    finalizeThinkResult: jest.fn(),
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
    secretItem: 'elephant',
    loading: false,
    gameStatus: 'active' as const,
    mode: 'guess' as const,
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
    setSecretItem: jest.fn(),
    setMessages: jest.fn(),
    setSending: jest.fn(),
    setQuestionsRemaining: jest.fn(),
    setHintsRemaining: jest.fn(),
    setGameStatus: jest.fn(),
    setShowResultModal: jest.fn(),
    setResultModalData: jest.fn(),
    setBatchState: jest.fn(),
    setMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startNewGame', () => {
    it('successfully starts a new game', async () => {
      const mockResponse = {
        game_id: 'new-game-456',
        category: 'Animals',
        message: 'Welcome! I\'m thinking of an animal. Ask me yes/no questions!'
      };

      mockedGameService.startGame.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.startNewGame('Animals');
      });

      // Should call setBatchState twice: once for initial reset, once for final state
      expect(defaultActions.setBatchState).toHaveBeenCalledTimes(2);
      expect(mockedGameService.startGame).toHaveBeenCalledWith('Animals', 'user_guessing');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('gameStart');
      
      // Check the final state update
      expect(defaultActions.setBatchState).toHaveBeenCalledWith({
        gameId: 'new-game-456',
        secretItem: null, // No longer exposed in start game response
        messages: [{
          role: 'assistant',
          content: mockResponse.message,
          message_type: 'answer',
        }],
        loading: false
      });
    });

    it('handles start game failure', async () => {
      const onNavigateBack = jest.fn();
      mockedGameService.startGame.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.startNewGame('Food', 'guess', onNavigateBack);
      });

      // Should call setBatchState for initial reset and setLoading for cleanup
      expect(defaultActions.setBatchState).toHaveBeenCalledTimes(1);
      expect(defaultActions.setLoading).toHaveBeenCalledWith(false);
      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'start guess mode game failed: Network error');
      expect(onNavigateBack).toHaveBeenCalled();
    });

    it('calls onNavigateBack when provided on success', async () => {
      const onNavigateBack = jest.fn();
      const mockResponse = {
        game_id: 'new-game-789',
        category: 'Food',
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
        game_status: 'active' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Does it have four legs?');
      });

      expect(defaultActions.setBatchState).toHaveBeenCalledTimes(2); // Once for optimistic update, once for response
      expect(mockedGameService.askQuestion).toHaveBeenCalledWith('test-game-123', 'Does it have four legs?');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('answerYes');
      
      // Check the final batch state update
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        questionsRemaining: 19,
        gameStatus: 'active',
        sending: false
      }));
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
        answer: 'Yes! You got it! The answer was "dog".',
        questions_remaining: 15,
        game_status: 'won' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Is it a dog?');
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('correct');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: true,
          title: 'Congratulations!',
          message: 'Yes! You got it! The answer was "dog".'
        },
        showResultModal: true
      }));
    });

    it('handles losing game via sendQuestion', async () => {
      const mockResponse = {
        answer: 'Game over! You\'ve used all 20 questions. The answer was "elephant".',
        questions_remaining: 0,
        game_status: 'lost' as const,
      };

      mockedGameService.askQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Is it a cat?');
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('wrong');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: false,
          title: 'Game Over!',
          message: 'Game over! You\'ve used all 20 questions. The answer was "elephant".'
        },
        showResultModal: true
      }));
    });

    it('handles send question failure', async () => {
      mockedGameService.askQuestion.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.sendQuestion('Test question');
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'send question failed: Network error');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        sending: false
      }));
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

    it('handles Think mode startNewGame', async () => {
      const mockResponse = {
        session_id: 'think-game-456',
        first_question: 'Is it something you can hold in your hands?'
      };

      mockedGameService.startThinkRound.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.startNewGame('Animals', 'ai_guessing');
      });

      expect(defaultActions.setBatchState).toHaveBeenCalledTimes(2);
      expect(mockedGameService.startThinkRound).toHaveBeenCalledWith('Animals');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('gameStart');
      
      // Check final state includes Think mode specifics
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith({
        gameId: 'think-game-456',
        secretItem: null,
        messages: [{
          role: 'assistant',
          content: mockResponse.first_question,
          message_type: 'question',
        }],
        questionsRemaining: 19,
        loading: false
      });
    });
  });

  describe('requestHint', () => {
    it('successfully requests a hint', async () => {
      const mockResponse = {
        hint: 'It is a mammal.',
        hints_remaining: 2,
        questions_remaining: 19,
        game_status: 'active' as const,
      };

      mockedGameService.getHint.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(defaultActions.setSending).toHaveBeenCalledWith(true);
      expect(mockedGameService.getHint).toHaveBeenCalledWith('test-game-123');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('hint');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        hintsRemaining: 2,
        questionsRemaining: 19,
        gameStatus: 'active',
        sending: false
      }));
    });

    it('handles hint resulting in game over', async () => {
      const mockResponse = {
        hint: 'Final hint: It barks. Game over! You\'ve used all 20 questions. The answer was "elephant".',
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
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: false,
          title: 'Game Over!',
          message: 'Final hint: It barks. Game over! You\'ve used all 20 questions. The answer was "elephant".'
        },
        showResultModal: true
      }));
    });

    it('handles hint request failure', async () => {
      mockedGameService.getHint.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.requestHint();
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'get hint failed: Network error');
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


  describe('handleQuit', () => {
    it('successfully quits game using API and shows modal', async () => {
      const mockResponse = {
        message: 'You have left the game. The answer was "elephant".',
        secret_item: 'elephant'
      };

      mockedGameService.quitGame.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.handleQuit();
      });

      expect(mockedGameService.quitGame).toHaveBeenCalledWith('test-game-123');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('wrong');
      expect(defaultActions.setBatchState).toHaveBeenCalledWith({
        resultModalData: {
          isWin: false,
          title: 'Game Ended',
          message: 'You have left the game. The answer was "elephant".'
        },
        showResultModal: true,
        gameStatus: 'lost'
      });
    });

    it('handles quit game API failure with fallback', async () => {
      mockedGameService.quitGame.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      await act(async () => {
        await result.current.handleQuit();
      });

      expect(mockedGameService.quitGame).toHaveBeenCalledWith('test-game-123');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('wrong');
      expect(defaultActions.setBatchState).toHaveBeenCalledWith({
        resultModalData: {
          isWin: false,
          title: 'Game Ended',
          message: 'You have left the game.'
        },
        showResultModal: true,
        gameStatus: 'lost'
      });
    });

    it('does not quit when no game ID', async () => {
      const stateWithoutGameId = { ...defaultState, gameId: null };
      const { result } = renderHook(() => useGameActions(stateWithoutGameId, defaultActions));

      await act(async () => {
        await result.current.handleQuit();
      });

      expect(mockedGameService.quitGame).not.toHaveBeenCalled();
      expect(defaultActions.setResultModalData).not.toHaveBeenCalled();
    });
  });

  describe('submitUserAnswer (Think Mode)', () => {
    const thinkModeState = { ...defaultState, mode: 'think' as const };

    it('successfully submits user answer and gets next question', async () => {
      const mockResponse = {
        next_question: 'Is it alive?',
        questions_asked: 2,
        questions_remaining: 18,
        game_status: 'active' as const,
      };

      mockedGameService.submitUserAnswer.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.submitUserAnswer('Yes', 'chip');
      });

      expect(defaultActions.setBatchState).toHaveBeenCalledTimes(2); // Optimistic + response
      expect(mockedGameService.submitUserAnswer).toHaveBeenCalledWith('test-game-123', 'Yes', 'chip');
      
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        questionsRemaining: 18,
        gameStatus: 'active',
        sending: false
      }));
    });

    it('handles LLM victory (no more questions)', async () => {
      const mockResponse = {
        next_question: null,
        questions_asked: 12,
        game_status: 'lost' as const,
        final_message: 'Got it! You were thinking of a cat!'
      };

      mockedGameService.submitUserAnswer.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.submitUserAnswer('Maybe', 'chip');
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('correct');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: true,
          title: 'You Won!',
          message: 'I couldn\'t guess what you were thinking in 20 questions!'
        },
        showResultModal: true
      }));
    });

    it('handles auto-loss at question 20', async () => {
      const mockResponse = {
        next_question: null,
        questions_asked: 20,
        game_status: 'won' as const,
        final_message: 'I couldn\'t guess it! You win!'
      };

      mockedGameService.submitUserAnswer.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.submitUserAnswer('No', 'chip');
      });

      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('correct');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: true,
          title: 'You Won!',
          message: 'I couldn\'t guess what you were thinking in 20 questions!'
        },
        showResultModal: true
      }));
    });

    it('handles submit answer failure', async () => {
      mockedGameService.submitUserAnswer.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.submitUserAnswer('Yes', 'chip');
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'submit answer failed: Network error');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        sending: false
      }));
    });

    it('does not submit when no game ID', async () => {
      const stateWithoutGameId = { ...thinkModeState, gameId: null };

      const { result } = renderHook(() => useGameActions(stateWithoutGameId, defaultActions));

      await act(async () => {
        await result.current.submitUserAnswer('Yes', 'chip');
      });

      expect(mockedGameService.submitUserAnswer).not.toHaveBeenCalled();
    });

    it('does not submit when already sending', async () => {
      const sendingState = { ...thinkModeState, sending: true };

      const { result } = renderHook(() => useGameActions(sendingState, defaultActions));

      await act(async () => {
        await result.current.submitUserAnswer('Yes', 'chip');
      });

      expect(mockedGameService.submitUserAnswer).not.toHaveBeenCalled();
    });
  });

  describe('handleWin (Think Mode)', () => {
    const thinkModeState = { ...defaultState, mode: 'think' as const };

    it('successfully handles WIN button press', async () => {
      const mockResponse = {
        message: 'You win! I couldn\'t guess what you were thinking of.',
        questions_asked: 8
      };

      mockedGameService.finalizeThinkResult.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.handleWin();
      });

      expect(mockedGameService.finalizeThinkResult).toHaveBeenCalledWith('test-game-123', 'llm_win');
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('correct');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: true,
          title: 'Amazing! I guessed it!',
          message: 'You win! I couldn\'t guess what you were thinking of.'
        },
        showResultModal: true,
        sending: false
      }));
    });

    it('handles WIN button with immediate press (before first question)', async () => {
      const mockResponse = {
        message: 'You win! I give up.',
        questions_asked: 0
      };

      mockedGameService.finalizeThinkResult.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.handleWin();
      });

      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        resultModalData: {
          isWin: true,
          title: 'Amazing! I guessed it!',
          message: 'You win! I give up.'
        },
        showResultModal: true
      }));
    });

    it('handles WIN button failure', async () => {
      mockedGameService.finalizeThinkResult.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.handleWin();
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith('Error', 'finalize game failed: Network error');
      expect(defaultActions.setBatchState).toHaveBeenLastCalledWith(expect.objectContaining({
        sending: false
      }));
    });

    it('does not handle win when no game ID', async () => {
      const stateWithoutGameId = { ...thinkModeState, gameId: null };

      const { result } = renderHook(() => useGameActions(stateWithoutGameId, defaultActions));

      await act(async () => {
        await result.current.handleWin();
      });

      expect(mockedGameService.finalizeThinkResult).not.toHaveBeenCalled();
    });

    it('handles win even when already sending (no guard for sending state)', async () => {
      const sendingState = { ...thinkModeState, sending: true };
      const mockResponse = {
        message: 'You win! I give up.',
        questions_asked: 5
      };

      mockedGameService.finalizeThinkResult.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGameActions(sendingState, defaultActions));

      await act(async () => {
        await result.current.handleWin();
      });

      // The implementation doesn't check for sending state, so it will proceed
      expect(mockedGameService.finalizeThinkResult).toHaveBeenCalledWith('test-game-123', 'llm_win');
    });
  });

  describe('Think Mode quit handling', () => {
    it('handles quit in Think mode correctly', async () => {
      const thinkModeState = { ...defaultState, mode: 'think' as const };

      const { result } = renderHook(() => useGameActions(thinkModeState, defaultActions));

      await act(async () => {
        await result.current.handleQuit();
      });

      // Think mode doesn't call quitGame API - it just shows modal directly
      expect(mockedGameService.quitGame).not.toHaveBeenCalled();
      expect(mockedAudioManager.playSound).toHaveBeenCalledWith('wrong');
      expect(defaultActions.setBatchState).toHaveBeenCalledWith({
        gameStatus: 'lost',
        resultModalData: {
          isWin: false,
          title: 'Game Ended',
          message: 'You have left the game.'
        },
        showResultModal: true
      });
    });
  });

  describe('return interface', () => {
    it('returns all required methods', () => {
      const { result } = renderHook(() => useGameActions(defaultState, defaultActions));

      expect(typeof result.current.startNewGame).toBe('function');
      expect(typeof result.current.sendQuestion).toBe('function');
      expect(typeof result.current.requestHint).toBe('function');
      expect(typeof result.current.handleQuit).toBe('function');
      expect(typeof result.current.submitUserAnswer).toBe('function');
      expect(typeof result.current.handleWin).toBe('function');
    });
  });
});