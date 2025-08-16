/**
 * Custom hook that provides game action functions for handling user interactions.
 * Manages game logic, API calls, and state updates with request deduplication.
 */
import { Alert } from 'react-native';
import { gameService } from '../services/gameService';
import { audioManager } from '../services/AudioManager';
import { GameMessage, GameMode, AnswerType } from '../types/types';
import { GameState, GameStateActions } from './useGameState';
import { useRef } from 'react';

/**
 * Standardized error handling for game actions.
 * Logs errors and shows user-friendly alerts.
 */
const handleError = (error: any, operation: string, fallbackMessage?: string) => {
  console.error(`[${operation.toUpperCase()} ERROR]`, error);
  const message = error?.message || fallbackMessage || 'An unexpected error occurred';
  Alert.alert('Error', `${operation} failed: ${message}`);
};

export interface GameActionsHook {
  startNewGame: (category: string, mode?: GameMode, onNavigateBack?: () => void) => Promise<void>;
  sendQuestion: (questionText?: string, currentQuestion?: string) => Promise<void>;
  requestHint: () => Promise<void>;
  handleQuit: () => void;
  // AI guessing mode specific methods
  submitUserAnswer: (answer: string, answerType: AnswerType) => Promise<void>;
  handleWin: () => Promise<void>;
}

/**
 * Creates game action functions that interact with the game service and update state.
 * Handles request deduplication and provides methods for all game interactions.
 */
