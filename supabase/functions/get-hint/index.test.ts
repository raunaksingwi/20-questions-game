import { assertEquals, assertExists } from "@std/assert";

// Mock Supabase client that supports our optimized combined queries
const createMockSupabase = (gameData: any, messagesData: any[] = []) => ({
  from: (table: string) => {
    if (table === 'games') {
      return {
        select: (columns?: string) => ({
          eq: () => ({
            order: () => ({
              single: () => ({
                // Return combined data structure for optimized queries
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
          eq: () => ({
            error: null
          })
        })
      };
    }
    if (table === 'game_messages') {
      return {
        insert: () => ({
          error: null
        })
      };
    }
    return {};
  }
});

// Mock createClient function
const mockCreateClient = (supabaseInstance: any) => {
  globalThis.createClient = () => supabaseInstance;
};

// Mock fetch for LLM API calls
const mockFetch = (response: any, ok = true) => {
  globalThis.fetch = async () => ({
    ok,
    json: async () => response,
    status: ok ? 200 : 400,
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Bad Request',
    type: 'basic',
    url: '',
    body: null,
    bodyUsed: false,
    clone: () => ({}) as Response,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(response)
  } as Response);
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
      { role: 'user', content: 'Is it alive?', created_at: '2024-01-01T00:01:00Z', message_type: 'question' },
      { role: 'assistant', content: 'Yes', created_at: '2024-01-01T00:02:00Z', message_type: 'answer' }
    ];

    mockCreateClient(createMockSupabase(gameData, messagesData));

    // Mock LLM response
    mockFetch({
      content: [{ text: 'It is a domestic animal that people keep as pets.' }]
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
    assertEquals(data.hint, 'It is a domestic animal that people keep as pets.');
    assertEquals(data.hints_remaining, 2); // 3 - 1 used
    assertEquals(data.questions_remaining, 19); // 20 - 1 (hint costs a question)
    assertEquals(data.game_status, 'active');
  });

  await t.step('should handle maximum hints reached', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 10,
      hints_used: 3 // Maximum reached
    };

    mockCreateClient(createMockSupabase(gameData, []));

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
      questions_asked: 19, // Last question
      hints_used: 0
    };

    mockCreateClient(createMockSupabase(gameData, []));

    // Mock LLM response
    mockFetch({
      content: [{ text: 'It is a feline creature.' }]
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
    assertEquals(data.hint.includes('It is a feline creature.'), true);
    assertEquals(data.hint.includes('Game over!'), true);
    assertEquals(data.hint.includes('cat'), true);
    assertEquals(data.questions_remaining, 0);
    assertEquals(data.game_status, 'lost');
  });

  await t.step('should provide progressive hints based on question count', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'elephant',
      status: 'active',
      questions_asked: 15, // Late game
      hints_used: 1
    };

    mockCreateClient(createMockSupabase(gameData, []));

    // Mock LLM response for late game hint
    mockFetch({
      content: [{ text: 'It has a trunk and large ears.' }]
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
    assertEquals(data.hint, 'It has a trunk and large ears.');
    assertEquals(data.hints_remaining, 1); // 3 - 2 used
    assertEquals(data.questions_remaining, 4); // 20 - 16
    assertEquals(data.game_status, 'active');
  });

  await t.step('should clean up hint text formatting', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'piano',
      status: 'active',
      questions_asked: 8,
      hints_used: 0
    };

    mockCreateClient(createMockSupabase(gameData, []));

    // Mock LLM response with JSON formatting that should be cleaned
    mockFetch({
      content: [{ text: '{"hint": "It is a musical instrument with black and white keys."}' }]
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
    // Should clean up the JSON wrapper
    assertEquals(data.hint, 'It is a musical instrument with black and white keys.');
  });

  await t.step('should handle JSON formatted hint response', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'guitar',
      status: 'active',
      questions_asked: 12,
      hints_used: 2
    };

    mockCreateClient(createMockSupabase(gameData, []));

    // Mock properly formatted JSON response
    mockFetch({
      content: [{ text: 'It has strings and is played with fingers or a pick.' }]
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
    assertEquals(data.hint, 'It has strings and is played with fingers or a pick.');
    assertEquals(data.hints_remaining, 0); // 3 - 3 used
  });

  await t.step('should handle game not found', async () => {
    const mockSupabaseWithError = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              single: () => ({
                data: null,
                error: { message: 'Game not found' }
              })
            })
          })
        })
      })
    };

    mockCreateClient(mockSupabaseWithError);

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

    mockCreateClient(createMockSupabase(gameData, []));

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

  await t.step('should handle LLM API failure', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5,
      hints_used: 0
    };

    mockCreateClient(createMockSupabase(gameData, []));

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
    assertExists(data.error);
  });
});