import { Alert } from 'react-native';
import { gameService } from './gameService';
import { audioManager } from './AudioManager';
import { GameMessage } from '../types/types';
import { GameState, GameStateActions } from '../hooks/useGameState';

export class GameInteractionManager {
  constructor(
    private state: GameState,
    private actions: GameStateActions
  ) {}

  async sendQuestion(questionText?: string, currentQuestion?: string): Promise<void> {
    const textToSend = questionText || currentQuestion;
    if (!this.state.gameId || !textToSend?.trim() || this.state.sending) return;

    const userMessage: Partial<GameMessage> = {
      role: 'user',
      content: textToSend,
      message_type: 'question',
    };
    
    // Optimistic update with batched state
    this.actions.setBatchState({
      messages: [...this.state.messages, userMessage as GameMessage],
      sending: true
    });

    try {
      const response = await gameService.askQuestion(this.state.gameId, textToSend);
      
      this.playResponseAudio(response.answer);
      
      const assistantMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: response.answer,
        message_type: 'answer',
      };
      
      // Batch all updates together
      const batchUpdates: any = {
        messages: [...this.state.messages, userMessage as GameMessage, assistantMessage as GameMessage],
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
      
      this.actions.setBatchState(batchUpdates);
    } catch (error) {
      Alert.alert('Error', 'Failed to send question. Please try again.');
      // Rollback optimistic update
      this.actions.setBatchState({
        messages: this.state.messages, // Remove the optimistic user message
        sending: false
      });
    }
  }

  async requestHint(): Promise<void> {
    if (!this.state.gameId || this.state.hintsRemaining === 0 || this.state.sending) return;

    this.actions.setSending(true);
    try {
      const response = await gameService.getHint(this.state.gameId);
      
      audioManager.playSound('hint');
      
      const hintMessage: Partial<GameMessage> = {
        role: 'assistant',
        content: `💡 Hint: ${response.hint}`,
        message_type: 'hint',
      };
      
      // Batch all hint updates together
      const batchUpdates: any = {
        messages: [...this.state.messages, hintMessage as GameMessage],
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
      
      this.actions.setBatchState(batchUpdates);
    } catch (error) {
      Alert.alert('Error', 'Failed to get hint. Please try again.');
      this.actions.setSending(false);
    }
  }

  private playResponseAudio(answer: string): void {
    const answerText = answer.toLowerCase();
    if (answerText.includes('yes') || answerText.startsWith('yes')) {
      audioManager.playSound('answerYes');
    } else if (answerText.includes('no') || answerText.startsWith('no')) {
      audioManager.playSound('answerNo');
    }
  }
}