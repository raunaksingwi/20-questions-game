import { assertEquals, assertExists } from "@std/assert";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Mock Supabase client
const mockSupabase = {
  from: (table: string) => ({
    select: (fields?: string) => ({
      data: table === 'categories' ? [
        { name: 'Animals', sample_items: ['dog', 'cat', 'elephant'] },
        { name: 'Food', sample_items: ['pizza', 'burger', 'pasta'] },
        { name: 'Random', sample_items: [] }
      ] : null,
      error: null
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => ({
          data: { id: 'test-game-id', ...data },
          error: null
        })
      })
    })
  })
};

// Mock the createClient function
const createClient = () => mockSupabase;

// Mock environment variables
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('start-game function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });
    
    // Import the handler
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step('should start a new game with specified category', async () => {
    const requestBody = {
      category: 'Animals',
      user_id: 'test-user-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Mock the createClient to return our mock
    globalThis.createClient = createClient;
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertExists(data.game_id);
    assertEquals(data.category, 'Animals');
    assertEquals(typeof data.message, 'string');
    assertEquals(data.message.includes('Animals'), true);
  });

  await t.step('should handle random category when invalid category provided', async () => {
    const requestBody = {
      category: 'InvalidCategory',
      user_id: 'test-user-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    globalThis.createClient = createClient;
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertExists(data.game_id);
    // Should select a valid category
    assertEquals(['Animals', 'Food', 'Random'].includes(data.category), true);
  });

  await t.step('should handle Random category correctly', async () => {
    const requestBody = {
      category: 'Random',
      user_id: 'test-user-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    globalThis.createClient = createClient;
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertExists(data.game_id);
    assertEquals(data.category, 'Random');
  });

  await t.step('should work without user_id (anonymous)', async () => {
    const requestBody = {
      category: 'Food'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    globalThis.createClient = createClient;
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertExists(data.game_id);
    assertEquals(data.category, 'Food');
  });

  await t.step('should handle database errors gracefully', async () => {
    const requestBody = {
      category: 'Animals',
      user_id: 'test-user-id'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Mock database error
    const mockSupabaseWithError = {
      from: () => ({
        select: () => ({
          data: null,
          error: { message: 'Database connection failed' }
        })
      })
    };
    
    globalThis.createClient = () => mockSupabaseWithError;
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertExists(data.error);
    assertEquals(typeof data.error, 'string');
  });

  await t.step('should set CORS headers correctly', async () => {
    const requestBody = {
      category: 'Animals'
    };
    
    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    globalThis.createClient = createClient;
    
    const { default: handler } = await import('./index.ts');
    const response = await handler(request);
    
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
    assertEquals(response.headers.get('Content-Type'), 'application/json');
    assertEquals(response.headers.has('Access-Control-Allow-Headers'), true);
  });
});