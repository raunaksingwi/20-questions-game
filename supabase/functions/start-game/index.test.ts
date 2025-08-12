import { assertEquals, assertExists } from "@std/assert";

// Mock Supabase client
const createMockSupabase = (categoriesData: any[] = [], gameInsertData: any = null, gameInsertError: any = null) => ({
  from: (table: string) => {
    if (table === 'categories') {
      return {
        select: () => ({
          order: () => ({
            data: categoriesData,
            error: null
          })
        })
      };
    }
    if (table === 'games') {
      return {
        insert: () => ({
          select: () => ({
            single: () => ({
              data: gameInsertData,
              error: gameInsertError
            })
          })
        })
      };
    }
    return {};
  },
  // Mock auth for user_id tests
  auth: {
    getUser: () => Promise.resolve({ 
      data: { user: { id: 'test-user-id' } }, 
      error: null 
    })
  }
});

// Mock createClient function
const mockCreateClient = (supabaseInstance: any) => {
  globalThis.createClient = () => supabaseInstance;
};

// Mock environment variables
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('start-game function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step('should start a new game with specified category', async () => {
    const categoriesData = [
      { id: '1', name: 'Animals', sample_items: ['dog', 'cat', 'lion'] },
      { id: '2', name: 'Food', sample_items: ['pizza', 'apple', 'bread'] }
    ];
    
    const gameData = {
      id: 'new-game-id',
      secret_item: 'dog',
      category: 'Animals',
      questions_asked: 0,
      hints_used: 0,
      status: 'active'
    };

    mockCreateClient(createMockSupabase(categoriesData, gameData));

    const requestBody = {
      category: 'Animals',
      user_id: 'test-user-id'
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
    assertEquals(data.game_id, 'new-game-id');
    assertEquals(data.secret_item, 'dog');
    assertEquals(data.category, 'Animals');
    assertExists(data.message);
  });

  await t.step('should handle random category when invalid category provided', async () => {
    const categoriesData = [
      { id: '1', name: 'Animals', sample_items: ['dog', 'cat', 'lion'] },
      { id: '2', name: 'Food', sample_items: ['pizza', 'apple', 'bread'] }
    ];
    
    const gameData = {
      id: 'new-game-id',
      secret_item: 'pizza',
      category: 'Food',
      questions_asked: 0,
      hints_used: 0,
      status: 'active'
    };

    mockCreateClient(createMockSupabase(categoriesData, gameData));

    const requestBody = {
      category: 'InvalidCategory', // This should fallback to random
      user_id: 'test-user-id'
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
    assertEquals(data.game_id, 'new-game-id');
    // Should pick from available categories
    assertEquals(['Animals', 'Food'].includes(data.category), true);
  });

  await t.step('should handle Cricketers category correctly', async () => {
    const categoriesData = [
      { id: '1', name: 'Cricketers', sample_items: ['Virat Kohli', 'MS Dhoni', 'Sachin Tendulkar'] }
    ];
    
    const gameData = {
      id: 'new-game-id',
      secret_item: 'Virat Kohli',
      category: 'Cricketers',
      questions_asked: 0,
      hints_used: 0,
      status: 'active'
    };

    mockCreateClient(createMockSupabase(categoriesData, gameData));

    const requestBody = {
      category: 'Cricketers',
      user_id: 'test-user-id'
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
    assertEquals(data.category, 'Cricketers');
    assertEquals(['Virat Kohli', 'MS Dhoni', 'Sachin Tendulkar'].includes(data.secret_item), true);
  });

  await t.step('should work without user_id (anonymous)', async () => {
    const categoriesData = [
      { id: '1', name: 'Objects', sample_items: ['chair', 'book', 'phone'] }
    ];
    
    const gameData = {
      id: 'new-game-id',
      secret_item: 'chair',
      category: 'Objects',
      questions_asked: 0,
      hints_used: 0,
      status: 'active'
    };

    // Create mock without user
    const mockSupabaseNoUser = createMockSupabase(categoriesData, gameData);
    mockSupabaseNoUser.auth = {
      getUser: () => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      })
    };

    mockCreateClient(mockSupabaseNoUser);

    const requestBody = {
      category: 'Objects'
      // No user_id provided
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
    assertEquals(data.game_id, 'new-game-id');
    assertEquals(data.category, 'Objects');
  });

  await t.step('should handle database errors gracefully', async () => {
    const categoriesData = [
      { id: '1', name: 'Animals', sample_items: ['dog', 'cat'] }
    ];

    // Mock database insert error
    mockCreateClient(createMockSupabase(categoriesData, null, { message: 'Database insert failed' }));

    const requestBody = {
      category: 'Animals',
      user_id: 'test-user-id'
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

  await t.step('should set CORS headers correctly', async () => {
    const categoriesData = [
      { id: '1', name: 'Food', sample_items: ['apple', 'banana'] }
    ];
    
    const gameData = {
      id: 'new-game-id',
      secret_item: 'apple',
      category: 'Food',
      questions_asked: 0,
      hints_used: 0,
      status: 'active'
    };

    mockCreateClient(createMockSupabase(categoriesData, gameData));

    const requestBody = {
      category: 'Food'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
    assertEquals(response.headers.get('Content-Type'), 'application/json');
  });
});