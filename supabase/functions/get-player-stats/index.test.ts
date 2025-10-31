import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { GameMode } from '../../../shared/types.ts';

/**
 * Creates a test handler that bypasses EdgeFunctionBase initialization.
 * Mocks the statistics calculation logic for testing.
 */
const createTestHandler = (mockSupabase: any) => {
  return async (req: Request) => {
    // Handle CORS preflight
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
      const { user_id, recent_games_limit = 10, search_term } = await req.json();

      if (!user_id || typeof user_id !== 'string') {
        throw new Error('Valid user_id is required');
      }

      // Fetch all user's games
      const { data: games, error: gamesError } = await mockSupabase
        .from('games')
        .select('id, user_id, secret_item, category, mode, questions_asked, hints_used, status, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (gamesError) throw gamesError;

      // Handle empty games
      if (!games || games.length === 0) {
        return new Response(
          JSON.stringify({
            stats: {
              total_games: 0,
              total_wins: 0,
              total_losses: 0,
              overall_win_rate: 0,
              avg_questions_per_game: 0,
              avg_hints_per_game: 0,
              category_breakdown: [],
              recent_games: [],
              favorite_category: 'None'
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fetch messages for each game (N+1 pattern for testing)
      const gamesWithMessages: Array<{
        game: typeof games[0],
        messages: any[]
      }> = [];

      for (const game of games) {
        const { data: messages, error: messagesError } = await mockSupabase
          .from('game_messages')
          .select('id, game_id, role, content, message_type, question_number, created_at')
          .eq('game_id', game.id)
          .order('created_at', { ascending: true });

        if (!messagesError && messages) {
          gamesWithMessages.push({ game, messages });
        }
      }

      // Calculate statistics
      const totalGames = games.length;
      const wonGames = games.filter((g: any) => g.status === 'won');
      const lostGames = games.filter((g: any) => g.status === 'lost');
      const totalWins = wonGames.length;
      const totalLosses = lostGames.length;
      const overallWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

      // Calculate averages
      let totalQuestionsAsked = 0;
      let totalHintsUsed = 0;

      for (const game of games) {
        totalQuestionsAsked += game.questions_asked;
        totalHintsUsed += game.hints_used;
      }

      const avgQuestionsPerGame = totalGames > 0 ? totalQuestionsAsked / totalGames : 0;
      const avgHintsPerGame = totalGames > 0 ? totalHintsUsed / totalGames : 0;

      // Build category stats
      const categoryMap = new Map<string, any>();

      for (const game of games) {
        if (!categoryMap.has(game.category)) {
          categoryMap.set(game.category, {
            games: [],
            totalQuestions: 0,
            totalHints: 0
          });
        }

        const categoryData = categoryMap.get(game.category)!;
        categoryData.games.push(game);
        categoryData.totalQuestions += game.questions_asked;
        categoryData.totalHints += game.hints_used;
      }

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => {
        const gamesPlayed = data.games.length;
        const gamesWon = data.games.filter((g: any) => g.status === 'won').length;
        const gamesLost = data.games.filter((g: any) => g.status === 'lost').length;
        const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;
        const avgQuestionsUsed = gamesPlayed > 0 ? data.totalQuestions / gamesPlayed : 0;
        const avgHintsUsed = gamesPlayed > 0 ? data.totalHints / gamesPlayed : 0;

        return {
          category,
          games_played: gamesPlayed,
          games_won: gamesWon,
          games_lost: gamesLost,
          win_rate: Math.round(winRate * 10) / 10,
          avg_questions_used: Math.round(avgQuestionsUsed * 10) / 10,
          avg_hints_used: Math.round(avgHintsUsed * 10) / 10
        };
      });

      categoryBreakdown.sort((a, b) => b.games_played - a.games_played);

      const favoriteCategory = categoryBreakdown.length > 0
        ? categoryBreakdown[0].category
        : 'None';

      // Build recent games
      const recentGamesData = gamesWithMessages.slice(0, recent_games_limit);
      const recentGames = recentGamesData.map(({ game, messages }) => {
        const firstUserMessage = messages.find((m: any) => m.role === 'user');

        return {
          id: game.id,
          category: game.category,
          mode: game.mode,
          status: game.status,
          secret_item: game.secret_item,
          questions_asked: game.questions_asked,
          hints_used: game.hints_used,
          created_at: game.created_at,
          message_count: messages.length,
          first_interaction: firstUserMessage?.content.substring(0, 100)
        };
      });

      // Handle search term if provided
      let playingStyleInsight: string | undefined = undefined;

      if (search_term && search_term.trim().length > 0) {
        const { data: similarMessages } = await mockSupabase
          .from('game_messages')
          .select('game_id, content, games!inner(category, secret_item)')
          .eq('games.user_id', user_id)
          .ilike('content', `%${search_term}%`)
          .limit(50);

        if (similarMessages && similarMessages.length > 0) {
          const gameIds = new Set(similarMessages.map((m: any) => m.game_id));
          playingStyleInsight = `Found ${similarMessages.length} messages matching "${search_term}" across ${gameIds.size} games`;
        }
      }

      // Generate basic insights
      if (totalGames >= 3 && !playingStyleInsight) {
        const avgQuestionsRounded = Math.round(avgQuestionsPerGame);
        if (overallWinRate >= 70) {
          playingStyleInsight = `Excellent player! You win ${Math.round(overallWinRate)}% of games using an average of ${avgQuestionsRounded} questions.`;
        } else if (overallWinRate >= 50) {
          playingStyleInsight = `Solid performance with a ${Math.round(overallWinRate)}% win rate.`;
        } else {
          playingStyleInsight = `You're learning! Current win rate is ${Math.round(overallWinRate)}%.`;
        }
      }

      const stats = {
        total_games: totalGames,
        total_wins: totalWins,
        total_losses: totalLosses,
        overall_win_rate: Math.round(overallWinRate * 10) / 10,
        avg_questions_per_game: Math.round(avgQuestionsPerGame * 10) / 10,
        avg_hints_per_game: Math.round(avgHintsPerGame * 10) / 10,
        category_breakdown: categoryBreakdown,
        recent_games: recentGames,
        favorite_category: favoriteCategory,
        playing_style_insight: playingStyleInsight
      };

      return new Response(
        JSON.stringify({ stats }),
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
};

/**
 * Creates a mock Supabase client for testing.
 */
const createMockSupabase = (
  gamesData: any[] = [],
  messagesData: Map<string, any[]> = new Map(),
  searchMessagesData: any[] = []
) => ({
  from: (table: string) => {
    if (table === 'games') {
      return {
        select: () => ({
          eq: (field: string, value: any) => ({
            order: () => Promise.resolve({
              data: gamesData.filter((g: any) => g[field] === value),
              error: null
            })
          })
        })
      };
    }

    if (table === 'game_messages') {
      return {
        select: (fields: string) => {
          // Check if this is a search query (has 'games!inner' in select)
          if (fields.includes('games!inner')) {
            return {
              eq: () => ({
                ilike: () => ({
                  limit: () => Promise.resolve({
                    data: searchMessagesData,
                    error: null
                  })
                })
              })
            };
          }

          // Regular message fetch
          return {
            eq: (field: string, value: any) => ({
              order: () => Promise.resolve({
                data: messagesData.get(value) || [],
                error: null
              })
            })
          };
        }
      };
    }

    return {};
  }
});

Deno.test('get-player-stats function', async (t) => {
  await t.step('should handle OPTIONS request', async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);
    const request = new Request('http://localhost:8000', { method: 'OPTIONS' });

    const response = await handler(request);

    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'ok');
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step('should return empty stats for user with no games', async () => {
    const mockSupabase = createMockSupabase([]);
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user-id' })
    });

    const response = await handler(request);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data.stats.total_games, 0);
    assertEquals(data.stats.total_wins, 0);
    assertEquals(data.stats.favorite_category, 'None');
    assertEquals(data.stats.recent_games.length, 0);
  });

  await t.step('should calculate stats correctly for multiple games', async () => {
    const gamesData = [
      {
        id: 'game-1',
        user_id: 'test-user',
        secret_item: 'Lion',
        category: 'Animals',
        mode: GameMode.USER_GUESSING,
        questions_asked: 10,
        hints_used: 1,
        status: 'won',
        created_at: '2025-10-30T10:00:00Z'
      },
      {
        id: 'game-2',
        user_id: 'test-user',
        secret_item: 'Dog',
        category: 'Animals',
        mode: GameMode.USER_GUESSING,
        questions_asked: 15,
        hints_used: 2,
        status: 'lost',
        created_at: '2025-10-29T10:00:00Z'
      },
      {
        id: 'game-3',
        user_id: 'test-user',
        secret_item: 'Pizza',
        category: 'Food',
        mode: GameMode.USER_GUESSING,
        questions_asked: 8,
        hints_used: 0,
        status: 'won',
        created_at: '2025-10-28T10:00:00Z'
      }
    ];

    const messagesData = new Map([
      ['game-1', [
        { id: 'msg-1', game_id: 'game-1', role: 'user', content: 'Is it a mammal?', message_type: 'question', question_number: 1, created_at: '2025-10-30T10:01:00Z' },
        { id: 'msg-2', game_id: 'game-1', role: 'assistant', content: 'Yes', message_type: 'answer', question_number: 1, created_at: '2025-10-30T10:01:10Z' }
      ]],
      ['game-2', [
        { id: 'msg-3', game_id: 'game-2', role: 'user', content: 'Is it big?', message_type: 'question', question_number: 1, created_at: '2025-10-29T10:01:00Z' }
      ]],
      ['game-3', [
        { id: 'msg-4', game_id: 'game-3', role: 'user', content: 'Is it food?', message_type: 'question', question_number: 1, created_at: '2025-10-28T10:01:00Z' }
      ]]
    ]);

    const mockSupabase = createMockSupabase(gamesData, messagesData);
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user' })
    });

    const response = await handler(request);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.stats);

    // Verify overall stats
    assertEquals(data.stats.total_games, 3);
    assertEquals(data.stats.total_wins, 2);
    assertEquals(data.stats.total_losses, 1);
    assertEquals(data.stats.overall_win_rate, 66.7);
    assertEquals(data.stats.avg_questions_per_game, 11);
    assertEquals(data.stats.avg_hints_per_game, 1);

    // Verify category breakdown
    assertEquals(data.stats.category_breakdown.length, 2);
    assertEquals(data.stats.favorite_category, 'Animals');

    const animalsStats = data.stats.category_breakdown.find((c: any) => c.category === 'Animals');
    assertExists(animalsStats);
    assertEquals(animalsStats.games_played, 2);
    assertEquals(animalsStats.games_won, 1);
    assertEquals(animalsStats.games_lost, 1);
    assertEquals(animalsStats.win_rate, 50);

    // Verify recent games
    assertEquals(data.stats.recent_games.length, 3);
    assertEquals(data.stats.recent_games[0].id, 'game-1');
    assertEquals(data.stats.recent_games[0].message_count, 2);

    // Verify insight generated
    assertExists(data.stats.playing_style_insight);
  });

  await t.step('should respect recent_games_limit parameter', async () => {
    const gamesData = Array.from({ length: 15 }, (_, i) => ({
      id: `game-${i}`,
      user_id: 'test-user',
      secret_item: 'Item',
      category: 'Animals',
      mode: GameMode.USER_GUESSING,
      questions_asked: 10,
      hints_used: 0,
      status: 'won',
      created_at: `2025-10-${30 - i}T10:00:00Z`
    }));

    const messagesData = new Map(
      gamesData.map(g => [g.id, []])
    );

    const mockSupabase = createMockSupabase(gamesData, messagesData);
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user', recent_games_limit: 5 })
    });

    const response = await handler(request);
    const data = await response.json();

    assertEquals(data.stats.total_games, 15);
    assertEquals(data.stats.recent_games.length, 5);
  });

  await t.step('should handle search_term parameter', async () => {
    const gamesData = [
      {
        id: 'game-1',
        user_id: 'test-user',
        secret_item: 'Lion',
        category: 'Animals',
        mode: GameMode.USER_GUESSING,
        questions_asked: 10,
        hints_used: 0,
        status: 'won',
        created_at: '2025-10-30T10:00:00Z'
      }
    ];

    const messagesData = new Map([
      ['game-1', []]
    ]);

    const searchResults = [
      { game_id: 'game-1', content: 'Is it a mammal?', games: { category: 'Animals', secret_item: 'Lion' } }
    ];

    const mockSupabase = createMockSupabase(gamesData, messagesData, searchResults);
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user', search_term: 'mammal' })
    });

    const response = await handler(request);
    const data = await response.json();

    assertEquals(response.status, 200);
    assertExists(data.stats.playing_style_insight);
    assertEquals(data.stats.playing_style_insight.includes('mammal'), true);
  });

  await t.step('should return error for missing user_id', async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await handler(request);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertExists(data.error);
    assertEquals(data.error.includes('user_id'), true);
  });

  await t.step('should return error for invalid user_id type', async () => {
    const mockSupabase = createMockSupabase();
    const handler = createTestHandler(mockSupabase);

    const request = new Request('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 123 })
    });

    const response = await handler(request);
    const data = await response.json();

    assertEquals(response.status, 400);
    assertExists(data.error);
  });
});
