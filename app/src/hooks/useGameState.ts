import { useState } from 'react';
import { GameMessage, GameStatus, GameMode } from '../types/types';

export interface GameState {
  gameId: string | null;
  secretItem: string | null;
  messages: GameMessage[];
  loading: boolean;
  sending: boolean;
  questionsRemaining: number;
  hintsRemaining: number;
  gameStatus: GameStatus;
  mode: GameMode;
  showResultModal: boolean;
  resultModalData: {
    isWin: boolean;
    title: string;
    message: string;
  };
}

export interface GameStateActions {
  setGameId: (id: string | null) => void;
  setSecretItem: (item: string | null) => void;
  setMessages: (messages: GameMessage[] | ((prev: GameMessage[]) => GameMessage[])) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setQuestionsRemaining: (count: number) => void;
  setHintsRemaining: (count: number) => void;
  setGameStatus: (status: GameStatus) => void;
  setMode: (mode: GameMode) => void;
  setShowResultModal: (show: boolean) => void;
  setResultModalData: (data: { isWin: boolean; title: string; message: string }) => void;
  setBatchState: (updates: Partial<GameState>) => void;
}

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

  // Batch state update function to reduce re-renders
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