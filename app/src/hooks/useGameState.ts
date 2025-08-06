import { useState } from 'react';
import { GameMessage, GameStatus } from '../../../../shared/types';

export interface GameState {
  gameId: string | null;
  messages: GameMessage[];
  loading: boolean;
  sending: boolean;
  questionsRemaining: number;
  hintsRemaining: number;
  gameStatus: GameStatus;
  showResultModal: boolean;
  resultModalData: {
    isWin: boolean;
    title: string;
    message: string;
  };
}

export interface GameStateActions {
  setGameId: (id: string | null) => void;
  setMessages: (messages: GameMessage[] | ((prev: GameMessage[]) => GameMessage[])) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setQuestionsRemaining: (count: number) => void;
  setHintsRemaining: (count: number) => void;
  setGameStatus: (status: GameStatus) => void;
  setShowResultModal: (show: boolean) => void;
  setResultModalData: (data: { isWin: boolean; title: string; message: string }) => void;
}

export const useGameState = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [questionsRemaining, setQuestionsRemaining] = useState(20);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [gameStatus, setGameStatus] = useState<GameStatus>('active');
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState({
    isWin: false,
    title: '',
    message: ''
  });

  const state: GameState = {
    gameId,
    messages,
    loading,
    sending,
    questionsRemaining,
    hintsRemaining,
    gameStatus,
    showResultModal,
    resultModalData,
  };

  const actions: GameStateActions = {
    setGameId,
    setMessages,
    setLoading,
    setSending,
    setQuestionsRemaining,
    setHintsRemaining,
    setGameStatus,
    setShowResultModal,
    setResultModalData,
  };

  return { state, actions };
};