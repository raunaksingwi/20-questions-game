// Mock the shared types module first
jest.mock('../../../../shared/types', () => ({}));

import { gameService } from '../gameService';
import { supabase } from '../supabase';

// Mock fetch globally
global.fetch = jest.fn();

// Mock supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

describe('GameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    // Clear cache between tests
    gameService.invalidateCategoriesCache();
  });

  describe('startGame', () => {
    it('should start a new game with category', async () => {
      const mockUser = { id: 'user-123' };
      const mockResponse = {
        game_id: 'game-123',
        message: 'Welcome! Think of an animal...',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.startGame('Animals');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/start-game',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            category: 'Animals',
            user_id: 'user-123',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should start a game without user (anonymous)', async () => {
      const mockResponse = {
        game_id: 'game-123',
        message: 'Welcome!',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.startGame();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/start-game',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            category: undefined,
            user_id: undefined,
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(gameService.startGame('Animals')).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('askQuestion', () => {
    it('should send a question and receive an answer', async () => {
      const mockResponse = {
        answer: 'Yes, it has four legs.',
        questions_remaining: 19,
        game_status: 'active',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.askQuestion('game-123', 'Does it have four legs?');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/ask-question',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            game_id: 'game-123',
            question: 'Does it have four legs?',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle game won status', async () => {
      const mockResponse = {
        answer: 'Yes! You got it!',
        questions_remaining: 15,
        game_status: 'won',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.askQuestion('game-123', 'Is it a dog?');

      expect(result.game_status).toBe('won');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Game not found' }),
      });

      await expect(
        gameService.askQuestion('invalid-game', 'Test question')
      ).rejects.toThrow('Game not found');
    });
  });

  describe('getHint', () => {
    it('should get a hint successfully', async () => {
      const mockResponse = {
        hint: 'It lives in the water',
        hints_remaining: 2,
        questions_remaining: 19,
        game_status: 'active',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.getHint('game-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/get-hint',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            game_id: 'game-123',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle no hints remaining error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'No hints remaining' }),
      });

      await expect(gameService.getHint('game-123')).rejects.toThrow(
        'No hints remaining'
      );
    });
  });

  describe('quitGame', () => {
    it('should quit a game successfully', async () => {
      const mockResponse = {
        message: 'You have left the game. The answer was "dog".',
        secret_item: 'dog',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.quitGame('game-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/quit-game',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            game_id: 'game-123',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle quit game API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Game not found' }),
      });

      await expect(gameService.quitGame('invalid-game')).rejects.toThrow(
        'Game not found'
      );
    });
  });

  describe('getCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories = [
        { id: '1', name: 'Animals', sample_items: ['dog', 'cat'] },
        { id: '2', name: 'Food', sample_items: ['pizza', 'burger'] },
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockCategories,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await gameService.getCategories();

      expect(supabase.from).toHaveBeenCalledWith('categories');
      expect(fromMock.select).toHaveBeenCalledWith('*');
      expect(fromMock.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockCategories);
    });

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await gameService.getCategories();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching categories from DB:',
        { message: 'Database error' }
      );
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getGame', () => {
    it('should fetch a game by ID', async () => {
      const mockGame = {
        id: 'game-123',
        category: 'Animals',
        secret_item: 'dog',
        status: 'active',
      };

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockGame,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await gameService.getGame('game-123');

      expect(supabase.from).toHaveBeenCalledWith('games');
      expect(fromMock.select).toHaveBeenCalledWith('*');
      expect(fromMock.eq).toHaveBeenCalledWith('id', 'game-123');
      expect(fromMock.single).toHaveBeenCalled();
      expect(result).toEqual(mockGame);
    });

    it('should return null on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Game not found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await gameService.getGame('invalid-id');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching game:',
        { message: 'Game not found' }
      );
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getGameMessages', () => {
    it('should fetch game messages ordered by creation time', async () => {
      const mockMessages = [
        {
          id: '1',
          game_id: 'game-123',
          role: 'assistant',
          content: 'Welcome!',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          game_id: 'game-123',
          role: 'user',
          content: 'Is it alive?',
          created_at: '2024-01-01T00:01:00Z',
        },
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockMessages,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await gameService.getGameMessages('game-123');

      expect(supabase.from).toHaveBeenCalledWith('game_messages');
      expect(fromMock.select).toHaveBeenCalledWith('*');
      expect(fromMock.eq).toHaveBeenCalledWith('game_id', 'game-123');
      expect(fromMock.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(result).toEqual(mockMessages);
    });

    it('should return empty array on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(fromMock);

      const result = await gameService.getGameMessages('game-123');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching messages:',
        { message: 'Database error' }
      );
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('startThinkRound', () => {
    it('should start a new Think mode round successfully', async () => {
      const mockUser = { id: 'user-456' };
      const mockResponse = {
        game_id: 'think-game-789',
        message: 'Is it something you can hold in your hands?',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.startThinkRound('Animals', 'user-456');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/start-think-round',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            category: 'Animals',
            user_id: 'user-456',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should start Think mode without user (anonymous)', async () => {
      const mockResponse = {
        game_id: 'anon-think-game',
        message: 'Is it alive?',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.startThinkRound('Food');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/start-think-round',
        expect.objectContaining({
          body: JSON.stringify({
            category: 'Food',
            user_id: undefined,
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle startThinkRound API errors', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Think mode not available' }),
      });

      await expect(gameService.startThinkRound('Animals')).rejects.toThrow(
        'Think mode not available'
      );
    });
  });

  describe('submitUserAnswer', () => {
    it('should submit user answer and get next question', async () => {
      const mockResponse = {
        next_question: 'Is it bigger than a breadbox?',
        questions_asked: 3,
        game_status: 'active',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.submitUserAnswer('think-game-123', 'Yes', 'chip');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/submit-user-answer',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            session_id: 'think-game-123',
            answer: 'Yes',
            answer_type: 'chip',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle LLM victory (no next question)', async () => {
      const mockResponse = {
        next_question: null,
        questions_asked: 8,
        game_status: 'lost',
        final_message: 'I got it! You were thinking of a cat!',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.submitUserAnswer('think-game-123', 'Maybe', 'chip');

      expect(result.next_question).toBeNull();
      expect(result.game_status).toBe('lost');
      expect(result.final_message).toContain('cat');
    });

    it('should handle auto-loss at question 20', async () => {
      const mockResponse = {
        next_question: null,
        questions_asked: 20,
        game_status: 'won',
        final_message: 'I couldn\'t guess it! You win!',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.submitUserAnswer('think-game-123', 'No', 'chip');

      expect(result.questions_asked).toBe(20);
      expect(result.game_status).toBe('won');
      expect(result.final_message).toContain('You win');
    });

    it('should handle all answer types correctly', async () => {
      const answerTypes = [
        { answer: 'Yes', type: 'chip' },
        { answer: 'No', type: 'chip' },
        { answer: 'Maybe', type: 'text' },
        { answer: "Don't know", type: 'voice' },
      ];

      for (const { answer, type } of answerTypes) {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            next_question: 'Next question',
            questions_asked: 1,
            game_status: 'active',
          }),
        });

        await gameService.submitUserAnswer('game-123', answer, type);

        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              session_id: 'game-123',
              answer: answer,
              answer_type: type,
            }),
          })
        );
      }
    });

    it('should handle submitUserAnswer API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Game session expired' }),
      });

      await expect(
        gameService.submitUserAnswer('invalid-game', 'Yes', 'chip')
      ).rejects.toThrow('Game session expired');
    });
  });

  describe('finalizeThinkResult', () => {
    it('should finalize Think mode with WIN button', async () => {
      const mockResponse = {
        message: 'You win! I couldn\'t guess what you were thinking of.',
        questions_asked: 12,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.finalizeThinkResult('think-game-123', 'llm_loss');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/finalize-think-result',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-anon-key',
          }),
          body: JSON.stringify({
            session_id: 'think-game-123',
            result: 'llm_loss',
          }),
          signal: expect.any(AbortSignal),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle WIN button pressed immediately (before any questions)', async () => {
      const mockResponse = {
        message: 'You win! I give up before even starting.',
        questions_asked: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.finalizeThinkResult('think-game-123', 'llm_loss');

      expect(result.questions_asked).toBe(0);
      expect(result.message).toContain('give up');
    });

    it('should handle finalizeThinkResult API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Cannot finalize game' }),
      });

      await expect(gameService.finalizeThinkResult('invalid-game', 'llm_loss')).rejects.toThrow(
        'Cannot finalize game'
      );
    });
  });

  describe('Think Mode Edge Cases', () => {
    it('should handle network timeout during submitUserAnswer', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        gameService.submitUserAnswer('game-123', 'Yes', 'chip')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle malformed response from startThinkRound', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing game_id field
          message: 'Is it alive?',
        }),
      });

      const result = await gameService.startThinkRound('Animals');
      expect(result.message).toBe('Is it alive?');
      expect(result.game_id).toBeUndefined();
    });

    it('should handle ambiguous answers in submitUserAnswer', async () => {
      const mockResponse = {
        next_question: 'Can you be more specific?',
        questions_asked: 5,
        game_status: 'active',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gameService.submitUserAnswer('game-123', 'Maybe', 'chip');

      expect(result.next_question).toContain('more specific');
    });

    it('should handle very long user answers', async () => {
      const veryLongAnswer = 'A'.repeat(5000);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          next_question: 'Answer too long, please keep it brief',
          questions_asked: 3,
          game_status: 'active',
        }),
      });

      const result = await gameService.submitUserAnswer('game-123', veryLongAnswer, 'text');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            session_id: 'game-123',
            answer: veryLongAnswer,
            answer_type: 'text',
          }),
        })
      );

      expect(result.next_question).toContain('too long');
    });

    it('should handle concurrent submitUserAnswer calls', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            next_question: `Question ${callCount}`,
            questions_asked: callCount,
            game_status: 'active',
          }),
        });
      });

      const promises = [
        gameService.submitUserAnswer('game-123', 'Yes', 'chip'),
        gameService.submitUserAnswer('game-123', 'No', 'chip'),
        gameService.submitUserAnswer('game-123', 'Maybe', 'text'),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.next_question?.startsWith('Question'))).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle finalizeThinkResult with concurrent calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'You win!',
          questions_asked: 8,
        }),
      });

      const promises = [
        gameService.finalizeThinkResult('game-123', 'llm_loss'),
        gameService.finalizeThinkResult('game-123', 'llm_loss'),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(2);
      expect(results[0].message).toBe('You win!');
      expect(results[1].message).toBe('You win!');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    describe('Network Timeouts and Connection Issues', () => {
      it('should handle network timeout during startGame', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: null },
        });

        // Simulate network timeout
        (global.fetch as jest.Mock).mockRejectedValue(
          new Error('Network timeout')
        );

        await expect(gameService.startGame('Animals')).rejects.toThrow(
          'Network timeout'
        );
      });

      it('should handle connection refused during askQuestion', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
          new Error('Connection refused')
        );

        await expect(
          gameService.askQuestion('game-123', 'Test question')
        ).rejects.toThrow('Connection refused');
      });

      it('should handle slow network responses', async () => {
        const slowResponse = new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                answer: 'Yes',
                questions_remaining: 19,
                game_status: 'active',
              }),
            });
          }, 100);
        });

        (global.fetch as jest.Mock).mockReturnValue(slowResponse);

        const result = await gameService.askQuestion('game-123', 'Test?');
        expect(result.answer).toBe('Yes');
      });
    });

    describe('Malformed Response Handling', () => {
      it('should handle invalid JSON in startGame response', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: null },
        });

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });

        await expect(gameService.startGame('Animals')).rejects.toThrow(
          'Invalid JSON'
        );
      });

      it('should handle missing required fields in askQuestion response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({}), // Missing required fields
        });

        const result = await gameService.askQuestion('game-123', 'Test?');
        expect(result).toEqual({});
      });

      it('should handle null response from getHint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => null,
        });

        const result = await gameService.getHint('game-123');
        expect(result).toBeNull();
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle maximum question length', async () => {
        const veryLongQuestion = 'A'.repeat(10000); // 10KB question
        
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            answer: 'Question too long',
            questions_remaining: 19,
            game_status: 'active',
          }),
        });

        const result = await gameService.askQuestion('game-123', veryLongQuestion);
        expect(result.answer).toBe('Question too long');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              game_id: 'game-123',
              question: veryLongQuestion,
            }),
          })
        );
      });

      it('should handle empty question string', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            answer: 'Please ask a question',
            questions_remaining: 20,
            game_status: 'active',
          }),
        });

        const result = await gameService.askQuestion('game-123', '');
        expect(result.answer).toBe('Please ask a question');
      });

      it('should handle special characters in category names', async () => {
        const specialCategory = 'Pokémon & Digimon™';
        
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: null },
        });

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            game_id: 'game-123',
            message: 'Welcome!',
          }),
        });

        await gameService.startGame(specialCategory);
        
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              category: specialCategory,
              user_id: undefined,
            }),
          })
        );
      });

      it('should handle zero questions remaining', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            answer: 'Game over! You ran out of questions.',
            questions_remaining: 0,
            game_status: 'lost',
          }),
        });

        const result = await gameService.askQuestion('game-123', 'Final guess?');
        expect(result.questions_remaining).toBe(0);
        expect(result.game_status).toBe('lost');
      });

      it('should handle zero hints remaining', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          json: async () => ({ error: 'No hints remaining' }),
        });

        await expect(gameService.getHint('game-123')).rejects.toThrow(
          'No hints remaining'
        );
      });
    });

    describe('Race Conditions and Concurrent Operations', () => {
      it('should handle multiple concurrent askQuestion calls', async () => {
        let callCount = 0;
        (global.fetch as jest.Mock).mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              answer: `Answer ${callCount}`,
              questions_remaining: 20 - callCount,
              game_status: 'active',
            }),
          });
        });

        const promises = [
          gameService.askQuestion('game-123', 'Question 1'),
          gameService.askQuestion('game-123', 'Question 2'),
          gameService.askQuestion('game-123', 'Question 3'),
        ];

        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(3);
        expect(results[0].answer).toMatch(/Answer \d/);
        expect(results[1].answer).toMatch(/Answer \d/);
        expect(results[2].answer).toMatch(/Answer \d/);
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      it('should handle concurrent startGame and askQuestion', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
        });

        let fetchCallCount = 0;
        (global.fetch as jest.Mock).mockImplementation((url) => {
          fetchCallCount++;
          if (url.includes('start-game')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                game_id: 'game-123',
                message: 'Welcome!',
              }),
            });
          } else {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                answer: 'Game not ready',
                questions_remaining: 20,
                game_status: 'active',
              }),
            });
          }
        });

        const [startResult, askResult] = await Promise.all([
          gameService.startGame('Animals'),
          gameService.askQuestion('game-123', 'Test question'),
        ]);

        expect(startResult.game_id).toBe('game-123');
        expect(askResult.answer).toBe('Game not ready');
        expect(fetchCallCount).toBe(2);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should handle getUser throwing an error', async () => {
        (supabase.auth.getUser as jest.Mock).mockRejectedValue(
          new Error('Auth service unavailable')
        );

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            game_id: 'game-123',
            message: 'Welcome!',
          }),
        });

        // Should still work with undefined user_id
        const result = await gameService.startGame('Animals');
        expect(result.game_id).toBe('game-123');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              category: 'Animals',
              user_id: undefined,
            }),
          })
        );
      });

      it('should handle malformed user object', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: null } }, // Malformed user
        });

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            game_id: 'game-123',
            message: 'Welcome!',
          }),
        });

        await gameService.startGame('Animals');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              category: 'Animals',
              user_id: null,
            }),
          })
        );
      });
    });

    describe('Database Edge Cases', () => {
      it('should handle database connection timeout for categories', async () => {
        const fromMock = {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockRejectedValue(new Error('Connection timeout')),
        };

        (supabase.from as jest.Mock).mockReturnValue(fromMock);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await gameService.getCategories();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching categories:',
          expect.any(Error)
        );
        expect(result).toEqual([]);

        consoleErrorSpy.mockRestore();
      });

      it('should handle very large category dataset', async () => {
        const largeCategories = Array.from({ length: 1000 }, (_, i) => ({
          id: i.toString(),
          name: `Category ${i}`,
          sample_items: [`item${i}1`, `item${i}2`, `item${i}3`],
        }));

        const fromMock = {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: largeCategories,
            error: null,
          }),
        };

        (supabase.from as jest.Mock).mockReturnValue(fromMock);

        const result = await gameService.getCategories();
        expect(result).toHaveLength(1000);
        expect(result[0].name).toBe('Category 0');
        expect(result[999].name).toBe('Category 999');
      });
    });
  });
});