import { Alert } from 'react-native';
import { gameService } from '../services/gameService';
import { audioManager } from '../services/AudioManager';
import { GameMessage } from '../../../../shared/types';
import { GameState, GameStateActions } from './useGameState';
import { useRef } from 'react';

export interface GameActionsHook {
  startNewGame: (category: string, onNavigateBack?: () => void) => Promise<void>;
  sendQuestion: (questionText?: string, currentQuestion?: string) => Promise<void>;
  requestHint: () => Promise<void>;
  handleQuit: () => void;
}

export const useGameActions = (
  state: GameState,
  actions: GameStateActions
): GameActionsHook => {
  // Request deduplication
  const lastRequestRef = useRef<{ type: string; content: string; timestamp: number } | null>(null);
  
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
  
  const recordRequest = (type: string, content: string) => {
    lastRequestRef.current = {
      type,
      content,
      timestamp: Date.now()
    };
  };
  const startNewGame = async (category: string, onNavigateBack?: () => void) => {
    if (isDuplicateRequest('start', category)) return;
    recordRequest('start', category);
    
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
        showResultModal: false,
        sending: false
      });
      
      const response = await gameService.startGame(category);
      
      audioManager.playSound('gameStart');
      
      const welcomeMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: response.message,
        message_type: 'answer',
      };
      
      // Batch final state update
      actions.setBatchState({
        gameId: response.game_id,
        secretItem: response.secret_item,
        messages: [welcomeMessage as GameMessage],
        loading: false
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start game. Please try again.');
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
      Alert.alert('Error', 'Failed to send question. Please try again.');
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
      Alert.alert('Error', 'Failed to get hint. Please try again.');
      actions.setSending(false);
    }
  };

  const handleQuit = () => {
    audioManager.playSound('wrong');
    const secretItemMessage = state.secretItem 
      ? `You have left the game. The answer was "${state.secretItem}".`
      : 'You have left the game.';
    
    actions.setResultModalData({
      isWin: false,
      title: 'Game Ended',
      message: secretItemMessage
    });
    actions.setShowResultModal(true);
  };

  return {
    startNewGame,
    sendQuestion,
    requestHint,
    handleQuit,
  };
};