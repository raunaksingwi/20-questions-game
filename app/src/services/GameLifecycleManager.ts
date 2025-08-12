import { Alert } from 'react-native';
import { gameService } from './gameService';
import { audioManager } from './AudioManager';
import { GameMessage } from '../../../shared/types';
import { GameState, GameStateActions } from '../hooks/useGameState';
import { DEFAULT_GAME_CONFIG } from './GameConfig';

export class GameLifecycleManager {
  constructor(
    private state: GameState,
    private actions: GameStateActions
  ) {}

  async startNewGame(category: string, onNavigateBack?: () => void): Promise<void> {
    try {
      // Batch initial state reset
      this.actions.setBatchState({
        loading: true,
        gameId: null,
        secretItem: null,
        messages: [],
        questionsRemaining: DEFAULT_GAME_CONFIG.maxQuestions,
        hintsRemaining: DEFAULT_GAME_CONFIG.maxHints,
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
      this.actions.setBatchState({
        gameId: response.game_id,
        secretItem: null, // No longer exposed in start game response
        messages: [welcomeMessage as GameMessage],
        loading: false
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start game. Please try again.');
      onNavigateBack?.();
      this.actions.setLoading(false);
    }
  }

  async handleQuit(): Promise<void> {
    if (!this.state.gameId) return;
    
    try {
      audioManager.playSound('wrong');
      const response = await gameService.quitGame(this.state.gameId);
      
      this.actions.setResultModalData({
        isWin: false,
        title: 'Game Ended',
        message: response.message
      });
      this.actions.setShowResultModal(true);
    } catch (error) {
      // Fallback if quit API fails
      audioManager.playSound('wrong');
      this.actions.setResultModalData({
        isWin: false,
        title: 'Game Ended',
        message: 'You have left the game.'
      });
      this.actions.setShowResultModal(true);
    }
  }
}