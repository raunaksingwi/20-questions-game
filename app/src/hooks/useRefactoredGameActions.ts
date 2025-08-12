import { GameState, GameStateActions } from './useGameState';
import { GameLifecycleManager } from '../services/GameLifecycleManager';
import { GameInteractionManager } from '../services/GameInteractionManager';
import { useRequestDeduplication } from '../services/RequestDeduplicationManager';

export interface GameActionsHook {
  startNewGame: (category: string, onNavigateBack?: () => void) => Promise<void>;
  sendQuestion: (questionText?: string, currentQuestion?: string) => Promise<void>;
  requestHint: () => Promise<void>;
  handleQuit: () => void;
}

export const useRefactoredGameActions = (
  state: GameState,
  actions: GameStateActions
): GameActionsHook => {
  const { isDuplicateRequest, recordRequest } = useRequestDeduplication();
  
  const lifecycleManager = new GameLifecycleManager(state, actions);
  const interactionManager = new GameInteractionManager(state, actions);

  const startNewGame = async (category: string, onNavigateBack?: () => void) => {
    if (isDuplicateRequest('start', category)) return;
    recordRequest('start', category);
    
    await lifecycleManager.startNewGame(category, onNavigateBack);
  };

  const sendQuestion = async (questionText?: string, currentQuestion?: string) => {
    const textToSend = questionText || currentQuestion;
    if (!textToSend?.trim()) return;
    
    // Prevent duplicate questions
    if (isDuplicateRequest('question', textToSend)) return;
    recordRequest('question', textToSend);

    await interactionManager.sendQuestion(questionText, currentQuestion);
  };

  const requestHint = async () => {
    if (!state.gameId) return;
    
    // Prevent duplicate hint requests
    if (isDuplicateRequest('hint', state.gameId)) return;
    recordRequest('hint', state.gameId);

    await interactionManager.requestHint();
  };

  const handleQuit = async () => {
    await lifecycleManager.handleQuit();
  };

  return {
    startNewGame,
    sendQuestion,
    requestHint,
    handleQuit,
  };
};