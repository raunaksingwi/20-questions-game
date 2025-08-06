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

Deno.test('ask-question function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step('should process a question successfully', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5
    };

    const messagesData = [
      { role: 'system', content: 'System prompt...', created_at: '2024-01-01T00:00:00Z' },
      { role: 'user', content: 'Is it alive?', created_at: '2024-01-01T00:01:00Z' },
      { role: 'assistant', content: 'Yes', created_at: '2024-01-01T00:02:00Z' }
    ];

    globalThis.createClient = () => createMockSupabase(gameData, messagesData);

    // Mock Anthropic response
    mockFetch({
      content: [{ text: '{"answer": "Yes", "is_guess": false, "game_over": false}' }]
    });

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Does it have fur?'
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
    assertEquals(data.answer, 'Yes');
    assertEquals(data.questions_remaining, 14); // 20 - 6 (after this question)
    assertEquals(data.game_status, 'active');
  });

  await t.step('should handle winning guess correctly', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 10
    };

    const messagesData = [
      { role: 'system', content: 'System prompt...', created_at: '2024-01-01T00:00:00Z' }
    ];

    globalThis.createClient = () => createMockSupabase(gameData, messagesData);

    // Mock winning response from Anthropic
    mockFetch({
      content: [{ text: '{"answer": "Yes", "is_guess": true, "game_over": true}' }]
    });

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Is it a dog?'
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
    assertEquals(data.answer.includes('You got it!'), true);
    assertEquals(data.answer.includes('dog'), true);
    assertEquals(data.game_status, 'won');
  });

  await t.step('should handle game over when 20 questions reached', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'cat',
      status: 'active',
      questions_asked: 20
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Is it a mouse?'
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
    assertEquals(data.answer.includes('Game over!'), true);
    assertEquals(data.answer.includes('cat'), true);
    assertEquals(data.questions_remaining, 0);
    assertEquals(data.game_status, 'lost');
  });

  await t.step('should handle incorrect guess', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 15
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    // Mock incorrect guess response
    mockFetch({
      content: [{ text: '{"answer": "No", "is_guess": true, "game_over": false}' }]
    });

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Is it a cat?'
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
    assertEquals(data.answer, 'No');
    assertEquals(data.questions_remaining, 4); // 20 - 16
    assertEquals(data.game_status, 'active');
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
      game_id: 'invalid-game-id',
      question: 'Is it alive?'
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
      questions_asked: 10
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Is it alive?'
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
      questions_asked: 5
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    // Mock failed API response
    mockFetch({}, false);

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Is it alive?'
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
    assertEquals(data.error, 'Failed to get response from Claude');
  });

  await t.step('should handle malformed LLM response', async () => {
    const gameData = {
      id: 'test-game-id',
      secret_item: 'dog',
      status: 'active',
      questions_asked: 5
    };

    globalThis.createClient = () => createMockSupabase(gameData, []);

    // Mock malformed response (no JSON)
    mockFetch({
      content: [{ text: 'Yes, it is alive.' }]
    });

    const requestBody = {
      game_id: 'test-game-id',
      question: 'Is it alive?'
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
    assertEquals(data.answer, 'Yes, it is alive.');
    assertEquals(data.game_status, 'active');
  });
});