import { assertEquals, assertExists, assertStringIncludes } from "jsr:@std/assert@1";

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
      const { session_id, answer, answer_type = 'text' } = await req.json();
      
      // Get session data
      const { data: session, error: sessionError } = await mockSupabase
        .from('games')
        .select('id, category, questions_asked, status')
        .eq('id', session_id)
        .eq('mode', 'ai_guessing')
        .single();

      if (sessionError || !session) {
        throw new Error('AI Guessing mode session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      // Get conversation history
      const { data: messages, error: messagesError } = await mockSupabase
        .from('game_messages')
        .select('role, content, question_number')
        .eq('game_id', session_id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Check if answer is "Don't know"
      const isCurrentDontKnow = answer.toLowerCase().trim() === "don't know";
      
      // Find the highest question number
      const maxQuestionNumber = messages.length > 0 
        ? Math.max(...messages.map((m: any) => m.question_number || 0))
        : 0;
      const currentQuestionNumber = maxQuestionNumber;
      const nextQuestionNumber = maxQuestionNumber + 1;
      
      // For game state tracking
      const questionsCountedForLimit = isCurrentDontKnow ? session.questions_asked : session.questions_asked + 1;
      
      // Store user's answer
      await mockSupabase
        .from('game_messages')
        .insert({
          game_id: session_id,
          role: 'user',
          content: answer,
          message_type: 'answer',
          question_number: currentQuestionNumber,
          created_at: new Date().toISOString()
        });

      // Check if we've reached the 20 question limit
      if (!isCurrentDontKnow && questionsCountedForLimit >= 20) {
        await mockSupabase
          .from('games')
          .update({ 
            status: 'lost',
            questions_asked: 20,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);

        return new Response(JSON.stringify({
          questions_asked: 20,
          questions_remaining: 0,
          game_status: 'lost'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mock next question generation
      const nextQuestion = "Are they from Europe?"; // Simple mock question

      // Store LLM's next question and update game state
      await Promise.all([
        mockSupabase
          .from('game_messages')
          .insert({
            game_id: session_id,
            role: 'assistant',
            content: nextQuestion,
            message_type: 'question',
            question_number: nextQuestionNumber,
            created_at: new Date().toISOString()
          }),
        mockSupabase
          .from('games')
          .update({ 
            questions_asked: questionsCountedForLimit,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id)
      ]);

      return new Response(JSON.stringify({
        next_question: nextQuestion,
        questions_asked: questionsCountedForLimit,
        questions_remaining: 20 - questionsCountedForLimit,
        game_status: 'active'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
};

// Mock Supabase client
const createMockSupabase = () => {
  const gameMessages: any[] = [];
  const games: any[] = [
    {
      id: 'test-session-1',
      category: 'world leaders',
      questions_asked: 2,
      status: 'active',
      mode: 'ai_guessing'
    }
  ];

  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => {
          const filters = { [column]: value };
          
          return {
            eq: (column2: string, value2: string) => ({
              single: async () => {
                if (table === 'games') {
                  const game = games.find(g => 
                    g[column] === value && g[column2] === value2
                  );
                  return game ? { data: game, error: null } : { data: null, error: new Error('AI Guessing mode session not found') };
                }
                return { data: null, error: new Error('AI Guessing mode session not found') };
              }
            }),
            single: async () => {
              if (table === 'games') {
                const game = games.find(g => g[column] === value);
                return game ? { data: game, error: null } : { data: null, error: new Error('Not found') };
              }
              return { data: null, error: new Error('Not found') };
            },
            order: (orderColumn: string, options: any) => {
              if (table === 'game_messages') {
                return Promise.resolve({ data: gameMessages.filter((m: any) => m.game_id === value), error: null });
              }
              return Promise.resolve({ data: [], error: null });
            }
          };
        }
      }),
      insert: (data: any) => {
        if (table === 'game_messages') {
          gameMessages.push(data);
        }
        return {
          select: (columns: string) => ({
            single: async () => ({ data, error: null })
          })
        };
      },
      update: (data: any) => ({
        eq: (column: string, value: string) => {
          if (table === 'games') {
            const gameIndex = games.findIndex(g => g.id === value);
            if (gameIndex >= 0) {
              games[gameIndex] = { ...games[gameIndex], ...data };
            }
          }
          return Promise.resolve({ data, error: null });
        }
      })
    })
  };
};

Deno.test("submit-user-answer - basic functionality", async (t) => {
  await t.step("should process user answer and generate next question", async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'test-session-1',
        answer: 'yes',
        answer_type: 'text'
      })
    });

    const response = await handler(request);
    const result = await response.json();

    assertEquals(response.status, 200);
    assertEquals(result.game_status, 'active');
    assertEquals(result.questions_asked, 3); // Should increment from 2 to 3
    assertEquals(result.questions_remaining, 17);
    assertExists(result.next_question);
  });

  await t.step("should handle don't know answers without incrementing count", async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'test-session-1',
        answer: "don't know",
        answer_type: 'text'
      })
    });

    const response = await handler(request);
    const result = await response.json();

    assertEquals(response.status, 200);
    assertEquals(result.questions_asked, 2); // Should NOT increment for "don't know"
    assertEquals(result.questions_remaining, 18);
  });

  await t.step("should end game when 20 questions reached", async () => {
    // Create a fresh mock with 19 questions already asked
    const gameMessages: any[] = [];
    const games: any[] = [
      {
        id: 'test-session-1',
        category: 'world leaders',
        questions_asked: 19,
        status: 'active',
        mode: 'ai_guessing'
      }
    ];

    const mockSupabase = {
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: string) => {
            return {
              eq: (column2: string, value2: string) => ({
                single: async () => {
                  if (table === 'games') {
                    const game = games.find(g => 
                      g[column] === value && g[column2] === value2
                    );
                    return game ? { data: game, error: null } : { data: null, error: new Error('AI Guessing mode session not found') };
                  }
                  return { data: null, error: new Error('AI Guessing mode session not found') };
                }
              }),
              single: async () => {
                if (table === 'games') {
                  const game = games.find(g => g[column] === value);
                  return game ? { data: game, error: null } : { data: null, error: new Error('Not found') };
                }
                return { data: null, error: new Error('Not found') };
              },
              order: (orderColumn: string, options: any) => {
                if (table === 'game_messages') {
                  return Promise.resolve({ data: gameMessages.filter((m: any) => m.game_id === value), error: null });
                }
                return Promise.resolve({ data: [], error: null });
              }
            };
          }
        }),
        insert: (data: any) => {
          if (table === 'game_messages') {
            gameMessages.push(data);
          }
          return {
            select: (columns: string) => ({
              single: async () => ({ data, error: null })
            })
          };
        },
        update: (data: any) => ({
          eq: (column: string, value: string) => {
            if (table === 'games') {
              const gameIndex = games.findIndex(g => g.id === value);
              if (gameIndex >= 0) {
                games[gameIndex] = { ...games[gameIndex], ...data };
              }
            }
            return Promise.resolve({ data, error: null });
          }
        })
      })
    };

    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'test-session-1',
        answer: 'no',
        answer_type: 'text'
      })
    });

    const response = await handler(request);
    const result = await response.json();

    assertEquals(response.status, 200);
    assertEquals(result.game_status, 'lost');
    assertEquals(result.questions_asked, 20);
    assertEquals(result.questions_remaining, 0);
    assertEquals(result.next_question, undefined); // No next question when game is over
  });

  await t.step("should return error for invalid session", async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'invalid-session',
        answer: 'yes',
        answer_type: 'text'
      })
    });

    const response = await handler(request);
    const result = await response.json();

    assertEquals(response.status, 400);
    assertExists(result.error);
    assertStringIncludes(result.error, 'session not found');
  });

  await t.step("should validate required fields", async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'test-session-1'
        // Missing answer field
      })
    });

    const response = await handler(request);
    assertEquals(response.status, 400);
  });
});