export const useGameActions = (
  state: GameState,
  actions: GameStateActions
): GameActionsHook => {
  // Request deduplication
  const lastRequestRef = useRef<{ type: string; content: string; timestamp: number } | null>(null);
  
  /**
   * Checks if a request is a duplicate of the last request within 2 seconds.
   * Prevents accidental double-taps and duplicate API calls.
   */
  const isDuplicateRequest = (type: string, content: string): boolean => {
    const now = Date.now();
    const lastRequest = lastRequestRef.current;
    
    if (!lastRequest) return false;
    
    // Consider duplicate if same type+content within 2 seconds
    return (
      lastRequest.type === type &&
      lastRequest.content === content &&
      now - lastRequest.timestamp < 2000
    );
  };
  
  /**
   * Records the current request for duplicate detection.
   */
  const recordRequest = (type: string, content: string) => {
    lastRequestRef.current = {
      type,
      content,
      timestamp: Date.now()
    };
  };
  const startNewGame = async (category: string, mode: GameMode = GameMode.USER_GUESSING, onNavigateBack?: () => void) => {
    if (isDuplicateRequest('start', `${category}-${mode}`)) return;
    recordRequest('start', `${category}-${mode}`);
    
    try {
      // Batch initial state reset
      actions.setBatchState({
        loading: true,
        gameId: null,
        secretItem: null,
        messages: [],
        questionsRemaining: 20,
        hintsRemaining: 3,
        gameStatus: 'active',
        mode,
        showResultModal: false,
        sending: false
      });

      if (mode === GameMode.AI_GUESSING) {
        // AI Guessing mode: Start a think round
        const response = await gameService.startThinkRound(category);
        console.log('🎮 AI Guessing game started with session_id:', response.session_id);
        
        audioManager.playSound('gameStart');
        
        const welcomeMessage: Partial<GameMessage> = {
          role: 'assistant',
          content: response.first_question,
          message_type: 'question',
        };
        
        // In AI Guessing mode, we start with 1 question asked (the first question)
        actions.setBatchState({
          gameId: response.session_id,
          secretItem: null, // User thinks of this
          messages: [welcomeMessage as GameMessage],
          questionsRemaining: 19, // LLM asked first question
          loading: false
        });
        console.log('🎮 State updated with gameId:', response.session_id);
      } else {
        // User Guessing mode: Original logic
        const response = await gameService.startGame(category, mode);
        
        audioManager.playSound('gameStart');
        
        const welcomeMessage: Partial<GameMessage> = {
          role: 'assistant',
          content: response.message,
          message_type: 'answer',
        };
        
        // Batch final state update
        actions.setBatchState({
          gameId: response.game_id,
          secretItem: null, // No longer exposed in start game response
          messages: [welcomeMessage as GameMessage],
          loading: false
        });
      }
    } catch (error) {
      handleError(error, `start ${mode} mode game`);
      onNavigateBack?.();
      actions.setLoading(false);
    }
  };

  const sendQuestion = async (questionText?: string, currentQuestion?: string) => {
    const textToSend = questionText || currentQuestion;
    if (!state.gameId || !textToSend?.trim() || state.sending) return;
    
    // Prevent duplicate questions
    if (isDuplicateRequest('question', textToSend)) return;
    recordRequest('question', textToSend);

    const userMessage: Partial<GameMessage> = {
      role: 'user',
      content: textToSend,
      message_type: 'question',
    };
    
    // Optimistic update with batched state
    actions.setBatchState({
      messages: [...state.messages, userMessage as GameMessage],
      sending: true
    });

    try {
      const response = await gameService.askQuestion(state.gameId, textToSend);
      
      const answerText = response.answer.toLowerCase();
      if (answerText.includes('yes') || answerText.startsWith('yes')) {
        audioManager.playSound('answerYes');
      } else if (answerText.includes('no') || answerText.startsWith('no')) {
        audioManager.playSound('answerNo');
      }
      
      const assistantMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: response.answer,
        message_type: 'answer',
      };
      
      // Batch all updates together
      const batchUpdates: any = {
        messages: [...state.messages, userMessage as GameMessage, assistantMessage as GameMessage],
        questionsRemaining: response.questions_remaining,
        gameStatus: response.game_status,
        sending: false
      };

      if (response.game_status === 'won') {
        audioManager.playSound('correct');
        batchUpdates.resultModalData = {
          isWin: true,
          title: 'Congratulations!',
          message: response.answer
        };
        batchUpdates.showResultModal = true;
      } else if (response.game_status === 'lost') {
        audioManager.playSound('wrong');
        batchUpdates.resultModalData = {
          isWin: false,
          title: 'Game Over!',
          message: response.answer
        };
        batchUpdates.showResultModal = true;
      }
      
      actions.setBatchState(batchUpdates);
    } catch (error) {
      handleError(error, 'send question', 'Please try again.');
      // Rollback optimistic update
      actions.setBatchState({
        messages: state.messages, // Remove the optimistic user message
        sending: false
      });
    }
  };

  const requestHint = async () => {
    if (!state.gameId || state.hintsRemaining === 0 || state.sending) return;
    
    // Prevent duplicate hint requests
    if (isDuplicateRequest('hint', state.gameId)) return;
    recordRequest('hint', state.gameId);

    actions.setSending(true);
    try {
      const response = await gameService.getHint(state.gameId);
      
      audioManager.playSound('hint');
      
      const hintMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: `💡 Hint: ${response.hint}`,
        message_type: 'hint',
      };
      
      // Batch all hint updates together
      const batchUpdates: any = {
        messages: [...state.messages, hintMessage as GameMessage],
        hintsRemaining: response.hints_remaining,
        questionsRemaining: response.questions_remaining,
        gameStatus: response.game_status,
        sending: false
      };

      if (response.game_status === 'lost') {
        audioManager.playSound('wrong');
        batchUpdates.resultModalData = {
          isWin: false,
          title: 'Game Over!',
          message: response.hint
        };
        batchUpdates.showResultModal = true;
      }
      
      actions.setBatchState(batchUpdates);
    } catch (error) {
      handleError(error, 'get hint', 'Please try again.');
      actions.setSending(false);
    }
  };

  const handleQuit = async () => {
    if (!state.gameId) {
      return;
    }
    
    audioManager.playSound('wrong');
    
    if (state.mode === GameMode.AI_GUESSING) {
      // AI guessing mode: No secret item to reveal, just end the game
      actions.setBatchState({
        gameStatus: 'lost', // User loses by quitting
        resultModalData: {
          isWin: false,
          title: 'Game Ended',
          message: 'You have left the game.'
        },
        showResultModal: true
      });
    } else {
      // Guess mode: Show loading then reveal secret item
      try {
        const response = await gameService.quitGame(state.gameId);
        
        // Show modal with the actual response
        actions.setBatchState({
          resultModalData: {
            isWin: false,
            title: 'Game Ended',
            message: response.message || 'You have left the game.'
          },
          showResultModal: true,
          gameStatus: 'lost'
        });
      } catch (error) {
        handleError(error, 'quit game');
        // Show modal with fallback message
        actions.setBatchState({
          resultModalData: {
            isWin: false,
            title: 'Game Ended',
            message: 'You have left the game.'
          },
          showResultModal: true,
          gameStatus: 'lost'
        });
      }
    }
  };

  // AI guessing mode specific methods
  const submitUserAnswer = async (answer: string, answerType: AnswerType) => {
    if (!state.gameId || !answer.trim() || state.sending || state.mode !== GameMode.AI_GUESSING) return;

    // Prevent duplicate answers
    if (isDuplicateRequest('answer', answer)) return;
    recordRequest('answer', answer);

    const userMessage: Partial<GameMessage> = {
      role: 'user',
      content: answer,
      message_type: 'answer',
    };

    // Optimistic update
    actions.setBatchState({
      messages: [...state.messages, userMessage as GameMessage],
      sending: true
    });

    try {
      const response = await gameService.submitUserAnswer(state.gameId, answer, answerType);

      // Check game status to determine next action
      if (response.game_status === 'won') {
        // LLM won - correct guess
        audioManager.playSound('wrong'); // User loses when LLM wins
        actions.setBatchState({
          messages: [...state.messages, userMessage as GameMessage],
          questionsRemaining: response.questions_remaining,
          gameStatus: response.game_status,
          resultModalData: {
            isWin: false, // User loses in AI guessing mode when LLM wins
            title: 'I Won!',
            message: 'I correctly guessed what you were thinking!'
          },
          showResultModal: true,
          sending: false
        });
      } else if (response.game_status === 'lost') {
        // LLM lost - used all 20 questions without correct guess
        audioManager.playSound('correct'); // User wins when LLM loses
        actions.setBatchState({
          messages: [...state.messages, userMessage as GameMessage],
          questionsRemaining: response.questions_remaining,
          gameStatus: response.game_status,
          resultModalData: {
            isWin: true, // User wins in AI guessing mode when LLM loses
            title: 'You Won!',
            message: 'I couldn\'t guess what you were thinking in 20 questions!'
          },
          showResultModal: true,
          sending: false
        });
      } else if (response.next_question) {
        // Game continues - add LLM's next question
        const llmMessage: Partial<GameMessage> = {
          role: 'assistant',
          content: response.next_question,
          message_type: 'question',
        };

        actions.setBatchState({
          messages: [...state.messages, userMessage as GameMessage, llmMessage as GameMessage],
          questionsRemaining: response.questions_remaining,
          gameStatus: response.game_status,
          sending: false
        });
      } else {
        // Should not happen, but handle gracefully
        console.warn('Unexpected response state:', response);
        actions.setBatchState({
          messages: [...state.messages, userMessage as GameMessage],
          questionsRemaining: response.questions_remaining,
          gameStatus: response.game_status,
          sending: false
        });
      }
    } catch (error) {
      handleError(error, 'submit answer', 'Please try again.');
      actions.setBatchState({
        messages: state.messages, // Remove optimistic update
        sending: false
      });
    }
  };

  const handleWin = async () => {
    console.log('🏆 handleWin called - gameId:', state.gameId, 'mode:', state.mode);
    if (!state.gameId || state.mode !== GameMode.AI_GUESSING) {
      console.log('🏆 handleWin early return - missing gameId or wrong mode');
      return;
    }

    try {
      console.log('🏆 handleWin proceeding with finalization');
      audioManager.playSound('correct'); // Celebration when LLM guesses correctly
      
      actions.setBatchState({
        sending: true,
        gameStatus: 'won' // LLM won
      });

      console.log('🏆 Calling finalizeThinkResult with gameId:', state.gameId);
      const response = await gameService.finalizeThinkResult(state.gameId, 'llm_win');
      console.log('🏆 Response received:', response);

      actions.setBatchState({
        resultModalData: {
          isWin: true, // Show celebration when LLM guesses correctly
          title: 'Amazing! I guessed it!',
          message: response.message
        },
        showResultModal: true,
        sending: false
      });
      console.log('🏆 Result modal should now be visible');
    } catch (error) {
      console.error('🏆 handleWin error:', error);
      handleError(error, 'finalize game', 'Please try again.');
      actions.setBatchState({
        sending: false
      });
    }
  };

  return {
    startNewGame,
    sendQuestion,
    requestHint,
    handleQuit,
    submitUserAnswer,
    handleWin,
  };
};