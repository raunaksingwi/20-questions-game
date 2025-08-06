import { renderHook, act } from '@testing-library/react-native';
import { useGameState } from '../useGameState';
import { GameMessage } from '../../../../../shared/types';

describe('useGameState', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useGameState());
    
    expect(result.current.state.gameId).toBeNull();
    expect(result.current.state.messages).toEqual([]);
    expect(result.current.state.loading).toBe(true);
    expect(result.current.state.sending).toBe(false);
    expect(result.current.state.questionsRemaining).toBe(20);
    expect(result.current.state.hintsRemaining).toBe(3);
    expect(result.current.state.gameStatus).toBe('active');
    expect(result.current.state.showResultModal).toBe(false);
    expect(result.current.state.resultModalData).toEqual({
      isWin: false,
      title: '',
      message: ''
    });
  });

  it('updates gameId', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setGameId('test-game-123');
    });
    
    expect(result.current.state.gameId).toBe('test-game-123');
  });

  it('updates messages', () => {
    const { result } = renderHook(() => useGameState());
    
    const testMessages: GameMessage[] = [
      {
        role: 'user',
        content: 'Is it an animal?',
        message_type: 'question',
      },
    ];
    
    act(() => {
      result.current.actions.setMessages(testMessages);
    });
    
    expect(result.current.state.messages).toEqual(testMessages);
  });

  it('updates messages with function', () => {
    const { result } = renderHook(() => useGameState());
    
    const initialMessage: GameMessage = {
      role: 'user',
      content: 'First message',
      message_type: 'question',
    };
    
    const newMessage: GameMessage = {
      role: 'assistant',
      content: 'Second message',
      message_type: 'answer',
    };
    
    act(() => {
      result.current.actions.setMessages([initialMessage]);
    });
    
    act(() => {
      result.current.actions.setMessages(prev => [...prev, newMessage]);
    });
    
    expect(result.current.state.messages).toEqual([initialMessage, newMessage]);
  });

  it('updates loading state', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setLoading(false);
    });
    
    expect(result.current.state.loading).toBe(false);
  });

  it('updates sending state', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setSending(true);
    });
    
    expect(result.current.state.sending).toBe(true);
  });

  it('updates questions remaining', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setQuestionsRemaining(15);
    });
    
    expect(result.current.state.questionsRemaining).toBe(15);
  });

  it('updates hints remaining', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setHintsRemaining(2);
    });
    
    expect(result.current.state.hintsRemaining).toBe(2);
  });

  it('updates game status', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setGameStatus('won');
    });
    
    expect(result.current.state.gameStatus).toBe('won');
  });

  it('updates show result modal', () => {
    const { result } = renderHook(() => useGameState());
    
    act(() => {
      result.current.actions.setShowResultModal(true);
    });
    
    expect(result.current.state.showResultModal).toBe(true);
  });

  it('updates result modal data', () => {
    const { result } = renderHook(() => useGameState());
    
    const resultData = {
      isWin: true,
      title: 'Congratulations!',
      message: 'You won!'
    };
    
    act(() => {
      result.current.actions.setResultModalData(resultData);
    });
    
    expect(result.current.state.resultModalData).toEqual(resultData);
  });
});