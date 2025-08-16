/**
 * Custom hook for managing the overall game state using React useState.
 * Provides centralized state management for game data, UI state, and actions.
 */
import { useState } from 'react';
import { GameMessage, GameStatus, GameMode } from '../types/types';

/**
 * Interface defining the complete game state structure.
 */
export interface GameState {
  /** Unique identifier for the current game */
  gameId: string | null;
  /** The secret item the user is trying to guess */
  secretItem: string | null;
  /** Array of all game messages in the conversation */
  messages: GameMessage[];
  /** Whether the game is in a loading state */
  loading: boolean;
  /** Whether a request is currently being sent */
  sending: boolean;
  /** Number of questions remaining */
  questionsRemaining: number;
  /** Number of hints remaining */
  hintsRemaining: number;
  /** Current status of the game */
  gameStatus: GameStatus;
  /** Current game mode */
  mode: GameMode;
  /** Whether the result modal should be shown */
  showResultModal: boolean;
  /** Data for the result modal */
  resultModalData: {
    isWin: boolean;
    title: string;
    message: string;
  };
}

/**
 * Interface defining all available state update actions.
 */
export interface GameStateActions {
  /** Set the current game ID */
  setGameId: (id: string | null) => void;
  /** Set the secret item being guessed */
  setSecretItem: (item: string | null) => void;
  /** Set or update the messages array */
  setMessages: (messages: GameMessage[] | ((prev: GameMessage[]) => GameMessage[])) => void;
  /** Set the loading state */
  setLoading: (loading: boolean) => void;
  /** Set the sending state */
  setSending: (sending: boolean) => void;
  /** Set the number of questions remaining */
  setQuestionsRemaining: (count: number) => void;
  /** Set the number of hints remaining */
  setHintsRemaining: (count: number) => void;
  /** Set the current game status */
  setGameStatus: (status: GameStatus) => void;
  /** Set the current game mode */
  setMode: (mode: GameMode) => void;
  /** Set whether to show the result modal */
  setShowResultModal: (show: boolean) => void;
  /** Set the result modal data */
  setResultModalData: (data: { isWin: boolean; title: string; message: string }) => void;
  /** Update multiple state properties at once */
  setBatchState: (updates: Partial<GameState>) => void;
}

/**
 * Creates and manages game state with actions for updating individual state pieces.
 * Returns both the current state and action functions for state updates.
 */
export const useGameState = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [secretItem, setSecretItem] = useState<string | null>(null);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [questionsRemaining, setQuestionsRemaining] = useState(20);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [gameStatus, setGameStatus] = useState<GameStatus>('active');
  const [mode, setMode] = useState<GameMode>(GameMode.USER_GUESSING);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState({
    isWin: false,
    title: '',
    message: ''
  });

  const state: GameState = {
    gameId,
    secretItem,
    messages,
    loading,
    sending,
    questionsRemaining,
    hintsRemaining,
    gameStatus,
    mode,
    showResultModal,
    resultModalData,
  };

  /**
   * Batch state update function to reduce re-renders by updating multiple properties together.
   */
  const setBatchState = (updates: Partial<GameState>) => {
    // Use functional updates to ensure all changes are applied together
    Object.entries(updates).forEach(([key, value]) => {
      switch (key) {
        case 'gameId':
          setGameId(value as string | null);
          break;
        case 'secretItem':
          setSecretItem(value as string | null);
          break;
        case 'messages':
          setMessages(value as GameMessage[]);
          break;
        case 'loading':
          setLoading(value as boolean);
          break;
        case 'sending':
          setSending(value as boolean);
          break;
        case 'questionsRemaining':
          setQuestionsRemaining(value as number);
          break;
        case 'hintsRemaining':
          setHintsRemaining(value as number);
          break;
        case 'gameStatus':
          setGameStatus(value as GameStatus);
          break;
        case 'mode':
          setMode(value as GameMode);
          break;
        case 'showResultModal':
          setShowResultModal(value as boolean);
          break;
        case 'resultModalData':
          setResultModalData(value as { isWin: boolean; title: string; message: string });
          break;
      }
    });
  };

  const actions: GameStateActions = {
    setGameId,
    setSecretItem,
    setMessages,
    setLoading,
    setSending,
    setQuestionsRemaining,
    setHintsRemaining,
    setGameStatus,
    setMode,
    setShowResultModal,
    setResultModalData,
    setBatchState,
  };

  return { state, actions };
};