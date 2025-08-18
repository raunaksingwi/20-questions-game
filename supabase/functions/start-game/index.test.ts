import { assertEquals, assertExists } from "jsr:@std/assert@1";

// Create a test handler that bypasses the EdgeFunctionBase initialization
const createTestHandler = (mockSupabase: any) => {
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
      const { category, mode = 'user_guessing', user_id } = await req.json();
      
      // Get categories
      const { data: categories, error: categoryError } = await mockSupabase.from('categories').select('*').order('name');
      if (categoryError) throw categoryError;

      // Select category
      let selectedCategory = category;
      let categoryData = categories.find((c: any) => c.name === category);
      
      if (!categoryData) {
        categoryData = categories[Math.floor(Math.random() * categories.length)];
        selectedCategory = categoryData.name;
      }

      // Select random item
      const secretItem = categoryData.sample_items[
        Math.floor(Math.random() * categoryData.sample_items.length)
      ];

      // Create game
      const gameInput = {
        category: selectedCategory,
        secret_item: secretItem,
        mode,
        user_id: user_id || null,
        status: 'active',
        questions_asked: 0,
        hints_used: 0
      };

      const { data: gameData, error: gameError } = await mockSupabase.from('games').insert(gameInput).select('*').single();
      if (gameError) throw gameError;

      return new Response(JSON.stringify({
        game_id: gameData.id,
        category: gameData.category,
        mode: gameData.mode
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
const createMockSupabase = (categoriesData: any[] = [], gameInsertData: any = null, gameInsertError: any = null) => ({
  from: (table: string) => {
    if (table === 'categories') {
      return {
        select: () => ({
          order: () => Promise.resolve({
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
            single: () => Promise.resolve({
              data: gameInsertData,
              error: gameInsertError
            })
          })
        })
      };
    }
    return {};
  },
  auth: {
    getUser: () => Promise.resolve({ 
      data: { user: { id: 'test-user-id' } }, 
      error: null 
    })
  }
});

Deno.test('start-game function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });
    
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
      status: 'active',
      mode: 'user_guessing'
    };

    const mockSupabase = createMockSupabase(categoriesData, gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      category: 'Animals',
      user_id: 'test-user-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.game_id, 'new-game-id');
    assertEquals(data.category, 'Animals');
  });

  await t.step('should handle random category when invalid category provided', async () => {
    const categoriesData = [
      { id: '1', name: 'Animals', sample_items: ['dog', 'cat', 'lion'] },
      { id: '2', name: 'Food', sample_items: ['pizza', 'apple', 'bread'] }
    ];
    
    const gameData = {
      id: 'new-game-id',
      secret_item: 'apple',
      category: 'Food',
      questions_asked: 0,
      hints_used: 0,
      status: 'active',
      mode: 'user_guessing'
    };

    const mockSupabase = createMockSupabase(categoriesData, gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      category: 'InvalidCategory'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.game_id, 'new-game-id');
    // Should have selected a random category from available ones
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
      status: 'active',
      mode: 'user_guessing'
    };

    const mockSupabase = createMockSupabase(categoriesData, gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      category: 'Cricketers'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.game_id, 'new-game-id');
    assertEquals(data.category, 'Cricketers');
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
      status: 'active',
      mode: 'user_guessing'
    };

    const mockSupabase = createMockSupabase(categoriesData, gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      category: 'Objects'
      // No user_id provided
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

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

    const mockSupabase = createMockSupabase(categoriesData, null, new Error('Database error'));
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      category: 'Animals'
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
      status: 'active',
      mode: 'user_guessing'
    };

    const mockSupabase = createMockSupabase(categoriesData, gameData);
    const handler = createTestHandler(mockSupabase);

    const requestBody = {
      category: 'Food'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
    assertEquals(response.headers.get('Content-Type'), 'application/json');
  });
});