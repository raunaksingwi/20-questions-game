import { Alert } from 'react-native';
import { gameService } from '../services/gameService';
import { audioManager } from '../services/AudioManager';
import { GameMessage } from '../../../../shared/types';
import { GameState, GameStateActions } from './useGameState';

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
  const startNewGame = async (category: string, onNavigateBack?: () => void) => {
    try {
      actions.setLoading(true);
      
      // Reset all game state before starting new game
      actions.setGameId(null);
      actions.setSecretItem(null);
      actions.setMessages([]);
      actions.setQuestionsRemaining(20);
      actions.setHintsRemaining(3);
      actions.setGameStatus('active');
      actions.setShowResultModal(false);
      actions.setSending(false);
      
      const response = await gameService.startGame(category);
      actions.setGameId(response.game_id);
      actions.setSecretItem(response.secret_item);
      
      audioManager.playSound('gameStart');
      
      const welcomeMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: response.message,
        message_type: 'answer',
      };
      actions.setMessages([welcomeMessage as GameMessage]);
    } catch (error) {
      Alert.alert('Error', 'Failed to start game. Please try again.');
      onNavigateBack?.();
    } finally {
      actions.setLoading(false);
    }
  };

  const sendQuestion = async (questionText?: string, currentQuestion?: string) => {
    const textToSend = questionText || currentQuestion;
    if (!state.gameId || !textToSend?.trim() || state.sending) return;

    const userMessage: Partial<GameMessage> = {
      role: 'user',
      content: textToSend,
      message_type: 'question',
    };
    actions.setMessages(prev => [...prev, userMessage as GameMessage]);
    actions.setSending(true);

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
      actions.setMessages(prev => [...prev, assistantMessage as GameMessage]);
      actions.setQuestionsRemaining(response.questions_remaining);
      actions.setGameStatus(response.game_status);

      if (response.game_status === 'won') {
        audioManager.playSound('correct');
        actions.setResultModalData({
          isWin: true,
          title: 'Congratulations!',
          message: response.answer
        });
        actions.setShowResultModal(true);
      } else if (response.game_status === 'lost') {
        audioManager.playSound('wrong');
        actions.setResultModalData({
          isWin: false,
          title: 'Game Over!',
          message: response.answer
        });
        actions.setShowResultModal(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send question. Please try again.');
    } finally {
      actions.setSending(false);
    }
  };

  const requestHint = async () => {
    if (!state.gameId || state.hintsRemaining === 0 || state.sending) return;

    actions.setSending(true);
    try {
      const response = await gameService.getHint(state.gameId);
      
      audioManager.playSound('hint');
      
      const hintMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: `💡 Hint: ${response.hint}`,
        message_type: 'hint',
      };
      actions.setMessages(prev => [...prev, hintMessage as GameMessage]);
      actions.setHintsRemaining(response.hints_remaining);
      actions.setQuestionsRemaining(response.questions_remaining);
      actions.setGameStatus(response.game_status);

      if (response.game_status === 'lost') {
        audioManager.playSound('wrong');
        actions.setResultModalData({
          isWin: false,
          title: 'Game Over!',
          message: response.hint
        });
        actions.setShowResultModal(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get hint. Please try again.');
    } finally {
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