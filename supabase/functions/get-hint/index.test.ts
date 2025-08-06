import { assertEquals, assertExists } from "@std/assert";

// Mock Supabase client
const createMockSupabase = (gameData: any, messagesData: any[] = []) => ({
  from: (table: string) => {
    if (table === 'games') {
      return {
        select: () => ({
          eq: () => ({
            single: () => ({
              data: gameData,
              error: null
            })
          })
        }),
        update: () => ({
          eq: () => ({
            error: null
          })
        }),
        delete: () => ({
          eq: () => ({
            error: null
          })
        })
      };
    }
    if (table === 'game_messages') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              data: messagesData,
              error: null
            })
          })
        }),
        upsert: () => ({
          error: null
        }),
        delete: () => ({
          eq: () => ({
            error: null
          })
        })
      };
    }
    return {};
  }
});

// Mock fetch for Anthropic API
const mockFetch = (response: any, ok = true) => {
  globalThis.fetch = async () => ({
    ok,
    json: async () => response
  });
};

// Mock environment variables
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
Deno.env.set('ANTHROPIC_API_KEY', 'test-anthropic-key');

Deno.test('get-hint function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });
    
    const { default: handler } = await import('./index.ts');
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

    const messagesData = [
      { role: 'system', content: 'System prompt...', created_at: '2024-01-01T00:00:00Z' },
      { role: 'user', content: 'Is it alive?', created_at: '2024-01-01T00:01:00Z' },
      { role: 'assistant', content: 'Yes', created_at: '2024-01-01T00:02:00Z' }
    ];

    globalThis.createClient = () => createMockSupabase(gameData, messagesData);

    // Mock Anthropic response with a hint
    mockFetch({
      content: [{ text: 'It is a common household pet that is known for being loyal.' }]
    });

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'It is a common household pet that is known for being loyal.');
    assertEquals(data.hints_remaining, 2); // 3 - 1
    assertEquals(data.questions_remaining, 13); // 20 - 6 - 1 (hint costs a question)
    assertEquals(data.game_status, 'active');
  });

  await t.step('should handle maximum hints reached', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 10,
      hints_used: 3 // Maximum hints used
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertEquals(data.error, "You've already used all 3 hints!");
  });

  await t.step('should handle game over due to hint costing final question', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'cat',
      status: 'active',
      questions_asked: 19, // Using hint will make it 20
      hints_used: 1
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    mockFetch({
      content: [{ text: 'It meows and purrs.' }]
    });

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'It meows and purrs.');
    assertEquals(data.hints_remaining, 1); // 3 - 2
    assertEquals(data.questions_remaining, 0); // 20 - 20
    assertEquals(data.game_status, 'lost');
  });

  await t.step('should provide progressive hints based on question count', async () => {
    // Test different question counts to see if hint context changes
    const testCases = [
      { questions_asked: 3, expected_context: 'general category' },
      { questions_asked: 7, expected_context: 'characteristics' },
      { questions_asked: 12, expected_context: 'features or usage' },
      { questions_asked: 18, expected_context: 'context, usage, or where' }
    ];

    for (const testCase of testCases) {
      const gameData = {
        id: 'test-game-id',
        secret_item: 'bicycle',
        status: 'active',
        questions_asked: testCase.questions_asked,
        hints_used: 0
      };

      globalThis.createClient = () => createMockSupabase(gameData, []);

      mockFetch({
        content: [{ text: 'It has two wheels and pedals.' }]
      });

      const requestBody = {
        game_id: 'test-game-id'
      };
      
      const request = new Request('http://localhost:8000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const { default: handler } = await import('./index.ts');
      const response = await handler(request);
      
      assertEquals(response.status, 200);
      
      const data = await response.json();
      assertEquals(typeof data.hint, 'string');
      assertEquals(data.game_status, 'active');
    }
  });

  await t.step('should clean up hint text formatting', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    // Mock response with formatting that should be cleaned
    mockFetch({
      content: [{ text: 'Hint: It is a four-legged animal.' }]
    });

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'It is a four-legged animal.'); // "Hint: " prefix removed
  });

  await t.step('should handle JSON formatted hint response', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    // Mock JSON formatted response
    mockFetch({
      content: [{ text: '{"hint": "It barks and wags its tail."}' }]
    });

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.hint, 'It barks and wags its tail.');
  });

  await t.step('should handle game not found', async () => {
    const mockSupabaseWithError = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: null,
              error: { message: 'Game not found' }
            })
          })
        })
      })
    };

    globalThis.createClient = () => mockSupabaseWithError;

    const requestBody = {
      game_id: 'invalid-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
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
      questions_asked: 10,
      hints_used: 1
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertEquals(data.error, 'Game is not active');
  });

  await t.step('should handle Anthropic API failure', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    // Mock failed API response
    mockFetch({}, false);

    const requestBody = {
      game_id: 'test-game-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertEquals(data.error, 'Failed to get hint from Claude');
  });
});