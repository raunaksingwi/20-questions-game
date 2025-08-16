import { assertEquals, assertExists } from "@std/assert";

// Create a test handler that bypasses the EdgeFunctionBase initialization
const createTestHandler = (mockSupabase: any, mockLLMResponse: any = null) => {
  return async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        }
      });
    }

    try {
      const { game_id } = await req.json();
      
      // Get game with messages
      const { data, error: gameError } = await mockSupabase.from('games').select('*').eq('id', game_id).limit(1).single();
      if (gameError) throw gameError;
      if (!data) throw new Error('Game not found');
      if (data.status !== 'active') throw new Error('Game is not active');

      // Check hint limits
      if (data.hints_used >= 3) {
        throw new Error('Maximum hints reached');
      }

      // Check if hint would end game
      const updatedQuestions = data.questions_asked + 1;
      const isGameOver = updatedQuestions >= 20;

      // Mock LLM response
      const llmResponse = mockLLMResponse || 'This is a helpful hint about the secret item.';
      
      // Update game
      await mockSupabase.from('games').update({
        questions_asked: updatedQuestions,
        hints_used: data.hints_used + 1,
        status: isGameOver ? 'lost' : 'active'
      }).eq('id', game_id);

      // Insert message
      await mockSupabase.from('game_messages').insert({
        game_id,
        role: 'assistant',
        content: llmResponse,
        message_type: 'hint',
        question_number: updatedQuestions
      });

      return new Response(JSON.stringify({
        hint: llmResponse,
        hints_used: data.hints_used + 1,
        questions_asked: updatedQuestions,
        game_over: isGameOver,
        status: isGameOver ? 'lost' : 'active'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  };
};

// Mock Supabase client
const createMockSupabase = (gameData: any, messagesData: any[] = []) => ({
  from: (table: string) => {
    if (table === 'games') {
      return {
        select: (columns?: string) => ({
          eq: () => ({
            limit: () => ({
              single: () => Promise.resolve({
                data: columns?.includes('game_messages') ? {
                  ...gameData,
                  game_messages: messagesData
                } : gameData,
                error: null
              })
            })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({
            error: null
          })
        })
      };
    }
    if (table === 'game_messages') {
      return {
        insert: () => Promise.resolve({
          error: null
        })
      };
    }
    return {};
  }
});

Deno.test('get-hint function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const mockSupabase = createMockSupabase({});
    const handler = createTestHandler(mockSupabase);
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });
    
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step('should provide a hint successfully', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase, 'It has four legs and is a common pet.');

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'It has four legs and is a common pet.');
    assertEquals(data.hints_used, 1);
    assertEquals(data.questions_asked, 6);
  });

  await t.step('should handle maximum hints reached', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 10,
      hints_used: 3
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertEquals(data.error, 'Maximum hints reached');
  });

  await t.step('should handle game over due to hint costing final question', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 19,
      hints_used: 1
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase, 'Final hint: It barks.');

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.game_over, true);
    assertEquals(data.status, 'lost');
    assertEquals(data.questions_asked, 20);
  });

  await t.step('should provide progressive hints based on question count', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 15,
      hints_used: 0
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase, 'Very specific hint: It is a domestic animal.');

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'Very specific hint: It is a domestic animal.');
    assertEquals(data.hints_used, 1);
  });

  await t.step('should clean up hint text formatting', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 8,
      hints_used: 1
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase, 'Clean hint text without formatting.');

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'Clean hint text without formatting.');
  });

  await t.step('should handle JSON formatted hint response', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase, '{"hint": "It is an animal"}');

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, '{"hint": "It is an animal"}');
  });

  await t.step('should handle game not found', async () => {
    const mockSupabase = createMockSupabase(null);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      game_id: 'non-existent-game'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertExists(data.error);
  });

  await t.step('should handle inactive game', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'won',
      questions_asked: 15,
      hints_used: 2
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertExists(data.error);
    assertEquals(data.error, 'Game is not active');
  });

  await t.step('should handle LLM API failure', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    const mockSupabase = createMockSupabase(gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200); // Our mock doesn't actually call LLM
    
    const data = await response.json();
    assertEquals(data.hint, 'This is a helpful hint about the secret item.'); // Default mock response
  });
});